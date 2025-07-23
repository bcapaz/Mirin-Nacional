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
    }      <TrendingSidebar />
        </div>
      </div>
    </div>
  );
}
