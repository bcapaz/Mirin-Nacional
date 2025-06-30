import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { User } from "@shared/schema";
import { Loader2, ArrowLeft, AlertTriangle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // [ADICIONADO] Import do Input
import { Label } from "@/components/ui/label"; // [ADICIONADO] Import do Label
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // [MODIFICADO] Estados para controlar o pop-up de redefinição de senha
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [userToReset, setUserToReset] = useState<User | null>(null);

  useEffect(() => {
    if (user === null) navigate("/auth");
    else if (user && !user.isAdmin) navigate("/");
  }, [user, navigate]);

  const { data: allUsers, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });
  
  // [MODIFICADO] Mutation agora envia a nova senha no corpo do pedido
  const resetPasswordMutation = useMutation({
    mutationFn: (variables: { userId: number; newPass: string }) => 
      apiRequest("POST", `/api/admin/users/${variables.userId}/reset-password`, { newPassword: variables.newPass }),
    onSuccess: () => {
      toast({
        title: "Senha Redefinida!",
        description: `A senha para ${userToReset?.username} foi alterada com sucesso.`,
      });
      // Fecha o pop-up e limpa os estados
      setIsResetDialogOpen(false);
      setNewPassword("");
      setUserToReset(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleOpenResetDialog = (userToReset: User) => {
    setUserToReset(userToReset);
    setIsResetDialogOpen(true);
  };

  const handleConfirmReset = () => {
    if (!userToReset || !newPassword.trim()) {
        toast({ title: "Campo vazio", description: "Por favor, digite uma nova senha.", variant: "destructive" });
        return;
    }
    resetPasswordMutation.mutate({ userId: userToReset.id, newPass: newPassword });
  };
  
  const downloadCredentials = () => {
    // ...código original sem alterações...
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
            {/* ...cabeçalho da página (sem alterações)... */}
            
            <Tabs defaultValue="users" className="w-full">
              {/* ...Tabs e conteúdo da tabela (sem alterações)... */}
              <TableBody>
                {allUsers?.map((user) => (
                  <TableRow key={user.id}>
                    {/* ...células da tabela (sem alterações)... */}
                    <TableCell className="text-right">
                      {/* [MODIFICADO] O botão agora abre o pop-up */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenResetDialog(user)}
                        disabled={resetPasswordMutation.isPending && userToReset?.id === user.id}
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Redefinir Senha
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Tabs>
          </div>
        </div>
      </div>

      {/* [ADICIONADO] Pop-up (Dialog) para inserir a nova senha */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Digite a nova senha para o utilizador <strong>{userToReset?.username}</strong>. A ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPassword" >
                Nova Senha
              </Label>
              <Input
                id="newPassword"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
                placeholder="Digite a nova senha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmReset} disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}