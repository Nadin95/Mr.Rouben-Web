import { Router } from 'express';
import {
  approvePaymentFromAdmin,
  createProductFromAdmin,
  deleteProductFromAdmin,
  getAdminDashboard,
  updateHomeCarouselFromAdmin,
  updateInventory,
  updateInventoryFromAdmin,
  validatePayment
} from '../controllers/admin.controller';
import { approveForumPostFromAdmin } from '../controllers/forum.controller';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadProductImage } from '../middlewares/uploadProductImage';

export const adminRouter = Router();

adminRouter.use(authMiddleware, adminMiddleware);

adminRouter.get('/', getAdminDashboard);
adminRouter.patch('/inventory/:productId', updateInventory);
adminRouter.patch('/payments/:orderId/validate', validatePayment);
adminRouter.post('/catalog/add', uploadProductImage.single('imageFile'), createProductFromAdmin);
adminRouter.post(
  '/home-carousel',
  uploadProductImage.fields([
    { name: 'tabacoImageFile', maxCount: 1 },
    { name: 'vapersImageFile', maxCount: 1 },
    { name: 'parafernaliaImageFile', maxCount: 1 }
  ]),
  updateHomeCarouselFromAdmin
);
adminRouter.post('/catalog/:productId/delete', deleteProductFromAdmin);
adminRouter.post('/inventory/:productId', uploadProductImage.single('inventoryImageFile'), updateInventoryFromAdmin);
adminRouter.post('/payments/:orderId/approve', approvePaymentFromAdmin);
adminRouter.post('/forum/:postId/approve', approveForumPostFromAdmin);
