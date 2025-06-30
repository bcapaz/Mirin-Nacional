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
  Users
} from "lucide-react";
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
  
  // O link "Meu Perfil" agora também usa o ID para consistência
  let navItems = [
    { label: "Página Inicial", icon: <Home className="w-5 h-5" />, href: "/", active: location === "/" },
    { label: "Meu Perfil", icon: <User className="w-5 h-5" />, href: `/profile/${user.id}`, active: location.startsWith("/profile/") },
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
                item.external ? (
                  <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={`flex items-center space-x-3 px-4 py-3 text-foreground rounded-lg hover:bg-sidebar-accent`}>
                    <span className={`text-muted-foreground`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                ) : item.onClick ? (
                  <button key={item.label} onClick={item.onClick} className={`flex items-center space-x-3 px-4 py-3 text-foreground rounded-lg w-full text-left hover:bg-sidebar-accent`}>
                    <span className={`${item.active ? 'text-[#ffdf00]' : 'text-muted-foreground'}`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <Link key={item.label} href={item.href!} className={`flex items-center space-x-3 px-4 py-3 text-foreground rounded-lg ${item.active ? 'sidebar-active' : 'hover:bg-sidebar-accent'}`}>
                    <span className={`${item.active ? 'text-[#ffdf00]' : 'text-muted-foreground'}`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              ))}
            </div>

            <div className="mt-6 p-2">
              <div className="flex items-center mb-2">
                <Users className="w-5 h-5 mr-3 text-muted-foreground"/>
                <h2 className="text-lg font-semibold text-foreground">Delegações</h2>
              </div>
              <div className="space-y-2">
                {isLoadingDelegates ? (
                  <p className="text-sm text-muted-foreground">A carregar delegados...</p>
                ) : (
                  delegates?.map((delegateUser) => (
                    // [CORRIGIDO] O link agora usa o ID do utilizador, que é mais fiável
                    <Link key={delegateUser.id} href={`/profile/${delegateUser.id}`}>
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
            <Button variant="ghost" className="flex items-center ...">
              <LogOut className="w-5 h-5 text-muted-foreground" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Diálogos */}
      {/* ... o seu código de diálogos aqui, sem alterações ... */}
    </>
  );
}