import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { /* ...seus ícones... */ Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { User as UserType } from "@shared/schema";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // [CORRIGIDO] A query agora espera um array simples de UserType
  const { data: delegates, isLoading: isLoadingDelegates } = useQuery<UserType[]>({
    queryKey: ["/api/users/delegates"],
    enabled: !!user, 
  });

  if (!user) return null;

  const handleLogout = () => { logoutMutation.mutate(); };
  const toggleMobileMenu = () => { setIsMobileMenuOpen(!isMobileMenuOpen); };
  
  let navItems = [
    { label: "Página Inicial", icon: <Home className="w-5 h-5" />, href: "/", active: location === "/" },
    { label: "Meu Perfil", icon: <User className="w-5 h-5" />, href: `/profile/${user.username}`, active: location.startsWith("/profile") },
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
          {/* ...cabeçalho e informações do utilizador logado (sem alterações)... */}
          
          <nav className={`flex-1 overflow-y-auto p-2 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            {/* ...código de navegação principal (sem alterações)... */}

            <div className="mt-6 p-2">
              <div className="flex items-center mb-2">
                <Users className="w-5 h-5 mr-3 text-muted-foreground"/>
                <h2 className="text-lg font-semibold text-foreground">Delegações</h2>
              </div>
              <div className="space-y-2">
                {isLoadingDelegates ? (
                  <p className="text-sm text-muted-foreground">A carregar delegados...</p>
                ) : (
                  // [CORRIGIDO] O map agora itera sobre a lista simples e usa 'delegateUser' diretamente
                  delegates?.map((delegateUser) => (
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
          
          {/* ...botão de logout (sem alterações)... */}
        </div>
      </div>
      
      {/* ...diálogos (sem alterações)... */}
    </>
  );
}