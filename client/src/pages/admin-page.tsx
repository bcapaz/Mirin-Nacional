import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { User } from "@shared/schema";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // Redirecionar se não for admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate("/");
    } else if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);
  
  const { data: allUsers, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });
  
  const downloadCredentials = () => {
    if (!allUsers) return;
    
    // Criar um arquivo CSV com as credenciais dos usuários
    const csvContent = "Nome Completo,Nome de Delegação,Senha\n" +
      allUsers.map(u => `"${u.name}","${u.username}","Senha definida pelo usuário"`).join("\n");
    
    // Criar um link para download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delegacoes_credenciais.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h1>
            <p className="text-muted-foreground mb-4">Esta página é apenas para administradores.</p>
            <Button asChild>
              <Link href="/">Voltar para Página Inicial</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-1 md:ml-64">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <header className="mb-6">
            <div className="flex items-center mb-4">
              <Link href="/" className="mr-4">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-foreground">Painel de Administração</h1>
            </div>
            <p className="text-muted-foreground">
              Gerencie usuários, tweets e configurações da plataforma.
            </p>
          </header>
          
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="users">Delegações</TabsTrigger>
              <TabsTrigger value="export">Exportar Dados</TabsTrigger>
            </TabsList>
            
            <TabsContent value="users">
              <div className="bg-card rounded-lg shadow-sm border border-border">
                <div className="p-4 border-b border-border">
                  <h2 className="text-lg font-medium">Delegações Registradas</h2>
                  <p className="text-sm text-muted-foreground">
                    Lista de todas as delegações registradas na plataforma.
                  </p>
                </div>
                
                {isLoadingUsers ? (
                  <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Nome de Delegação</TableHead>
                          <TableHead>Nome Completo</TableHead>
                          <TableHead>Administrador</TableHead>
                          <TableHead>Data de Registro</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers?.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <UserAvatar user={user} size="sm" />
                            </TableCell>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>
                              {user.isAdmin ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                  Usuário
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/profile/${user.username}`}>Ver Perfil</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="export">
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-lg font-medium mb-4">Exportar Dados</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Baixe um arquivo CSV com as credenciais de todas as delegações para referência.
                </p>
                
                <Button 
                  variant="outline" 
                  onClick={downloadCredentials}
                  disabled={!allUsers || allUsers.length === 0}
                >
                  Baixar Lista de Delegações
                </Button>
                
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="text-amber-800 font-medium mb-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Aviso de Privacidade
                  </h3>
                  <p className="text-sm text-amber-700">
                    Todos os dados exportados são confidenciais. Não compartilhe as credenciais com pessoas não autorizadas.
                    As senhas dos usuários são armazenadas de forma segura e não podem ser visualizadas mesmo por administradores.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}