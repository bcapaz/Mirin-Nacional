// ... (importações no topo)
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { /* ...seus ícones... */ Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
//...
import { useQuery } from "@tanstack/react-query";
import { User as UserType } from "@shared/schema";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  // ... (código existente)

  const { data: delegates, isLoading: isLoadingDelegates } = useQuery<UserType[]>({
    queryKey: ["/api/users/delegates"],
    enabled: !!user,
  });

  if (!user) return null;

  // [CORRIGIDO] Garantir que o link "Meu Perfil" use o mesmo formato que os outros
  let navItems = [
    { label: "Página Inicial", href: "/" },
    // A rota para o perfil próprio também usa o nome de utilizador na URL
    { label: "Meu Perfil", href: `/profile/${user.username}` },
    // ... resto dos seus navItems
  ];
  // ...

  return (
    <>
      <div className="w-full md:w-64 ...">
        <div className="flex flex-col h-full">
          {/* ... */}
          <nav className={`flex-1 overflow-y-auto ...`}>
            {/* ... */}
            <div className="mt-6 p-2">
              <h2 className="text-lg font-semibold ...">Delegações</h2>
              <div className="space-y-2">
                {isLoadingDelegates ? ( <p>...</p> ) : (
                  delegates?.map((delegateUser) => (
                    // [CORRIGIDO] O link para outros delegados continua a usar o username
                    <Link key={delegateUser.id} href={`/profile/${delegateUser.username}`}>
                      <a className="flex items-center ...">
                        <UserAvatar user={delegateUser} size="sm" />
                        <span>{delegateUser.username}</span>
                      </a>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </nav>
          {/* ... */}
        </div>
      </div>
    </>
  );
}