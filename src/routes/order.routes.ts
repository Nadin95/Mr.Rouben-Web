import { Router } from 'express';
import { createOrder, uploadProof } from '../controllers/order.controller';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadPaymentProof } from '../middlewares/uploadProductImage';

export const orderRouter = Router();

orderRouter.post('/', authMiddleware, createOrder);
orderRouter.post('/:orderId/proof', authMiddleware, uploadPaymentProof.single('proofFile'), uploadProof);
