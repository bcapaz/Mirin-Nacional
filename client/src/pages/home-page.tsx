import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TweetCard } from "@/components/tweet/tweet-card";
import { TweetForm } from "@/components/tweet/tweet-form";
import { TrendingSidebar } from "@/components/trending/trending-sidebar";
import { TweetWithUser } from "@shared/schema";
import { Loader2 } from "lucide-react";

// Chave que usaremos para guardar os tweets no localStorage
const TWEETS_CACHE_KEY = 'tweetsCache';

export default function HomePage() {
  const { data: tweets, isLoading } = useQuery<TweetWithUser[]>({
    queryKey: ["/api/tweets"],
    
    // [ADICIONADO] Carrega os dados do cache para exibição instantânea
    placeholderData: () => {
      try {
        const cachedTweets = localStorage.getItem(TWEETS_CACHE_KEY);
        // Se encontrarmos dados no cache, usamo-los como dados temporários
        return cachedTweets ? JSON.parse(cachedTweets) : undefined;
      } catch (error) {
        console.error("Falha ao ler o cache de tweets:", error);
        return undefined;
      }
    },
    
    // [ADICIONADO] Quando a busca for bem-sucedida, atualiza o cache
    onSuccess: (data) => {
      try {
        // Guarda a nova lista de tweets no localStorage
        localStorage.setItem(TWEETS_CACHE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error("Falha ao guardar os tweets no cache:", error);
      }
    },
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-1 md:ml-64">
        <div className="max-w-4xl mx-auto md:flex">
          {/* Main Feed */}
          <div className="flex-1">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-card border-b border-border p-4">
              <h1 className="text-xl font-bold text-foreground">Página Inicial</h1>
            </header>
            
            <TweetForm />
            
            {/* Feed */}
            <div className="divide-y divide-border">
              {/* [MODIFICADO] A lógica de carregamento agora só mostra o loader principal se não houver dados em cache */}
              {isLoading && !tweets ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : tweets && tweets.length > 0 ? (
                tweets.map(tweet => (
                  <TweetCard key={tweet.id} tweet={tweet} />
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma publicação encontrada. Seja o primeiro a publicar!
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
