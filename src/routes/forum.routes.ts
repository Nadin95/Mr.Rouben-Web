import { Router } from 'express';
import {
  addCommentToPost,
  createForumPost,
  getForumPosts
} from '../controllers/forum.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

export const forumRouter = Router();

forumRouter.get('/', getForumPosts);
forumRouter.post('/', authMiddleware, createForumPost);
forumRouter.post('/:postId/comments', authMiddleware, addCommentToPost);
