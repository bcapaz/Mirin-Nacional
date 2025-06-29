import { db } from "@db";
// [MODIFICADO] Adicionamos 'reposts' e os tipos 'Repost' e 'Comment' que faltavam na importação
import { users, tweets, likes, reposts, type Comment, type Repost } from "@shared/schema";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import { insertUserSchema } from "@shared/schema";
import { type InsertUser, type User, type Tweet, type Like, type TweetWithUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";

// [MODIFICADO] Atualizamos a interface para refletir as novas funções
export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUser(id: number, data: { username?: string; bio?: string; profileImage?: string }): Promise<User>;
  getAllTweets(currentUserId: number): Promise<TweetWithUser[]>;
  getUserTweets(userId: number, currentUserId: number): Promise<TweetWithUser[]>;
  createTweet(tweet: { content: string; userId: number; mediaUrl?: string | null }): Promise<Tweet>;
  getTweetById(id: number): Promise<Tweet | undefined>;
  deleteTweet(id: number): Promise<void>;
  createLike(like: { userId: number; tweetId: number }): Promise<Like>;
  deleteLike(userId: number, tweetId: number): Promise<void>;
  getLike(userId: number, tweetId: number): Promise<Like | undefined>;
  getRandomUsers(excludeUserId: number, limit: number): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  sessionStore: session.Store;
  createComment(comment: { content: string; userId: number; tweetId: number }): Promise<Comment>;
  getComments(tweetId: number): Promise<(Comment & { user: User })[]>;

  // Funções de Repost
  getRepost(userId: number, tweetId: number): Promise<Repost | undefined>;
  createRepost(userId: number, tweetId: number): Promise<void>;
  deleteRepost(userId: number, tweetId: number): Promise<void>;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true
    });
  }

  // --- NENHUMA MUDANÇA NAS FUNÇÕES DE USER ---
  async createUser(user: InsertUser): Promise<User> { /* ... seu código original ... */ }
  async getUser(id: number): Promise<User | undefined> { /* ... seu código original ... */ }
  async getUserByUsername(username: string): Promise<User | undefined> { /* ... seu código original ... */ }
  async updateUser(id: number, data: { username?: string; bio?: string; profileImage?: string }): Promise<User> { /* ... seu código original ... */ }
  async getRandomUsers(excludeUserId: number, limit: number): Promise<User[]> { /* ... seu código original ... */ }
  async getAllUsers(): Promise<User[]> { /* ... seu código original ... */ }

  // --- [MODIFICADO] GET ALL TWEETS ---
  async getAllTweets(currentUserId: number): Promise<TweetWithUser[]> {
    const result = await db.select({
      id: tweets.id,
      content: tweets.content,
      userId: tweets.userId,
      mediaUrl: tweets.mediaUrl,
      createdAt: tweets.createdAt,
      user: users,
      likeCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.tweetId} = ${tweets.id})`.mapWith(Number),
      commentCount: sql<number>`(SELECT COUNT(*) FROM ${tweets} AS comments WHERE comments.parent_id = ${tweets.id})`.mapWith(Number),
      // Adicionamos a contagem de reposts diretamente da coluna que criamos
      repostCount: tweets.repostCount,
      // Adicionamos a verificação se o usuário atual curtiu
      isLiked: sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.tweetId} = ${tweets.id} AND ${likes.userId} = ${currentUserId})`.mapWith(Boolean),
      // Adicionamos a verificação se o usuário atual repostou
      isReposted: sql<boolean>`EXISTS(SELECT 1 FROM ${reposts} WHERE ${reposts.tweetId} = ${tweets.id} AND ${reposts.userId} = ${currentUserId})`.mapWith(Boolean),
    })
    .from(tweets)
    .where(sql`${tweets.isComment} IS NOT TRUE`)
    .innerJoin(users, eq(tweets.userId, users.id))
    .groupBy(tweets.id, users.id)
    .orderBy(desc(tweets.createdAt));

    return result as unknown as TweetWithUser[];
  }

  // --- [MODIFICADO] GET USER TWEETS ---
  async getUserTweets(userId: number, currentUserId: number): Promise<TweetWithUser[]> {
    // A lógica para pegar os tweets e reposts de um usuário é mais complexa e
    // podemos implementar depois. Por enquanto, vamos apenas garantir que os reposts apareçam corretamente.
    // Esta query agora inclui os dados de like e repost.
    const userTweets = await db.select({
        id: tweets.id,
        content: tweets.content,
        userId: tweets.userId,
        mediaUrl: tweets.mediaUrl,
        createdAt: tweets.createdAt,
        user: users,
        likeCount: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.tweetId} = ${tweets.id})`.mapWith(Number),
        commentCount: sql<number>`(SELECT COUNT(*) FROM ${tweets} AS comments WHERE comments.parent_id = ${tweets.id})`.mapWith(Number),
        repostCount: tweets.repostCount,
        isLiked: sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.tweetId} = ${tweets.id} AND ${likes.userId} = ${currentUserId})`.mapWith(Boolean),
        isReposted: sql<boolean>`EXISTS(SELECT 1 FROM ${reposts} WHERE ${reposts.tweetId} = ${tweets.id} AND ${reposts.userId} = ${currentUserId})`.mapWith(Boolean),
      })
      .from(tweets)
      .innerJoin(users, eq(tweets.userId, users.id))
      .where(and(eq(tweets.userId, userId), sql`${tweets.isComment} IS NOT TRUE`))
      .groupBy(tweets.id, users.id)
      .orderBy(desc(tweets.createdAt));
      
    return userTweets as unknown as TweetWithUser[];
  }

  // --- NENHUMA MUDANÇA NAS FUNÇÕES DE TWEET E LIKE ---
  async createTweet(tweet: { /*...*/ }): Promise<Tweet> { /* ... seu código original ... */ }
  async getTweetById(id: number): Promise<Tweet | undefined> { /* ... seu código original ... */ }
  async deleteTweet(id: number): Promise<void> { /* ... seu código original ... */ }
  async createLike(like: { userId: number; tweetId: number }): Promise<Like> { /* ... seu código original ... */ }
  async deleteLike(userId: number, tweetId: number): Promise<void> { /* ... seu código original ... */ }
  async getLike(userId: number, tweetId: number): Promise<Like | undefined> { /* ... seu código original ... */ }
  
  // --- NENHUMA MUDANÇA NAS FUNÇÕES DE COMENTÁRIO ---
  async createComment(comment: { /*...*/ }): Promise<Tweet> { /* ... seu código original ... */ }
  async getComments(tweetId: number): Promise<TweetWithUser[]> { /* ... seu código original ... */ }
  
  // --- [ADICIONADO] NOVAS FUNÇÕES DE REPOST ---
  async getRepost(userId: number, tweetId: number): Promise<Repost | undefined> {
    return await db.query.reposts.findFirst({
      where: and(eq(reposts.userId, userId), eq(reposts.tweetId, tweetId)),
    });
  }

  // [MODIFICADO] createRepost agora atualiza o contador
  async createRepost(userId: number, tweetId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(reposts).values({ userId, tweetId });
      await tx
        .update(tweets)
        .set({ repostCount: sql`${tweets.repostCount} + 1` })
        .where(eq(tweets.id, tweetId));
    });
  }

  // [ADICIONADO] deleteRepost para remover e atualizar o contador
  async deleteRepost(userId: number, tweetId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .delete(reposts)
        .where(and(eq(reposts.userId, userId), eq(reposts.tweetId, tweetId)));
      await tx
        .update(tweets)
        .set({ repostCount: sql`${tweets.repostCount} - 1` })
        .where(eq(tweets.id, tweetId));
    });
  }
}

export const storage = new DatabaseStorage();