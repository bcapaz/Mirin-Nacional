import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TweetCard } from "@/components/tweet/tweet-card";
import { TrendingSidebar } from "@/components/trending/trending-sidebar";
import { TweetWithUser, User } from "@shared/schema";
import { Loader2, ArrowLeft } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { Repeat2 } from "lucide-react";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const isOwnProfile = currentUser?.username === username;

  const { data: profileUser, isLoading: isLoadingProfile } = useQuery<User>({
    queryKey: [`/api/profile/${username}`],
  });

  // [CORREÇÃO 1 de 2]: Adicionamos 'isError' e 'error' para tratar falhas na API.
  const { data: userTweets, isLoading: isLoadingTweets, isError, error } = useQuery<TweetWithUser[]>({
    queryKey: [`/api/profile/${username}/tweets`],
    enabled: !!username,
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-1 md:ml-64">
        <div className="max-w-4xl mx-auto md:flex">
          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-card border-b border-border">
                {/* ... Nenhuma mudança no header ... */}
            </header>
            
            {/* Profile Info */}
            {isLoadingProfile ? (
              // ... Nenhuma mudança aqui ...
            ) => profileUser ? (
              <div className="p-6 bg-card border-b border-border">
                  {/* ... Nenhuma mudança nas informações de perfil ... */}
              </div>
            ) : (
                // ... Nenhuma mudança aqui ...
            )}
            
            {/* Tweets */}
            <div className="divide-y divide-border">
              {isLoadingTweets ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              // [CORREÇÃO 1 de 2]: Adicionamos este bloco para mostrar o erro em vez de quebrar a página.
              ) => isError ? (
                <div className="p-8 text-center text-destructive">
                  Ocorreu um erro ao carregar o feed: {error instanceof Error ? error.message : 'Erro desconhecido'}
                </div>
              ) => userTweets && userTweets.length > 0 ? (
                // [CORREÇÃO 2 de 2]: A variável do map foi renomeada de 'tweet' para 'item'.
                userTweets.map(item => (
                  <div key={`${item.type}-${item.id}`}>
                    {item.type === 'repost' && (
                      <div className="flex items-center text-sm text-muted-foreground pl-12 pt-3 -mb-3">
                        <Repeat2 className="w-4 h-4 mr-2" />
                        {item.repostedBy || 'Você'} repostou
                      </div>
                    )}
                    <TweetCard tweet={item} />
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma publicação encontrada.
                </div>
              )}
            </div>
          </div>
          
          {/* Trending Sidebar */}
          <TrendingSidebar />
        </div>
      </div>
    </div>
  );
}