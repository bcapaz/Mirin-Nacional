import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // Now represents "Nome de Delegação"
  password: text("password").notNull(),
  name: text("name").notNull(), // Full name (hidden from public)
  bio: text("bio"), // Optional user biography
  profileImage: text("profile_image"), // URL to profile image
  avatarColor: text("avatar_color").notNull().default("#009c3b"), // Default to brazil-green
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const tweets = pgTable("tweets", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  mediaUrl: text("media_url"), // URL to media (image/video)
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
  parentId: integer("parent_id").references(() => tweets.id), // Para comentários hierárquicos
  isComment: boolean("is_comment").default(false) // Identifica se é um comentário
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tweetId: integer("tweet_id").references(() => tweets.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tweets: many(tweets),
  likes: many(likes)
}));

export const tweetsRelations = relations(tweets, ({ one, many }) => ({
  user: one(users, { fields: [tweets.userId], references: [users.id] }),
  likes: many(likes)
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  tweet: one(tweets, { fields: [likes.tweetId], references: [tweets.id] })
}));

// Schemas
export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Nome de Delegação deve ter pelo menos 3 caracteres"),
  password: (schema) => schema.min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: (schema) => schema.min(2, "Nome completo deve ter pelo menos 2 caracteres"),
}).omit({ id: true, createdAt: true, isAdmin: true, bio: true, profileImage: true });

export const updateUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Nome de Delegação deve ter pelo menos 3 caracteres"),
  bio: (schema) => schema.optional(),
  profileImage: (schema) => schema.optional(),
}).omit({ id: true, createdAt: true, isAdmin: true, password: true, name: true });

export const insertTweetSchema = createInsertSchema(tweets, {
  content: (schema) => schema.max(280, "Tweet deve ter menos de 280 caracteres")
}).omit({ id: true, createdAt: true, mediaUrl: true });

export const insertLikeSchema = createInsertSchema(likes).omit({ id: true, createdAt: true });

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tweetId: integer("tweet_id").references(() => tweets.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const reposts = pgTable("reposts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tweetId: integer("tweet_id").references(() => tweets.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Adicione as relações
export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  tweet: one(tweets, { fields: [comments.tweetId], references: [tweets.id] })
}));

export const repostsRelations = relations(reposts, ({ one }) => ({
  user: one(users, { fields: [reposts.userId], references: [users.id] }),
  tweet: one(tweets, { fields: [reposts.tweetId], references: [tweets.id] })
}));

export type Comment = typeof comments.$inferSelect;
export type Repost = typeof reposts.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type Tweet = typeof tweets.$inferSelect;
export type Like = typeof likes.$inferSelect;

export type TweetWithUser = Tweet & { user: User, likeCount: number, isLiked?: boolean };
