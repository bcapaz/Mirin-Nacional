import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TweetCard } from "@/components/tweet/tweet-card";
import { TweetForm } from "@/components/tweet/tweet-form";
import { TrendingSidebar } from "@/components/trending/trending-sidebar";
import { TweetWithUser } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Fragment } from "react";

async function fetchTweets({ pageParam }: { pageParam: unknown }) {
    // pageParam será o cursor (a data do último tweet)
    const cursor = typeof pageParam === 'string' ? pageParam : '';
    const response = await fetch(`/api/tweets?cursor=${encodeURIComponent(cursor)}`);
    if (!response.ok) {
        throw new Error("Falha ao buscar os tweets.");
    }
    return response.json();
}


export default function HomePage() {
  const { data: tweets, isLoading } = useQuery<TweetWithUser[]>({
    queryKey: ["/api/tweets"],
  });
  const queryClient = useQueryClient();

  const {
      data,
      isLoading,
      isError,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
  } = useInfiniteQuery({
        queryKey: ["tweets"], // Chave única para esta query
        queryFn: fetchTweets,
        // Define como obter o cursor da próxima página a partir da página atual
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        initialPageParam: undefined,
    });

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['tweets'] });
    }
  
    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['tweets'] });
        
    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            <Sidebar />
            
            <div className="flex-1 md:ml-64">
                <div className="max-w-4xl mx-auto md:flex">
                    {/* Main Feed */}
                    <div className="flex-1">
                        {/* Header */}
                        <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
                            <div className="px-4 py-3">
                                <h2 className="text-xl font-bold text-gray-900">Twitter dos Delegados</h2>
                                <p className="text-sm text-gray-500">Discuta a greve dos caminhoneiros de 2018</p>
                            </div>
                        </header>
                        
                        {/* Tweet Form */}
                        <TweetForm onSuccess={handleSuccess} />
                        
                        {/* Feed */}
                        <div className="divide-y divide-gray-200">
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#009c3b]" />
                                </div>
                            ) : isError ? (
                                <div className="p-8 text-center text-red-500">
                                    Ocorreu um erro ao carregar as publicações.
                                </div>
                            ) : data?.pages ? (
                                <>
                                    {data.pages.map((page, i) => (
                                        <Fragment key={i}>
                                            {page.data.map((tweet: TweetWithUser) => (
                                                <TweetCard key={tweet.id} tweet={tweet} />
                                            ))}
                                        </Fragment>
                                    ))}
                                    
                                    {/* Botão de Carregar Mais e Status */}
                                    <div className="p-4 text-center">
                                        {hasNextPage && (
                                            <button
                                                onClick={() => fetchNextPage()}
                                                disabled={isFetchingNextPage}
                                                className="rounded-full bg-sky-500 px-4 py-2 font-bold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-800"
                                            >
                                                {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
                                            </button>
                                        )}
                                        {!hasNextPage && (
                                            <p className="text-gray-500">Você chegou ao fim.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    Nenhuma publicação encontrada. Seja o primeiro a publicar!
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
