import { TweetCard } from "@/components/tweet-card";
import { TweetComposer } from "@/components/tweet-composer";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import type { Tweet } from "@/types";

export function HomePage() {
  const { user } = useAuth();

  // Estados para gerenciar a lista de tweets e a paginação
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Função para buscar a primeira página de tweets
  const fetchInitialTweets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tweets");
      const data = await response.json();
      setTweets(data.tweets);
      setNextCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    } catch (error) {
      console.error("Failed to fetch tweets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para buscar mais tweets (próximas páginas)
  const handleLoadMore = async () => {
    if (!nextCursor || isLoading) return; // Não faz nada se não houver próxima página ou se já estiver carregando

    setIsLoading(true);
    try {
      // Usamos encodeURIComponent para garantir que o cursor (que pode ter caracteres especiais) seja enviado corretamente
      const response = await fetch(`/api/tweets?cursor=${encodeURIComponent(nextCursor)}`);
      const data = await response.json();
      // Adiciona os novos tweets à lista existente
      setTweets(prevTweets => [...prevTweets, ...data.tweets]);
      setNextCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    } catch (error) {
      console.error("Failed to fetch more tweets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Busca os tweets iniciais quando o componente é montado
  useEffect(() => {
    fetchInitialTweets();
  }, []);

  const handleTweetCreated = (newTweet: Tweet) => {
    // Adiciona o novo tweet no topo da lista para feedback imediato
    setTweets(prevTweets => [newTweet, ...prevTweets]);
  };
  
  return (
    <div className="flex flex-col">
      {user && (
        <div className="border-b border-zinc-700 p-4">
          <TweetComposer onTweetCreated={handleTweetCreated} />
        </div>
      )}

      <div className="flex flex-col">
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} />
        ))}
      </div>
      
      {/* Botão e mensagens de status da paginação */}
      <div className="p-4 text-center">
        {isLoading && <p className="text-zinc-400">Carregando...</p>}
        {!isLoading && hasMore && (
          <button
            onClick={handleLoadMore}
            className="rounded-full bg-sky-500 px-4 py-2 font-bold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-800"
            disabled={isLoading}
          >
            Carregar tweets mais antigos
          </button>
        )}
        {!isLoading && !hasMore && tweets.length > 0 && (
          <p className="text-zinc-500">Você chegou ao fim.</p>
        )}
         {!isLoading && tweets.length === 0 && (
          <p className="text-zinc-500">Ainda não há tweets por aqui.</p>
        )}
      </div>
    </div>
  );
}
