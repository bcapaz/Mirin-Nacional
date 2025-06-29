import { db } from "@db";
import { users, tweets, likes, reposts, type Comment, type Repost } from "@shared/schema";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import { insertUserSchema } from "@shared/schema";
import { type InsertUser, type User, type Tweet, type Like, type TweetWithUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";

// [CORRIGIDO] Interface agora corresponde 100% à implementação da classe
export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUser(id: number, data: { username?: string; bio?: string; profileImage?: string }): Promise<User>;
  getAllTweets(currentUserId: number): Promise<TweetWithUser[]>;
  getUserTweets(userId: number, currentUserId: number): Promise<TweetWithUser[]>;
  createTweet(tweet: { content: string; userId: number; mediaUrl?: string | null; parentId?: number; isComment?: boolean; }): Promise<Tweet>;
  getTweetById(id: number): Promise<Tweet | undefined>;
  deleteTweet(id: number): Promise<void>;
  createLike(like: { userId: number; tweetId: number }): Promise<Like>;
  deleteLike(userId: number, tweetId: number): Promise<void>;
  getLike(userId: number, tweetId: number): Promise<Like | undefined>;
  getRandomUsers(excludeUserId: number, limit: number): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  sessionStore: session.Store;
  createComment(comment: { content: string; userId: number; tweetId: number }): Promise<Tweet>;
  getComments(tweetId: number): Promise<TweetWithUser[]>;
  
  // Funções de Repost
  getRepost(userId: number, tweetId: number): Promise<Repost | undefined>;
  createRepost(userId: number, tweetId: number): Promise<void>;
  deleteRepost(userId: number, tweetId: number): Promise<void>;
  getReposts(tweetId: number): Promise<(Repost & { user: User | null })[]>; // Corrigido para corresponder à implementação
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

  async createUser(user: InsertUser): Promise<User> {
    const validatedData = insertUserSchema.parse(user);
    const [newUser] = await db.insert(users).values(validatedData).returning();
    return newUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    return await db.query.users.findFirst({ where: eq(users.id, id) });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await db.query.users.findFirst({ where: eq(users.username, username) });
  }

  async updateUser(id: number, data: { username?: string; bio?: string; profileImage?: string }): Promise<User> {
    const [updatedUser] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updatedUser;
  }

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
      repostCount: tweets.repostCount,
      isLiked: sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.tweetId} = ${tweets.id} AND ${likes.userId} = ${currentUserId})`.mapWith(Boolean),
      isReposted: sql<boolean>`EXISTS(SELECT 1 FROM ${reposts} WHERE ${reposts.tweetId} = ${tweets.id} AND ${reposts.userId} = ${currentUserId})`.mapWith(Boolean),
    })
    .from(tweets)
    .where(sql`${tweets.isComment} IS NOT TRUE`)
    .innerJoin(users, eq(tweets.userId, users.id))
    .groupBy(tweets.id, users.id)
    .orderBy(desc(tweets.createdAt));
    return result as unknown as TweetWithUser[];
  }

  async getUserTweets(userId: number, currentUserId: number): Promise<TweetWithUser[]> {
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

  async createTweet(tweet: { content: string; userId: number; mediaUrl?: string | null; parentId?: number; isComment?: boolean; }): Promise<Tweet> {
    const [newTweet] = await db.insert(tweets).values(tweet).returning();
    return newTweet;
  }

  async getTweetById(id: number): Promise<Tweet | undefined> {
    return await db.query.tweets.findFirst({ where: eq(tweets.id, id) });
  }

  async deleteTweet(id: number): Promise<void> {
    await db.delete(likes).where(eq(likes.tweetId, id));
    await db.delete(reposts).where(eq(reposts.tweetId, id)); // Também deletar reposts
    await db.delete(tweets).where(eq(tweets.parentId, id)); // Deletar comentários/respostas
    await db.delete(tweets).where(eq(tweets.id, id)); // Deletar o tweet principal
  }

  async createLike(like: { userId: number; tweetId: number }): Promise<Like> {
    const [newLike] = await db.insert(likes).values(like).returning();
    return newLike;
  }

  async deleteLike(userId: number, tweetId: number): Promise<void> {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.tweetId, tweetId)));
  }

  async getLike(userId: number, tweetId: number): Promise<Like | undefined> {
    return await db.query.likes.findFirst({
      where: and(eq(likes.userId, userId), eq(likes.tweetId, tweetId))
    });
  }

  async getRandomUsers(excludeUserId: number, limit: number): Promise<User[]> {
    return await db.select().from(users).where(ne(users.id, excludeUserId)).limit(limit);
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
  }

  async createComment(comment: { content: string; userId: number; tweetId: number; }): Promise<Tweet> {
    const [newComment] = await db.insert(tweets).values({
      content: comment.content,
      userId: comment.userId,
      parentId: comment.tweetId,
      isComment: true,
      createdAt: new Date(),
      likeCount: 0
    }).returning();
    return newComment;
  }

  async getComments(tweetId: number): Promise<TweetWithUser[]> {
    const result = await db.query.tweets.findMany({
      where: (tweets, { eq }) => eq(tweets.parentId, tweetId),
      with: {
        user: {
          columns: { id: true, username: true, profileImage: true, avatarColor: true }
        }
      },
      orderBy: (tweets, { desc }) => [desc(tweets.createdAt)]
    });
    return result.map(tweet => ({
      ...tweet, isLiked: false, likeCount: tweet.likeCount || 0
    }));
  }

  // --- FUNÇÕES DE REPOST IMPLEMENTADAS ---

  async getRepost(userId: number, tweetId: number): Promise<Repost | undefined> {
    return await db.query.reposts.findFirst({
      where: and(eq(reposts.userId, userId), eq(reposts.tweetId, tweetId)),
    });
  }

  async createRepost(userId: number, tweetId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(reposts).values({ userId, tweetId });
      await tx
        .update(tweets)
        .set({ repostCount: sql`${tweets.repostCount} + 1` })
        .where(eq(tweets.id, tweetId));
    });
  }

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

  async getReposts(tweetId: number): Promise<(Repost & { user: User | null })[]> {
    return await db.query.reposts.findMany({
        where: eq(reposts.tweetId, tweetId),
        with: { user: true },
        orderBy: desc(reposts.createdAt)
    });
  }
}

export const storage = new DatabaseStorage();