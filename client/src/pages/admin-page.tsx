import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { User } from "@shared/schema";
import { Loader2, ArrowLeft, AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  useEffect(() => {
    if (user === null) {
      navigate("/auth");
    } else if (user && !user.isAdmin) {
      navigate("/");
    }
  }, [user, navigate]);

  const { data: allUsers, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });
  
  // [ADICIONADO] Mutation para redefinir a senha
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("POST", `/api/admin/users/${userId}/reset-password`),
    onSuccess: (data: { newPassword?: string }, variables) => {
      const userToReset = allUsers?.find(u => u.id === variables);
      setResettingUser(userToReset || null);
      setNewPassword(data.newPassword || "N/A");
      setShowPasswordDialog(true);
      toast({
        title: "Senha Redefinida!",
        description: `A senha para ${userToReset?.username} foi alterada.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleResetPassword = (userId: number) => {
    if (confirm("Tem a certeza que quer redefinir a senha para este utilizador? A ação não pode ser desfeita.")) {
      resetPasswordMutation.mutate(userId);
    }
  };
  
  const downloadCredentials = () => {
    if (!allUsers) return;
    const csvContent = "Nome Completo,Nome de Delegação,Senha\n" + allUsers.map(u => `"${u.name}","${u.username}","Senha definida pelo usuário"`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <>
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
                                {/* [ADICIONADO] Botão para redefinir a senha */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResetPassword(user.id)}
                                  disabled={resetPasswordMutation.isPending && resettingUser?.id === user.id}
                                >
                                  <KeyRound className="h-4 w-4 mr-2" />
                                  Redefinir Senha
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
                {/* ... seu código para exportar dados ... */}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* [ADICIONADO] Pop-up para exibir a nova senha */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Senha Redefinida com Sucesso!</AlertDialogTitle>
            <AlertDialogDescription>
              A nova senha temporária para <strong>{resettingUser?.username}</strong> é:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-4 bg-muted rounded-md text-center font-mono text-lg tracking-widest">
            {newPassword}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowPasswordDialog(false)}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}