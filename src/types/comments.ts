/**
 * Comment Types
 * Contains type definitions for comments and related structures
 */

import { AuthUser } from "./auth";

/**
 * Base Comment interface matching the Prisma schema
 */
export interface Comment {
  id: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  ideaId: string;
  authorId: string;
  parentId: string | null;
}

/**
 * Comment with author information
 */
export interface CommentWithAuthor extends Comment {
  author: AuthUser;
}

/**
 * Comment with likes count or likes array
 */
export interface CommentWithLikes extends Comment {
  likes: number | any[];
}

/**
 * Comment with nested reply structure
 */
export interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[];
  subReplies?: CommentWithReplies[];
}

/**
 * Fully populated comment with all related data
 */
export interface FullComment extends Comment {
  author?: AuthUser;
  likes: number | any[];
  replies: FullComment[];
  subReplies?: FullComment[];
  [key: string]: any; // For any additional properties from Prisma
}

/**
 * Comment tree structure for nested comments
 */
export interface CommentTree {
  rootComments: FullComment[];
  commentMap: Record<string, FullComment>;
  totalCount: number;
}

/**
 * Comment creation payload
 */
export interface CreateCommentPayload {
  content: string;
  parentId?: string | null;
}
