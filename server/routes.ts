import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  
  // --- ROTAS GET (sem alterações) ---
  app.get("/api/tweets", async (req, res) => { /* ...código original... */ });
  app.get("/api/profile/:username", async (req, res) => { /* ...código original... */ });
  app.get("/api/profile/:username/tweets", async (req, res) => { /* ...código original... */ });
  app.get('/api/tweets/:id/comments', async (req, res) => { /* ...código original... */ });
  
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
  
  // [CORRIGIDO] Rota de Like agora verifica se o UTILIZADOR ESPECÍFICO já deu like
  app.post("/api/tweets/:id/like", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const tweetId = parseInt(req.params.id);
      if (isNaN(tweetId)) return res.status(400).json({ message: "Invalid tweet ID" });
      
      // @ts-ignore
      const userId = req.user.id;

      // Adiciona a verificação correta
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

  app.post("/api/profile/update", upload.single('profileImage'), async (req, res) => { /* ...código original... */ });
  app.post("/api/tweets/:id/comments", async (req, res) => { /* ...código original... */ });
  
  // [CORRIGIDO] Rota de Repost com verificação de segurança
  app.post('/api/tweets/:id/repost', async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const tweetId = parseInt(req.params.id);
      // @ts-ignore
      const userId = req.user.id;

      // Garante que a verificação existe
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
  
  // --- ROTAS DELETE (com verificações adicionadas para robustez) ---
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
        return res.status(404).json({ message: "Repost não encontrado para este usuário" });
      }

      await storage.deleteRepost(userId, tweetId);
      return res.status(200).json({ message: "Repost removido com sucesso" });
    } catch (error) {
      console.error("Error deleting repost:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/admin/tweets/:id", async (req, res) => { /* ...código original... */ });

  const httpServer = createServer(app);
  return httpServer;
}