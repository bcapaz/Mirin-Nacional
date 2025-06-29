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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface TweetCardProps {
  tweet: TweetWithUser;
}

export function TweetCard({ tweet }: TweetCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]); // Tipagem para segurança
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    fetchComments();
  }, [tweet.id]); // Adicionado tweet.id como dependência para recarregar comentários se o tweet mudar

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/tweets/${tweet.id}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error("Erro ao carregar comentários:", err);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    try {
      await apiRequest("POST", `/api/tweets/${tweet.id}/comments`, {
        content: commentText.trim(),
      });
      setCommentText("");
      setShowCommentBox(false);
      fetchComments();
    } catch (err) {
      console.error("Erro ao comentar:", err);
    }
  };

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

  const repostMutation = useMutation({
    mutationFn: async () => {
      if (tweet.isReposted) {
        await apiRequest("DELETE", `/api/tweets/${tweet.id}/repost`);
      } else {
        await apiRequest("POST", `/api/tweets/${tweet.id}/repost`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${currentUser?.username}/tweets`] }); // Invalida o feed do usuário logado
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${tweet.user.username}/tweets`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao processar repost",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteTweetMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/tweets/${tweet.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${tweet.user.username}/tweets`] });
      toast({
        title: "Tweet excluído com sucesso",
        description: "O tweet foi removido da plataforma.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir tweet",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleLikeClick = () => {
    if (!user) return;
    likeMutation.mutate();
  };

  const handleRepostClick = () => {
    if (!user) return;
    repostMutation.mutate();
  };

  const handleDeleteClick = () => {
    if (!user || !user.isAdmin) return;
    if (confirm("Tem certeza que deseja excluir este tweet?")) {
      deleteTweetMutation.mutate();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(tweet.createdAt), { 
    addSuffix: true,
    locale: ptBR
  });

  // [CORRIGIDO] Funções para checar o tipo de mídia a partir do Data URL (Base64)
  const isImage = (dataUrl: string) => dataUrl?.startsWith("data:image/");
  const isVideo = (dataUrl: string) => dataUrl?.startsWith("data:video/");

  return (
    <>
      <div className="p-4 bg-card hover:bg-card/90 transition border-b border-border">
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

            {tweet.content && <p className="mt-1 text-foreground break-words">{tweet.content}</p>}

            {/* [CORRIGIDO] Bloco inteiro para usar mediaData e as novas funções isImage/isVideo */}
            {tweet.mediaData && (
              <div className="mt-2 rounded-lg overflow-hidden border border-border">
                {isImage(tweet.mediaData) ? (
                  <img 
                    src={tweet.mediaData}
                    alt="Imagem do tweet" 
                    className="max-h-80 w-auto mx-auto cursor-pointer"
                    onClick={() => setMediaOpen(true)}
                  />
                ) : isVideo(tweet.mediaData) ? (
                  <video 
                    src={tweet.mediaData}
                    controls 
                    className="max-h-80 w-auto mx-auto"
                  />
                ) : null}
              </div>
            )}

            <div className="mt-3 flex items-center space-x-8">
              <button 
                className="flex items-center text-muted-foreground hover:text-primary"
                onClick={() => setShowCommentBox(!showCommentBox)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                <span>{tweet.commentCount ?? 0}</span>
              </button>
              <button
                className={`flex items-center hover:text-green-500 ${
                  tweet.isReposted ? 'text-green-500' : 'text-muted-foreground'
                }`}
                onClick={handleRepostClick}
                disabled={repostMutation.isPending || !user}
              >
                <Repeat2 className="w-4 h-4 mr-1" />
                <span>{tweet.repostCount ?? 0}</span>
              </button>
              <button 
                className={`flex items-center ${tweet.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                onClick={handleLikeClick}
                disabled={likeMutation.isPending || !user}
              >
                {tweet.isLiked ? <HeartCrack className="w-4 h-4 mr-1" /> : <Heart className="w-4 h-4 mr-1" />}
                <span>{tweet.likeCount ?? 0}</span>
              </button>
            </div>

            {showCommentBox && user && (
                //... seu código de comentário aqui, sem alterações ...
            )}

            {comments.length > 0 && (
                //... seu código de exibição de comentários aqui, sem alterações ...
            )}
          </div>
        </div>
      </div>

      {/* [CORRIGIDO] Condição do Dialog para usar mediaData e a nova função isImage */}
      {tweet.mediaData && isImage(tweet.mediaData) && (
        <Dialog open={mediaOpen} onOpenChange={setMediaOpen}>
          <DialogContent className="max-w-4xl bg-transparent border-none shadow-none">
            <img 
              src={tweet.mediaData} 
              alt="Imagem do tweet em tela cheia" 
              className="max-h-[80vh] max-w-full object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}