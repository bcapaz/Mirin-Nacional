import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth"; // Importamos hashPassword
import { storage } from "./storage";
import multer from 'multer';
import { randomBytes } from "crypto"; // Importamos randomBytes

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  
  // --- ROTAS GET ---
    app.get("/api/tweets", async (req, res) => {
        try {
            if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

            const limit = 15;
            // O cursor vem como uma string da URL
            const cursor = req.query.cursor as string | undefined;
            // @ts-ignore
            const userId = req.user.id;

            const tweets = await storage.getAllTweets(userId, { limit, cursor });

            // Define o cursor para a próxima página
            let nextCursor: string | null = null;
            if (tweets.length === limit) {
                // O próximo cursor é a data do último tweet desta página
                nextCursor = tweets[tweets.length - 1].createdAt.toISOString();
            }

            // Retorna os dados no formato esperado pelo useInfiniteQuery
            return res.json({
                data: tweets,
                nextCursor,
            });

        } catch (error) {
            console.error("Error fetching tweets:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });


  app.get("/api/profile/:identifier", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const identifier = req.params.identifier;
      let user;
      if (!isNaN(parseInt(identifier, 10))) {
        user = await storage.getUser(parseInt(identifier, 10));
      } else {
        user = await storage.getUserByUsername(identifier);
      }
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }
 
      // Usa a função já existente no seu storage para buscar todos os utilizadores
      const allUsers = await storage.getAllUsers();
    
      return res.json(allUsers);
    
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/profile/:identifier/tweets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const identifier = req.params.identifier;
      let user;
      if (!isNaN(parseInt(identifier, 10))) {
        user = await storage.getUser(parseInt(identifier, 10));
      } else {
        user = await storage.getUserByUsername(identifier);
      }
      if (!user) return res.status(404).json({ message: "User not found" });
      // @ts-ignore
      const userTweets = await storage.getUserTweets(user.id, req.user.id);
      return res.json(userTweets);
    } catch (error) {
      console.error("Error fetching user tweets:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/delegates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const delegates = await storage.getNonAdminUsers();
      return res.json(delegates);
    } catch (error) {
      console.error("Error fetching delegates:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/tweets/:id/comments', async (req, res) => {
    try {
      const tweetId = parseInt(req.params.id);
      const comments = await storage.getComments(tweetId);
      if (!comments) return res.status(404).json({ error: "Comentários não encontrados" });
      res.json({ success: true, count: comments.length, comments });
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
      res.status(500).json({ error: "Erro interno ao carregar comentários" });
    }
  });

  // --- ROTAS POST ---
  app.post("/api/tweets", upload.single('media'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const content = req.body.content || "";
      let mediaData = null;
      if (req.file) {
        const b64 = req.file.buffer.toString("base64");
        mediaData = `data:${req.file.mimetype};base64,${b64}`;
      }
      if (!content && !mediaData) return res.status(400).json({ message: "Conteúdo ou mídia são obrigatórios" });
      const newTweet = await storage.createTweet({
        content,
        // @ts-ignore
        userId: req.user.id,
        mediaData
      });
      return res.status(201).json(newTweet);
    } catch (error) {
      console.error("Error creating tweet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tweets/:id/like", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const tweetId = parseInt(req.params.id);
      if (isNaN(tweetId)) return res.status(400).json({ message: "Invalid tweet ID" });
      // @ts-ignore
      const userId = req.user.id;
      const existingLike = await storage.getLike(userId, tweetId);
      if (existingLike) {
        return res.status(409).json({ message: "Tweet já foi curtido por este usuário" });
      }
      await storage.createLike({ userId, tweetId });
      return res.status(201).json({ message: "Tweet liked successfully" });
    } catch (error) {
      console.error("Error liking tweet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/profile/update", upload.single('profileImage'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const { username, bio } = req.body;
      let profileImage: string | null = null;
      if (req.file) {
        const b64 = req.file.buffer.toString("base64");
        profileImage = `data:${req.file.mimetype};base64,${b64}`;
      }
      if (!username || !username.trim()) return res.status(400).json({ message: "Nome de delegação é obrigatório" });
      // @ts-ignore
      if (username !== req.user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) return res.status(400).json({ message: "Nome de delegação já está em uso" });
      }
      const updateData: { username: string; bio?: string; profileImage?: string } = { username, bio };
      if (profileImage) {
        updateData.profileImage = profileImage;
      }
      // @ts-ignore
      const updatedUser = await storage.updateUser(req.user.id, updateData);
      return res.status(200).json(updatedUser);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: error.message || "Erro interno do servidor" });
    }
  });

  app.post("/api/tweets/:id/comments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const tweetId = parseInt(req.params.id, 10);
      if (isNaN(tweetId)) return res.status(400).json({ message: "ID de tweet inválido" });
      const { content } = req.body;
      if (!content || content.length > 280) return res.status(400).json({ message: "Conteúdo do comentário é inválido" });
      const newComment = await storage.createComment({
        content,
        // @ts-ignore
        userId: req.user.id,
        tweetId: tweetId,
      });
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Erro ao criar comentário:", error);
      res.status(500).json({ message: "Erro interno ao criar comentário" });
    }
  });

  app.post('/api/tweets/:id/repost', async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const tweetId = parseInt(req.params.id);
      // @ts-ignore
      const userId = req.user.id;
      const existingRepost = await storage.getRepost(userId, tweetId);
      if (existingRepost) {
        return res.status(409).json({ message: "Tweet já repostado" });
      }
      await storage.createRepost(userId, tweetId);
      return res.status(201).json({ message: "Tweet repostado com sucesso" });
    } catch (error) {
      console.error("Error creating repost:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // [ADICIONADO] Nova rota segura para redefinir a senha
  app.post("/api/admin/users/:id/reset-password", async (req, res) => {
    try {
      // @ts-ignore
      if (!req.isAuthenticated() || !req.user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado." });
      }

      const userIdToReset = parseInt(req.params.id, 10);
      if (isNaN(userIdToReset)) {
        return res.status(400).json({ message: "ID de utilizador inválido." });
      }

    // [MODIFICADO] Lemos a nova senha do corpo do pedido
      const { newPassword } = req.body;
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
          return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres."});
      }

    // Criptografa a senha fornecida pelo admin
      const hashedPassword = await hashPassword(newPassword);
    
    // Usa a função updateUser para guardar a nova senha
      await storage.updateUser(userIdToReset, { password: hashedPassword });
  
    // Já não precisamos de retornar a senha, apenas uma mensagem de sucesso
      return res.status(200).json({ success: true, message: "Senha redefinida com sucesso." });

    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  // --- ROTAS DELETE ---
  app.delete("/api/tweets/:id/like", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const tweetId = parseInt(req.params.id);
      if (isNaN(tweetId)) return res.status(400).json({ message: "Invalid tweet ID" });
      // @ts-ignore
      const userId = req.user.id;
      const existingLike = await storage.getLike(userId, tweetId);
      if (!existingLike) {
        return res.status(404).json({ message: "Like não encontrado para este usuário" });
      }
      await storage.deleteLike(userId, tweetId);
      return res.status(200).json({ message: "Tweet unliked successfully" });
    } catch (error) {
      console.error("Error unliking tweet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete('/api/tweets/:id/repost', async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const tweetId = parseInt(req.params.id);
      // @ts-ignore
      const userId = req.user.id;
      const existingRepost = await storage.getRepost(userId, tweetId);
      if (!existingRepost) {
        return res.status(404).json({ message: "Repost não encontrado" });
      }
      await storage.deleteRepost(userId, tweetId);
      return res.status(200).json({ message: "Repost removido com sucesso" });
    } catch (error) {
      console.error("Error deleting repost:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/admin/tweets/:id", async (req, res) => {
    try {
      // @ts-ignore
      if (!req.isAuthenticated() || !req.user.isAdmin) return res.status(403).json({ message: "Forbidden" });
      const tweetId = parseInt(req.params.id);
      await storage.deleteTweet(tweetId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting tweet:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
