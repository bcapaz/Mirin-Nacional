import { useState, useRef } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImageIcon, X, Video } from "lucide-react";

export function TweetForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const tweetMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("content", content);
      
      if (media) {
        formData.append("media", media);
      }
      
      const response = await fetch("/api/tweets", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao publicar");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setContent("");
      setMedia(null);
      setMediaPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
      toast({
        title: "Publicação enviada!",
        description: "Sua mensagem foi publicada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao publicar",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !media) {
      toast({
        title: "Publicação vazia",
        description: "Por favor, escreva algo ou adicione uma mídia antes de publicar.",
        variant: "destructive",
      });
      return;
    }
    
    if (content.length > 280) {
      toast({
        title: "Publicação muito longa",
        description: "Sua mensagem excede o limite de 280 caracteres.",
        variant: "destructive",
      });
      return;
    }
    
    tweetMutation.mutate();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Verificar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter menos de 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar tipo (apenas imagens e vídeos)
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Apenas imagens e vídeos são suportados.",
        variant: "destructive",
      });
      return;
    }
    
    setMedia(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveMedia = () => {
    setMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!user) return null;

  const charCount = content.length;
  const isLimitReached = charCount > 280;
  const isWarning = charCount > 240 && charCount <= 280;

  return (
    <div className="p-4 border-b border-border bg-card text-card-foreground">
      <div className="flex space-x-4">
        <div className="flex-shrink-0">
          <UserAvatar user={user} size="md" />
        </div>
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <Textarea
              id="tweetContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full p-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:outline-none resize-none bg-background text-foreground"
              placeholder="O que está acontecendo?"
            />
            
            {mediaPreview && (
              <div className="relative mt-2 mb-3">
                <div className="rounded-lg overflow-hidden border border-border">
                  {media?.type.startsWith("image/") ? (
                    <img src={mediaPreview} alt="Preview" className="max-h-80 w-auto mx-auto" />
                  ) : (
                    <video src={mediaPreview} controls className="max-h-80 w-auto mx-auto" />
                  )}
                </div>
                <button 
                  type="button"
                  onClick={handleRemoveMedia}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                  id="mediaUpload"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-accent hover:text-accent-foreground"
                  title="Adicionar mídia"
                >
                  <ImageIcon size={20} />
                </Button>
                <div className={`text-sm ${isLimitReached ? 'text-destructive' : isWarning ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                  <span id="charCount">{charCount}</span>/280
                </div>
              </div>
              <Button
                type="submit"
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full"
                disabled={tweetMutation.isPending || isLimitReached || (!content.trim() && !media)}
              >
                {tweetMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Publicar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
