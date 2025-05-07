import { TweetWithUser } from "@shared/schema";
import { UserAvatar } from "@/components/ui/user-avatar";
import { 
  MessageSquare, 
  Repeat2, 
  Heart,
  HeartCrack,
  Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface TweetCardProps {
  tweet: TweetWithUser;
  isComment?: boolean;
}

export function TweetCard({ tweet, isComment = false }: TweetCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  
  // Busca comentários
  const { data: comments } = useQuery({
    queryKey: [`/api/tweets/${tweet.id}/comments`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tweets/${tweet.id}/comments`);
      return res.comments || [];
    },
    enabled: !isComment
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (tweet.isLiked) {
        await apiRequest("DELETE", `/api/tweets/${tweet.id}/like`);
      } else {
        await apiRequest("POST", `/api/tweets/${tweet.id}/like`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${tweet.user.username}/tweets`] });
    }
  });

  const deleteTweetMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/tweets/${tweet.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
      toast({
        title: "Tweet excluído com sucesso",
        description: "O tweet foi removido da plataforma.",
      });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tweets/${tweet.id}/comments`, {
        content: commentContent
      });
      return res;
    },
    onSuccess: () => {
      setCommentContent("");
      setShowCommentForm(false);
      queryClient.invalidateQueries({ queryKey: [`/api/tweets/${tweet.id}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
    }
  });

  const handleLikeClick = () => {
    if (!user) return;
    likeMutation.mutate();
  };

  const handleDeleteClick = () => {
    if (!user?.isAdmin) return;
    if (confirm("Tem certeza que deseja excluir este tweet?")) {
      deleteTweetMutation.mutate();
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    commentMutation.mutate();
  };

  const timeAgo = formatDistanceToNow(new Date(tweet.createdAt), { 
    addSuffix: true,
    locale: ptBR
  });

  const isImage = (url: string) => url?.match(/\.(jpeg|jpg|gif|png)$/i);
  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <>
      <div className={`p-4 bg-card hover:bg-card/90 transition rounded-lg shadow-sm ${!isComment ? "border border-border mb-4" : ""}`}>
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <Link href={`/profile/${tweet.user.username}`}>
              <UserAvatar user={tweet.user} size="md" />
            </Link>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <Link href={`/profile/${tweet.user.username}`} className="font-medium text-foreground truncate hover:underline">
                {tweet.user.username}
              </Link>
              {user?.isAdmin && (
                <button 
                  onClick={handleDeleteClick}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  title="Excluir tweet (Admin)"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <span className="mx-1 text-muted-foreground">·</span>
              <p className="text-muted-foreground text-sm">{timeAgo}</p>
            </div>
            
            {tweet.content && (
              <p className="mt-1 text-foreground break-words">{tweet.content}</p>
            )}
            
            {tweet.mediaUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-border">
                {isImage(tweet.mediaUrl) ? (
                  <img 
                    src={tweet.mediaUrl} 
                    alt="Imagem do tweet" 
                    className="max-h-80 w-auto mx-auto cursor-pointer"
                    onClick={() => setMediaOpen(true)}
                  />
                ) : isVideo(tweet.mediaUrl) ? (
                  <video 
                    src={tweet.mediaUrl} 
                    controls 
                    className="max-h-80 w-auto mx-auto"
                  />
                ) : null}
              </div>
            )}
            
            <div className="mt-3 flex items-center space-x-6 text-sm">
              <button 
                className="flex items-center text-muted-foreground hover:text-primary group"
                onClick={() => setShowCommentForm(!showCommentForm)}
              >
                <MessageSquare className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                <span>{comments?.length || 0}</span>
              </button>
              
              <button className="flex items-center text-muted-foreground hover:text-green-500 group">
                <Repeat2 className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                <span>0</span>
              </button>
              
              <button 
                className={`flex items-center group ${tweet.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                onClick={handleLikeClick}
                disabled={likeMutation.isPending || !user}
              >
                {tweet.isLiked ? (
                  <HeartCrack className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                ) : (
                  <Heart className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                )}
                <span>{tweet.likeCount}</span>
              </button>
            </div>

            {/* Formulário de comentário */}
            {showCommentForm && user && (
              <form onSubmit={handleCommentSubmit} className="mt-3 space-y-2">
                <Textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Escreva seu comentário..."
                  maxLength={280}
                  required
                  className="text-sm"
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCommentForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    disabled={commentMutation.isPending || !commentContent.trim()}
                  >
                    {commentMutation.isPending ? "Enviando..." : "Comentar"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Lista de comentários */}
      {!isComment && comments?.length > 0 && (
        <div className="border-l-2 border-border ml-10 pl-4 space-y-3 mt-3">
          {comments.map((comment) => (
            <TweetCard 
              key={comment.id} 
              tweet={comment} 
              isComment={true}
            />
          ))}
        </div>
      )}

      {/* Diálogo para imagem em tela cheia */}
      {tweet.mediaUrl && isImage(tweet.mediaUrl) && (
        <Dialog open={mediaOpen} onOpenChange={setMediaOpen}>
          <DialogContent className="max-w-4xl bg-transparent border-none shadow-none">
            <img 
              src={tweet.mediaUrl} 
              alt="Imagem do tweet em tela cheia" 
              className="max-h-[80vh] max-w-full object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}