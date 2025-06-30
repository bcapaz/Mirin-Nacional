import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { 
  Home,
  User,
  Search,
  Bell,
  ArrowLeft,
  LogOut,
  Menu,
  ShieldCheck,
  BellOff,
  Users // [NOVO] Ícone para a nova secção
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query"; // [NOVO] Import para buscar dados
import { User as UserType } from "@shared/schema"; // [NOVO] Import do tipo User

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // [NOVO] Hook para buscar a lista de delegados da nossa nova API
  const { data: delegates, isLoading: isLoadingDelegates } = useQuery<{ user: UserType }[]>({
    queryKey: ["/api/users/delegates"],
    // O useAuth garante que 'user' existe, então a query só roda quando o utilizador está logado
    enabled: !!user, 
  });

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  let navItems = [
    { label: "Página Inicial", icon: <Home className="w-5 h-5" />, href: "/", active: location === "/" },
    { label: "Meu Perfil", icon: <User className="w-5 h-5" />, href: `/profile/${user.username}`, active: location.startsWith("/profile") && !location.startsWith("/profile/admin")},
    { label: "Buscar", icon: <Search className="w-5 h-5" />, href: "#", active: false, onClick: () => setShowSearch(true) },
    { label: "Notificações", icon: <Bell className="w-5 h-5" />, href: "#", active: false, onClick: () => setShowNotifications(true) },
    { label: "Voltar ao Site", icon: <ArrowLeft className="w-5 h-5" />, href: "https://sites.google.com/view/sitenacionalmirim/in%C3%ADcio", external: true, active: false }
  ];
  
  if (user.isAdmin) {
    navItems.splice(2, 0, { label: "Administração", icon: <ShieldCheck className="w-5 h-5" />, href: "/admin", active: location === "/admin" });
  }

  return (
    <>
      <div className="w-full md:w-64 md:h-screen bg-sidebar-background border-r border-border md:fixed z-20">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">Site Nacional Mirin</h1>
              <button 
                className="md:hidden text-foreground"
                onClick={toggleMobileMenu}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <UserAvatar user={user} size="md" />
              <div>
                <div className="text-foreground font-medium">{user.username}</div>
                <div className="text-sm text-muted-foreground">Delegação</div>
              </div>
            </div>
          </div>
          
          <nav className={`flex-1 overflow-y-auto p-2 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            <div className="space-y-1">
              {navItems.map((item) => (
                // ... seu código de navegação aqui, sem alterações ...
              ))}
            </div>

            {/* [NOVO] Secção para exibir a lista de delegados */}
            <div className="mt-6 p-2">
              <div className="flex items-center mb-2">
                <Users className="w-5 h-5 mr-3 text-muted-foreground"/>
                <h2 className="text-lg font-semibold text-foreground">Delegações</h2>
              </div>
              <div className="space-y-2">
                {isLoadingDelegates ? (
                  <p className="text-sm text-muted-foreground">A carregar delegados...</p>
                ) : (
                  delegates?.map(({ user: delegateUser }) => (
                    <Link key={delegateUser.id} href={`/profile/${delegateUser.username}`}>
                      <a className="flex items-center space-x-3 p-2 rounded-lg hover:bg-sidebar-accent">
                        <UserAvatar user={delegateUser} size="sm" />
                        <span className="text-sm font-medium text-foreground truncate">{delegateUser.username}</span>
                      </a>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </nav>
          
          <div className={`p-4 border-t border-border ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            <Button
              variant="ghost"
              className="flex items-center space-x-3 px-4 py-3 text-foreground rounded-lg hover:bg-sidebar-accent w-full justify-start"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Dialogs de Busca e Notificações (sem alterações) */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>...</Dialog>
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>...</Dialog>
    </>
  );
}