import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { TweetCard } from "@/components/tweet/tweet-card";
import { TrendingSidebar } from "@/components/trending/trending-sidebar";
import { TweetWithUser, User } from "@shared/schema";
import { Loader2, ArrowLeft, Repeat2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";

export default function ProfilePage() {
  // [CORRIGIDO] Lemos o parâmetro da URL, que pode ser um ID ou um nome.
  // A sua rota principal continua a ser /profile/:username, então lemos o parâmetro 'username'.
  const params = useParams();
  const identifier = params.username; // O 'username' da URL pode ser um nome ou um ID

  const { user: currentUser } = useAuth();

  const { data: profileUser, isLoading: isLoadingProfile } = useQuery<User>({
    // Usamos o 'identifier' para a chave da query e a chamada da API
    queryKey: [`/api/profile/${identifier}`],
    enabled: !!identifier,
  });

  const { data: userTweets, isLoading: isLoadingTweets, isError, error } = useQuery<TweetWithUser[]>({
    queryKey: [`/api/profile/${identifier}/tweets`],
    enabled: !!profileUser, // Só busca os tweets depois que o perfil for encontrado
  });

  // A verificação de perfil próprio agora compara os IDs, que é mais seguro.
  const isOwnProfile = currentUser?.id === profileUser?.id;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-1 md:ml-64">
        <div className="max-w-4xl mx-auto md:flex">
          <div className="flex-1">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-card border-b border-border">
              <div className="px-4 py-3 flex items-center">
                <Link href="/" className="mr-6">
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </Link>
                {isLoadingProfile ? (
                  <div className="flex flex-col animate-pulse">
                    <div className="h-6 w-40 bg-muted rounded"></div>
                    <div className="h-4 w-24 bg-muted rounded mt-1"></div>
                  </div>
                ) : profileUser ? (
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{profileUser.username}</h2>
                    <p className="text-sm text-muted-foreground">Delegação</p>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Perfil não encontrado</h2>
                  </div>
                )}
              </div>
            </header>
            
            {/* Profile Info */}
            <div className="p-6 bg-card border-b border-border">
              {isLoadingProfile ? (
                // ... skeleton loading ...
              ) => profileUser ? (
                <div className="flex items-center space-x-4">
                  <UserAvatar user={profileUser} size="lg" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h1 className="text-2xl font-bold text-foreground">{profileUser.username}</h1>
                        {profileUser.name && !isOwnProfile && (
                          <p className="text-muted-foreground text-sm">
                            Delegação de {profileUser.name}
                          </p>
                        )}
                      </div>
                      {isOwnProfile && <ProfileEditForm />}
                    </div>
                    {profileUser.bio && (
                      <p className="text-foreground mt-2">{profileUser.bio}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted-foreground">Este usuário não existe.</p>
                </div>
              ):
            </div>
            
            {/* Tweets */}
            <div className="divide-y divide-border">
              {isLoadingTweets ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : isError ? (
                <div className="p-8 text-center text-destructive">
                  Ocorreu um erro ao carregar o feed: {error instanceof Error ? error.message : 'Erro desconhecido'}
                </div>
              ) : userTweets && userTweets.length > 0 ? (
                userTweets.map(item => (
                  <div key={`${item.type}-${item.id}`}>
                    {item.type === 'repost' && (
                      <div className="flex items-center text-sm text-muted-foreground pl-12 pt-3 -mb-3">
                        <Repeat2 className="w-4 h-4 mr-2" />
                        <span>{item.repostedBy || 'Você'} repostou</span>
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
          
          <TrendingSidebar />
        </div>
      </div>
    </div>
  );
}