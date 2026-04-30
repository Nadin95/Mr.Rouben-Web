import { Request, Response } from 'express';
import { ForumPost } from '../models/ForumPost';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { whatsappService } from '../services/whatsapp.service';
import { AuthenticatedRequest } from '../types/auth';

export const getForumPosts = async (_req: Request, res: Response): Promise<Response> => {
  const posts = await ForumPost.find({ approvalStatus: 'approved' })
    .populate('author', 'username')
    .populate('productRef', 'name category')
    .populate('comments.author', 'username')
    .sort({ createdAt: -1 });

  return res.status(200).json(posts);
};

export const createForumPost = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const { title, content, categoryTag, productId } = req.body;

  const product = await Product.findById(productId).select('name category');
  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  if (String(categoryTag) !== String(product.category)) {
    return res.status(400).json({ message: 'La categoría no coincide con el producto seleccionado' });
  }

  const user = await User.findById(req.user.id).select('username');

  const post = await ForumPost.create({
    title,
    content,
    categoryTag,
    productRef: product._id,
    productNameSnapshot: product.name,
    author: req.user.id,
    approvalStatus: 'pending',
    approvedByAdmin: false
  });

  whatsappService
    .notifyAdminForumRequest({
      postId: post._id.toString(),
      categoryTag: String(categoryTag),
      productName: product.name,
      username: user?.username || 'Usuario'
    })
    .catch(() => undefined);

  return res.status(201).json(post);
};

export const createForumPostWeb = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.redirect('/login');
    return;
  }

  const { title, content, categoryTag, productId } = req.body;

  if (!title || !content || !categoryTag || !productId) {
    res.redirect('/foro?error=Completa%20titulo,%20categoria,%20producto%20y%20mensaje');
    return;
  }

  const product = await Product.findById(productId).select('name category');
  if (!product) {
    res.redirect('/foro?error=Producto%20no%20encontrado');
    return;
  }

  if (String(categoryTag) !== String(product.category)) {
    res.redirect('/foro?error=La%20categoria%20no%20coincide%20con%20el%20producto');
    return;
  }

  const user = await User.findById(req.user.id).select('username');

  const post = await ForumPost.create({
    title: String(title).trim(),
    content: String(content).trim(),
    categoryTag: String(categoryTag),
    productRef: product._id,
    productNameSnapshot: product.name,
    author: req.user.id,
    approvalStatus: 'pending',
    approvedByAdmin: false
  });

  whatsappService
    .notifyAdminForumRequest({
      postId: post._id.toString(),
      categoryTag: String(categoryTag),
      productName: product.name,
      username: user?.username || 'Usuario'
    })
    .catch(() => undefined);

  res.redirect('/foro?notice=Solicitud%20enviada.%20El%20admin%20debe%20habilitar%20el%20chat');
};

export const addCommentToPost = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const { postId } = req.params;
  const { content } = req.body;

  const post = await ForumPost.findById(postId);

  if (!post) {
    return res.status(404).json({ message: 'Post no encontrado' });
  }

  if (post.approvalStatus !== 'approved') {
    return res.status(403).json({ message: 'El chat aun no fue habilitado por admin' });
  }

  post.comments.push({
    author: req.user.id as any,
    content,
    createdAt: new Date()
  });

  await post.save();

  return res.status(200).json({ message: 'Comentario agregado', post });
};

export const addCommentToPostWeb = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.redirect('/login');
    return;
  }

  const { postId } = req.params;
  const content = String(req.body.content || '').trim();

  if (content.length < 2) {
    res.redirect('/foro?error=El%20comentario%20es%20muy%20corto');
    return;
  }

  const post = await ForumPost.findById(postId);

  if (!post) {
    res.redirect('/foro?error=Conversacion%20no%20encontrada');
    return;
  }

  if (post.approvalStatus !== 'approved') {
    res.redirect('/foro?error=Esa%20conversacion%20aun%20no%20esta%20habilitada');
    return;
  }

  post.comments.push({
    author: req.user.id as any,
    content,
    createdAt: new Date()
  });

  await post.save();
  res.redirect('/foro?notice=Comentario%20publicado');
};

export const approveForumPostFromAdmin = async (req: Request, res: Response): Promise<void> => {
  const { postId } = req.params;

  await ForumPost.findByIdAndUpdate(postId, {
    approvalStatus: 'approved',
    approvedByAdmin: true
  });

  res.redirect('/admin');
};
