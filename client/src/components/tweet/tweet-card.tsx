import { useState, useEffect } from 'react';
import { MessageSquare, Repeat2, Heart, HeartCrack, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface TweetCardProps {
  tweet: {
    id: number;
    content: string;
    userId: number;
    createdAt: string;
    parentId?: number;
    isComment?: boolean;
    mediaUrl?: string;
    likeCount: number;
    user: {
      id: number;
      username: string;
      profileImage?: string;
      avatarColor?: string;
    };
    isLiked?: boolean;
  };
  isComment?: boolean;
}

export function TweetCard({ tweet, isComment = false }: TweetCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const queryClient = useQueryClient();

  const fetchComments = async () => {
    try {
      const res = await apiRequest('GET', `/api/tweets/${tweet.id}/comments`);
      setComments(res?.comments || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar comentários',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (!isComment) {
      fetchComments();
    }
  }, [tweet.id]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (tweet.isLiked) {
        await apiRequest('DELETE', `/api/tweets/${tweet.id}/like`);
      } else {
        await apiRequest('POST', `/api/tweets/${tweet.id}/like`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/tweets']);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/admin/tweets/${tweet.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/tweets']);
      toast({
        title: 'Sucesso',
        description: 'Tweet excluído com sucesso'
      });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/tweets/${tweet.id}/comments`, {
        content: commentContent
      });
    },
    onSuccess: () => {
      setCommentContent('');
      setShowCommentForm(false);
      fetchComments();
      queryClient.invalidateQueries(['/api/tweets']);
    }
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    commentMutation.mutate();
  };

  const handleLike = () => {
    if (!user) return;
    likeMutation.mutate();
  };

  const handleDelete = () => {
    if (!user?.isAdmin) return;
    if (confirm('Tem certeza que deseja excluir este tweet?')) {
      deleteMutation.mutate();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(tweet.createdAt), {
    addSuffix: true,
    locale: ptBR
  });

  const isImage = (url?: string) => url?.match(/\.(jpeg|jpg|gif|png)$/i);
  const isVideo = (url?: string) => url?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div className={`p-4 ${!isComment ? 'border-b border-border' : ''}`}>
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <Link href={`/profile/${tweet.user.username}`}>
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: tweet.user.avatarColor || '#009c3b' }}
            >
              <span className="text-white font-medium">
                {tweet.user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <Link href={`/profile/${tweet.user.username}`} className="font-medium hover:underline">
              {tweet.user.username}
            </Link>
            {user?.isAdmin && (
              <button
                onClick={handleDelete}
                className="ml-auto text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="text-muted-foreground text-sm">{timeAgo}</span>
          </div>

          <p className="mt-1 break-words">{tweet.content}</p>

          {tweet.mediaUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-border">
              {isImage(tweet.mediaUrl) ? (
                <img
                  src={tweet.mediaUrl}
                  alt=""
                  className="max-h-80 w-auto mx-auto cursor-pointer"
                  onClick={() => setMediaOpen(true)}
                />
              ) : isVideo(tweet.mediaUrl) ? (
                <video src={tweet.mediaUrl} controls className="max-h-80 w-auto mx-auto" />
              ) : null}
            </div>
          )}

          <div className="mt-3 flex items-center space-x-8 text-sm">
            <button
              onClick={() => setShowCommentForm(!showCommentForm)}
              className="flex items-center text-muted-foreground hover:text-primary"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              <span>{tweet.commentCount ?? comments.length}</span>
            </button>

            <button className="flex items-center text-muted-foreground hover:text-green-500">
              <Repeat2 className="w-4 h-4 mr-1" />
              <span>0</span>
            </button>

            <button
              onClick={handleLike}
              className={`flex items-center ${tweet.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
              disabled={!user}
            >
              {tweet.isLiked ? (
                <HeartCrack className="w-4 h-4 mr-1" />
              ) : (
                <Heart className="w-4 h-4 mr-1" />
              )}
              <span>{tweet.likeCount}</span>
            </button>
          </div>

          {showCommentForm && (
            <form onSubmit={handleCommentSubmit} className="mt-3 transition-all duration-300 ease-in-out">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Escreva seu comentário."
                className="w-full p-2 border rounded-lg text-sm bg-background text-foreground"
                rows={3}
                required
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCommentForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={commentMutation.isLoading || !commentContent.trim()}>
                  {commentMutation.isLoading ? 'Enviando...' : 'Comentar'}
                </Button>
              </div>
            </form>
          )}

          {!isComment && comments.length > 0 && (
            <div className={`p-4 ${!isComment ? 'border-b border-border' : 'text-muted-foreground text-sm pl-12 border-l-2 border-border'}`}>
              {comments.map((comment) => (
                <TweetCard key={comment.id} tweet={comment} isComment={true} />
              ))}
            </div>
          )}

          {mediaOpen && isImage(tweet.mediaUrl) && (
            <Dialog open={mediaOpen} onOpenChange={setMediaOpen}>
              <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
                <img
                  src={tweet.mediaUrl}
                  alt=""
                  className="max-h-[90vh] max-w-full object-contain"
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}