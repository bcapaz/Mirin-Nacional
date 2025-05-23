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
  BellOff
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  // Lista base de itens de navegação
  let navItems = [
    {
      label: "Página Inicial",
      icon: <Home className="w-5 h-5" />,
      href: "/",
      active: location === "/",
      onClick: undefined,
      external: false
    },
    {
      label: "Meu Perfil",
      icon: <User className="w-5 h-5" />,
      href: `/profile/${user.username}`,
      active: location.startsWith("/profile") && !location.startsWith("/profile/admin"),
      onClick: undefined,
      external: false
    },
    {
      label: "Buscar",
      icon: <Search className="w-5 h-5" />,
      href: "#",
      active: false,
      onClick: () => setShowSearch(true),
      external: false
    },
    {
      label: "Notificações",
      icon: <Bell className="w-5 h-5" />,
      href: "#",
      active: false,
      onClick: () => setShowNotifications(true),
      external: false
    },
    {
      label: "Voltar ao Site",
      icon: <ArrowLeft className="w-5 h-5" />,
      href: "https://sites.google.com/view/sitenacionalmirim/in%C3%ADcio",
      external: true,
      active: false,
      onClick: undefined
    }
  ];
  
  // Adicionar item de administração se o usuário for administrador
  if (user.isAdmin) {
    navItems.splice(2, 0, {
      label: "Administração",
      icon: <ShieldCheck className="w-5 h-5" />,
      href: "/admin",
      active: location === "/admin",
      onClick: undefined,
      external: false
    });
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
                  <a 
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center space-x-3 px-4 py-3 text-foreground rounded-lg hover:bg-sidebar-accent`}
                  >
                    <span className={`text-muted-foreground`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                ) : item.onClick ? (
                  <button 
                    key={item.label}
                    onClick={item.onClick}
                    className={`flex items-center space-x-3 px-4 py-3 text-foreground rounded-lg w-full text-left hover:bg-sidebar-accent`}
                  >
                    <span className={`${item.active ? 'text-[#ffdf00]' : 'text-muted-foreground'}`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <Link 
                    key={item.label}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 text-foreground rounded-lg ${item.active ? 'sidebar-active' : 'hover:bg-sidebar-accent'}`}
                  >
                    <span className={`${item.active ? 'text-[#ffdf00]' : 'text-muted-foreground'}`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              ))}
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
      
      {/* Diálogo de Busca */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="bg-sidebar-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Resultados da Busca</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-foreground">Nenhum resultado encontrado</p>
            <p className="text-sm text-muted-foreground mt-2">Tente com termos diferentes ou aguarde novos conteúdos.</p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Notificações */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="bg-sidebar-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Notificações</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-foreground">Não há notificações no momento</p>
            <p className="text-sm text-muted-foreground mt-2">Notificaremos você quando houver novas interações.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
