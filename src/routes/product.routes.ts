import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getFeaturedProducts,
  getProducts
} from '../controllers/product.controller';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';

export const productRouter = Router();

productRouter.get('/', getProducts);
productRouter.get('/featured', getFeaturedProducts);
productRouter.post('/', authMiddleware, adminMiddleware, createProduct);
productRouter.delete('/:productId', authMiddleware, adminMiddleware, deleteProduct);
