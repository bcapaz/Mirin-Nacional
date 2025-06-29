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

  const { data: userTweets, isLoading: isLoadingTweets } = useQuery<TweetWithUser[]>({
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
              <div className="px-4 py-3 flex items-center">
                <Link href="/" className="mr-6">
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </Link>
                {isLoadingProfile ? (
                  <div className="flex flex-col">
                    <div className="h-6 w-40 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-muted rounded animate-pulse mt-1"></div>
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
            {isLoadingProfile ? (
              <div className="p-6 bg-card border-b border-border flex items-center space-x-4">
                <div className="h-20 w-20 rounded-full bg-muted animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2"></div>
                  <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2"></div>
                </div>
              </div>
            ) : profileUser ? (
              <div className="p-6 bg-card border-b border-border">
                <div className="flex items-center space-x-4">
                  <UserAvatar user={profileUser} size="lg" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h1 className="text-2xl font-bold text-foreground">{profileUser.username}</h1>
                        {profileUser.name && !isOwnProfile && (
                          <p className="text-muted-foreground text-sm">
                            Delegação da {profileUser.name}
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
              </div>
            ) : (
              <div className="p-6 bg-card border-b border-border text-center">
                <p className="text-muted-foreground">Este usuário não existe.</p>
              </div>
            )}
            
            {/* Tweets */}
            <div className="divide-y divide-border">
              {isLoadingTweets ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : userTweets && userTweets.length > 0 ? (
                {userTweets.map(tweet => (
                  <div key={`${item.type}-${item.id}`}>
		      {item.type === 'repost' && (
     			 <div className="flex items-center text-sm text-muted-foreground pl-12 pt-2 -mb-2">
     			   <Repeat2 className="w-4 h-4 mr-2" />
    			   {item.repostedBy || 'Você'} repostou
      			 </div>
   		      )}
		      <TweetCard tweet={item} />
  		  </div>
		))}
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
