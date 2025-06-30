import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  
  // --- ROTAS GET ---
  app.get("/api/tweets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      // @ts-ignore
      const allTweets = await storage.getAllTweets(req.user.id);
      return res.json(allTweets);
    } catch (error) {
      console.error("Error fetching tweets:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // [MODIFICADO] As rotas de perfil agora usam um ':identifier' genérico
  app.get("/api/profile/:identifier", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

      const identifier = req.params.identifier;
      let user;

      // Se o identificador for um número, busca por ID. Senão, busca por nome.
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

  // [MODIFICADO] A rota de delegados agora retorna uma lista simples.
  app.get("/api/users/delegates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const delegates = await storage.getNonAdminUsers();
      return res.json(delegates); // Retorna a lista diretamente
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

  // --- ROTAS POST / DELETE etc. (sem mais alterações) ---
  
  app.post("/api/tweets", upload.single('media'), async (req, res) => {
    //...código original...
  });

  app.post("/api/tweets/:id/like", async (req, res) => {
    //...código original...
  });

  app.delete("/api/tweets/:id/like", async (req, res) => {
    //...código original...
  });

  app.post("/api/profile/update", upload.single('profileImage'), async (req, res) => {
    //...código original...
  });

  app.delete("/api/admin/tweets/:id", async (req, res) => {
    //...código original...
  });

  app.post("/api/tweets/:id/comments", async (req, res) => {
    //...código original...
  });

  app.post('/api/tweets/:id/repost', async (req, res) => {
    //...código original...
  });

  app.delete('/api/tweets/:id/repost', async (req, res) => {
    //...código original...
  });

  const httpServer = createServer(app);
  return httpServer;
}