import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TweetCard } from "@/components/tweet/tweet-card";
import { TweetForm } from "@/components/tweet/tweet-form";
import { TrendingSidebar } from "@/components/trending/trending-sidebar";
import { TweetWithUser } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { data: tweets, isLoading } = useQuery<TweetWithUser[]>({
    queryKey: ["/api/tweets"],
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-1 md:ml-64">
        <div className="max-w-4xl mx-auto md:flex">
          {/* Main Feed */}
          <div className="flex-1">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-blue border-b border-gray-200">
              <div className="px-4 py-3">
                <h2 className="text-xl font-bold text-[#00]">Twitter dos Delegados</h2>
                <p className="text-sm text-gray-500">Discuta a greve dos caminhoneiros de 2018</p>
              </div>
            </header>
            
            {/* Tweet Form */}
            <TweetForm />
            
            {/* Feed */}
            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#009c3b]" />
                </div>
              ) : tweets && tweets.length > 0 ? (
                tweets.map(tweet => (
                  <TweetCard key={tweet.id} tweet={tweet} />
                ))
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
