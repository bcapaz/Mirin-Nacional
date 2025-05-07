import { db } from "@db";
import { users, tweets, likes, comments, reposts } from "@shared/schema";
import { eq, and, desc, sql, ne, isNull } from "drizzle-orm";
import { insertUserSchema } from "@shared/schema";
import { type InsertUser, type User, type Tweet, type Like, type TweetWithUser, type CommentWithUser, type RepostWithUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUser(id: number, data: { username?: string; bio?: string; profileImage?: string }): Promise<User>;
  getRandomUsers(excludeUserId: number, limit: number): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  
  // Tweet operations
  getAllTweets(currentUserId: number): Promise<TweetWithUser[]>;
  getUserTweets(userId: number, currentUserId: number): Promise<TweetWithUser[]>;
  createTweet(tweet: { content: string; userId: number; mediaUrl?: string | null }): Promise<Tweet>;
  getTweetById(id: number): Promise<Tweet | undefined>;
  deleteTweet(id: number): Promise<void>;
  
  // Like operations
  createLike(like: { userId: number; tweetId: number }): Promise<Like>;
  deleteLike(userId: number, tweetId: number): Promise<void>;
  getLike(userId: number, tweetId: number): Promise<Like | undefined>;
  
  // Comment operations
  createComment(comment: { content: string; userId: number; tweetId: number; mediaUrl?: string | null }): Promise<Tweet>;
  getComments(tweetId: number, currentUserId?: number): Promise<CommentWithUser[]>;
  
  // Repost operations
  createRepost(repost: { userId: number; tweetId: number }): Promise<Repost>;
  getReposts(tweetId: number): Promise<RepostWithUser[]>;
  getRepost(userId: number, tweetId: number): Promise<Repost | undefined>;
  
  // Session store
  sessionStore: session.Store;
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

  /* User Operations */
  async createUser(user: InsertUser): Promise<User> {
    const validatedData = insertUserSchema.parse(user);
    const [newUser] = await db.insert(users).values(validatedData).returning();
    return newUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    return result;
  }

  async updateUser(id: number, data: { username?: string; bio?: string; profileImage?: string }): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({
        username: data.username,
        bio: data.bio,
        profileImage: data.profileImage,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async getRandomUsers(excludeUserId: number, limit: number): Promise<User[]> {
    const result = await db.select()
      .from(users)
      .where(ne(users.id, excludeUserId))
      .orderBy(sql`random()`)
      .limit(limit);
    
    return result;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select()
      .from(users)
      .orderBy(users.username);
    return result;
  }

  /* Tweet Operations */
  async getAllTweets(currentUserId: number): Promise<TweetWithUser[]> {
    const result = await db.select({
      id: tweets.id,
      content: tweets.content,
      userId: tweets.userId,
      mediaUrl: tweets.mediaUrl,
      createdAt: tweets.createdAt,
      parentId: tweets.parentId,
      isComment: tweets.isComment,
      user: users,
      likeCount: sql<number>`(
        SELECT COUNT(*) FROM ${likes} 
        WHERE ${likes.tweetId} = ${tweets.id}
      )`.mapWith(Number),
      isLiked: sql<boolean>`EXISTS(
        SELECT 1 FROM ${likes} 
        WHERE ${likes.tweetId} = ${tweets.id} AND ${likes.userId} = ${currentUserId}
      )`.mapWith(Boolean),
      commentCount: sql<number>`(
        SELECT COUNT(*) FROM ${tweets} as comments
        WHERE comments.parentId = ${tweets.id}
      )`.mapWith(Number),
      repostCount: sql<number>`(
        SELECT COUNT(*) FROM ${reposts}
        WHERE ${reposts.tweetId} = ${tweets.id}
      )`.mapWith(Number)
    })
    .from(tweets)
    .leftJoin(users, eq(tweets.userId, users.id))
    .where(isNull(tweets.parentId)) // Exclui comentários
    .orderBy(desc(tweets.createdAt));
    
    return result;
  }

  async getUserTweets(userId: number, currentUserId: number): Promise<TweetWithUser[]> {
    const result = await db.select({
      id: tweets.id,
      content: tweets.content,
      userId: tweets.userId,
      mediaUrl: tweets.mediaUrl,
      createdAt: tweets.createdAt,
      parentId: tweets.parentId,
      isComment: tweets.isComment,
      user: users,
      likeCount: sql<number>`(
        SELECT COUNT(*) FROM ${likes} 
        WHERE ${likes.tweetId} = ${tweets.id}
      )`.mapWith(Number),
      isLiked: sql<boolean>`EXISTS(
        SELECT 1 FROM ${likes} 
        WHERE ${likes.tweetId} = ${tweets.id} AND ${likes.userId} = ${currentUserId}
      )`.mapWith(Boolean),
      commentCount: sql<number>`(
        SELECT COUNT(*) FROM ${tweets} as comments
        WHERE comments.parentId = ${tweets.id}
      )`.mapWith(Number),
      repostCount: sql<number>`(
        SELECT COUNT(*) FROM ${reposts}
        WHERE ${reposts.tweetId} = ${tweets.id}
      )`.mapWith(Number)
    })
    .from(tweets)
    .leftJoin(users, eq(tweets.userId, users.id))
    .where(and(
      eq(tweets.userId, userId),
      isNull(tweets.parentId) // Exclui comentários
    ))
    .orderBy(desc(tweets.createdAt));
    
    return result;
  }

  async createTweet(tweet: { content: string; userId: number; mediaUrl?: string | null }): Promise<Tweet> {
    const [newTweet] = await db.insert(tweets).values({
      ...tweet,
      createdAt: new Date(),
      likeCount: 0
    }).returning();
    return newTweet;
  }

  async getTweetById(id: number): Promise<Tweet | undefined> {
    const result = await db.query.tweets.findFirst({
      where: eq(tweets.id, id)
    });
    return result;
  }

  async deleteTweet(id: number): Promise<void> {
    // Primeiro, excluir todas as curtidas e reposts relacionados
    await db.delete(likes).where(eq(likes.tweetId, id));
    await db.delete(reposts).where(eq(reposts.tweetId, id)));
    
    // Depois, excluir o tweet e quaisquer comentários associados
    await db.delete(tweets).where(
      or(
        eq(tweets.id, id)),
        eq(tweets.parentId, id)
      )
    );
  }

  /* Like Operations */
  async createLike(like: { userId: number; tweetId: number }): Promise<Like> {
    const [newLike] = await db.insert(likes).values(like).returning();
    
    // Atualiza a contagem de likes no tweet
    await db.update(tweets)
      .set({
        likeCount: sql`${tweets.likeCount} + 1`
      })
      .where(eq(tweets.id, like.tweetId)));
    
    return newLike;
  }

  async deleteLike(userId: number, tweetId: number): Promise<void> {
    await db.delete(likes)
      .where(
        and(
          eq(likes.userId, userId)),
          eq(likes.tweetId, tweetId)
        )
      );
    
    // Atualiza a contagem de likes no tweet
    await db.update(tweets)
      .set({
        likeCount: sql`${tweets.likeCount} - 1`
      })
      .where(eq(tweets.id, tweetId)));
  }

  async getLike(userId: number, tweetId: number): Promise<Like | undefined> {
    const result = await db.query.likes.findFirst({
      where: and(
        eq(likes.userId, userId)),
        eq(likes.tweetId, tweetId)
      )
    });
    return result;
  }

  /* Comment Operations */
  async createComment(comment: { 
    content: string; 
    userId: number; 
    tweetId: number;
    mediaUrl?: string | null 
  }): Promise<Tweet> {
    const [newComment] = await db.insert(tweets).values({
      content: comment.content,
      userId: comment.userId,
      parentId: comment.tweetId,
      isComment: true,
      mediaUrl: comment.mediaUrl || null,
      createdAt: new Date(),
      likeCount: 0
    }).returning();
    
    return newComment;
  }

  async getComments(tweetId: number, currentUserId?: number): Promise<CommentWithUser[]> {
    const result = await db.select({
      id: tweets.id,
      content: tweets.content,
      userId: tweets.userId,
      mediaUrl: tweets.mediaUrl,
      createdAt: tweets.createdAt,
      parentId: tweets.parentId,
      isComment: tweets.isComment,
      user: users,
      likeCount: sql<number>`(
        SELECT COUNT(*) FROM ${likes} 
        WHERE ${likes.tweetId} = ${tweets.id}
      )`.mapWith(Number),
      isLiked: currentUserId ? sql<boolean>`EXISTS(
        SELECT 1 FROM ${likes} 
        WHERE ${likes.tweetId} = ${tweets.id} AND ${likes.userId} = ${currentUserId}
      )`.mapWith(Boolean) : sql<boolean>`false`.mapWith(Boolean)
    })
    .from(tweets)
    .leftJoin(users, eq(tweets.userId, users.id))
    .where(eq(tweets.parentId, tweetId))
    .orderBy(desc(tweets.createdAt));
    
    return result;
  }

  /* Repost Operations */
  async createRepost(repost: { userId: number; tweetId: number }): Promise<Repost> {
    const [newRepost] = await db.insert(reposts).values({
      ...repost,
      createdAt: new Date()
    }).returning();
    
    return newRepost;
  }

  async getReposts(tweetId: number): Promise<RepostWithUser[]> {
    const result = await db.select({
      repost: reposts,
      user: users
    })
    .from(reposts)
    .leftJoin(users, eq(reposts.userId, users.id))
    .where(eq(reposts.tweetId, tweetId))
    .orderBy(desc(reposts.createdAt));
    
    return result.map(row => ({
      ...row.repost,
      user: row.user
    }));
  }

  async getRepost(userId: number, tweetId: number): Promise<Repost | undefined> {
    const result = await db.query.reposts.findFirst({
      where: and(
        eq(reposts.userId, userId)),
        eq(reposts.tweetId, tweetId)
      )
    });
    return result;
  }
}

export const storage = new DatabaseStorage();