import { Router } from 'express';
import {
  loginWeb,
  logout,
  registerWeb,
  requestPasswordResetWeb,
  resetPasswordWeb,
  verifyEmail
} from '../controllers/auth.controller';
import { addCommentToPostWeb, createForumPostWeb } from '../controllers/forum.controller';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  renderCatalog,
  renderCheckout,
  renderForum,
  renderHome,
  renderLogin,
  renderMyOrders,
  renderOrderConfirm,
  renderRegister
} from '../controllers/view.controller';

export const viewRouter = Router();

viewRouter.get('/', renderHome);
viewRouter.get('/catalogo', renderCatalog);
viewRouter.get('/foro', renderForum);
viewRouter.get('/checkout', renderCheckout);
viewRouter.get('/mis-pedidos', authMiddleware, renderMyOrders);
viewRouter.get('/pedido/:orderId', authMiddleware, renderOrderConfirm);
viewRouter.get('/login', renderLogin);
viewRouter.get('/registro', renderRegister);
viewRouter.get('/verify-email', verifyEmail);
viewRouter.get('/forgot-password', requestPasswordResetWeb);
viewRouter.post('/forgot-password', requestPasswordResetWeb);
viewRouter.get('/reset-password', resetPasswordWeb);
viewRouter.post('/reset-password', resetPasswordWeb);
viewRouter.post('/login', loginWeb);
viewRouter.post('/registro', registerWeb);
viewRouter.post('/foro', authMiddleware, createForumPostWeb);
viewRouter.post('/foro/:postId/comentario', authMiddleware, addCommentToPostWeb);
viewRouter.post('/logout', logout);
