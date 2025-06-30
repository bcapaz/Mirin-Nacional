import type { Express } from "express";
import express from "express";
import path from "path";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { eq, desc, sql, and } from "drizzle-orm";

// [REMOVIDO] Imports que não são mais necessários
// import { processFileUpload, getPublicFilePath } from "./uploads";
// import { hashPassword } from "./auth";

// [NOVO] Import do multer para lidar com uploads
import multer from 'multer';

// [NOVO] Configuração do multer para guardar os arquivos em memória
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // A rota para servir arquivos estáticos não é mais necessária com o novo método
  // app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  setupAuth(app);
  
  // Get all tweets (sem alterações)
  app.get("/api/tweets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // @ts-ignore
      const allTweets = await storage.getAllTweets(req.user.id);
      return res.json(allTweets);
    } catch (error) {
      console.error("Error fetching tweets:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // [MODIFICADO] Rota de criação de tweet agora usa o multer
  app.post("/api/tweets", upload.single('media'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const content = req.body.content || "";
      let mediaData = null;

      // Usamos req.file, que é fornecido pelo multer
      if (req.file) {
        const b64 = req.file.buffer.toString("base64");
        mediaData = `data:${req.file.mimetype};base64,${b64}`;
      }

      if (!content && !mediaData) {
        return res.status(400).json({ message: "Conteúdo ou mídia são obrigatórios" });
      }
      
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
  
  // Like/Unlike/Get Profile/Get User Tweets (sem alterações)
  app.post("/api/tweets/:id/like", async (req, res) => { /* ...código original... */ });
  app.delete("/api/tweets/:id/like", async (req, res) => { /* ...código original... */ });
  app.get("/api/profile/:username", async (req, res) => { /* ...código original... */ });
  app.get("/api/profile/:username/tweets", async (req, res) => { /* ...código original... */ });
  
  // [MODIFICADO] Rota de atualização de perfil agora usa o multer
  app.post("/api/profile/update", upload.single('profileImage'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { username, bio } = req.body;
      let profileImage: string | null = null;

      // Usamos req.file aqui também
      if (req.file) {
        const b64 = req.file.buffer.toString("base64");
        profileImage = `data:${req.file.mimetype};base64,${b64}`;
      }
      
      if (!username || !username.trim()) {
        return res.status(400).json({ message: "Nome de delegação é obrigatório" });
      }
      
      // @ts-ignore
      if (username !== req.user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ message: "Nome de delegação já está em uso" });
        }
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

  // Rotas de Admin/Trending/Suggested/Comments/Reposts (sem alterações)
  app.delete("/api/admin/tweets/:id", async (req, res) => { /* ...código original... */ });
  app.get("/api/admin/users", async (req, res) => { /* ...código original... */ });
  app.get("/api/trending", async (req, res) => { /* ...código original... */ });
  app.get("/api/users/suggested", async (req, res) => { /* ...código original... */ });
  app.post("/api/tweets/:id/comments", async (req, res) => { /* ...código original... */ });
  app.post('/api/tweets/:id/repost', async (req, res) => { /* ...código original... */ });
  app.delete('/api/tweets/:id/repost', async (req, res) => { /* ...código original... */ });
  app.get('/api/tweets/:id/comments', async (req, res) => { /* ...código original... */ });

  const httpServer = createServer(app);
  return httpServer;
}