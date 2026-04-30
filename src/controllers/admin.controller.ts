import { Request, Response } from 'express';
import { ForumPost } from '../models/ForumPost';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { SiteConfig } from '../models/SiteConfig';
import { sendCatalogUpdateEmails } from '../services/notification.service';
import { clearViewCache } from './view.controller';
import { whatsappService } from '../services/whatsapp.service';

const getMainSiteConfig = async () => {
  let siteConfig = await SiteConfig.findOne({ key: 'main' });

  if (!siteConfig) {
    siteConfig = await SiteConfig.create({
      key: 'main',
      homeCarousel: {
        tabacoImageUrl: '',
        vapersImageUrl: '',
        parafernaliaImageUrl: ''
      }
    });
  }

  return siteConfig;
};

export const getAdminDashboard = async (_req: Request, res: Response): Promise<void> => {
  const [products, ordersPendingValidation, forumPendingApproval, siteConfig] = await Promise.all([
    Product.find()
      .select('name category price imageUrl isAvailable stock')
      .sort({ createdAt: -1 })
      .lean(),
    Order.find({ status: { $in: ['pending_payment', 'whatsapp_pending_validation'] } })
      .select('user total status deliveryMethod deliveryAddress customerPhone paymentProofUrl createdAt')
      .populate({ path: 'user', select: 'username email', options: { lean: true } })
      .sort({ createdAt: -1 })
      .lean(),
    ForumPost.find({ approvalStatus: 'pending' })
      .select('title categoryTag productNameSnapshot author createdAt')
      .populate({ path: 'author', select: 'username', options: { lean: true } })
      .sort({ createdAt: -1 })
      .lean(),
    getMainSiteConfig()
  ]);

  res.render('pages/admin', {
    title: 'Panel de Administración',
    products,
    ordersPendingValidation,
    forumPendingApproval,
    homeCarousel: siteConfig.homeCarousel
  });
};

export const updateInventory = async (req: Request, res: Response): Promise<Response> => {
  const { productId } = req.params;
  const { stock } = req.body;

  const numericStock = Number(stock);

  if (Number.isNaN(numericStock) || numericStock < 0) {
    return res.status(400).json({ message: 'Stock inválido' });
  }

  const existing = await Product.findById(productId);
  if (!existing) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    {
      stock: numericStock,
      isAvailable: numericStock > 0
    },
    { new: true }
  );

  if (existing.stock <= 0 && numericStock > 0 && product) {
    await sendCatalogUpdateEmails(product, 'restock');
  }

  return res.status(200).json({ message: 'Inventario actualizado', product });
};

export const validatePayment = async (req: Request, res: Response): Promise<Response> => {
  const { orderId } = req.params;

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      status: 'approved',
      validatedByAdmin: true
    },
    { new: true }
  );

  if (!order) {
    return res.status(404).json({ message: 'Orden no encontrada' });
  }

  await whatsappService.sendPaymentApprovedToCustomer(order);

  return res.status(200).json({ message: 'Pago validado', order });
};

const resolveUploadUrl = (file?: Express.Multer.File): string => {
  if (!file) return '';
  // Cloudinary sets file.path to the full https URL
  if (file.path && file.path.startsWith('http')) return file.path;
  return `/uploads/${file.filename}`;
};

export const createProductFromAdmin = async (req: Request, res: Response): Promise<void> => {
  const { name, description, category, price, stock, isFeatured, imageUrl } = req.body;
  const uploadedFile = (req as Request & { file?: Express.Multer.File }).file;
  const uploadedImageUrl = resolveUploadUrl(uploadedFile);

  await Product.create({
    name,
    description,
    category,
    price: Number(price),
    stock: Number(stock),
    imageUrl: uploadedImageUrl || String(imageUrl || '').trim(),
    isFeatured: isFeatured === 'on',
    isAvailable: Number(stock) > 0
  });

  clearViewCache();
  res.redirect('/admin');
};

export const deleteProductFromAdmin = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  await Product.findByIdAndDelete(productId);
  clearViewCache();
  res.redirect('/admin');
};

export const updateInventoryFromAdmin = async (req: Request, res: Response): Promise<void> => {
  const { productId } = req.params;
  const newStock = Number(req.body.stock);
  const imageUrlRaw = String(req.body.imageUrl || '').trim();
  const uploadedFile = (req as Request & { file?: Express.Multer.File }).file;
  const uploadedImageUrl = resolveUploadUrl(uploadedFile);

  const current = await Product.findById(productId);

  await Product.findByIdAndUpdate(productId, {
    stock: newStock,
    isAvailable: newStock > 0,
    ...(uploadedImageUrl || imageUrlRaw ? { imageUrl: uploadedImageUrl || imageUrlRaw } : {})
  });

  if (current && current.stock <= 0 && newStock > 0) {
    const updated = await Product.findById(productId);
    if (updated) {
      await sendCatalogUpdateEmails(updated, 'restock');
    }
  }

  clearViewCache();
  res.redirect('/admin');
};

export const approvePaymentFromAdmin = async (req: Request, res: Response): Promise<void> => {
  const { orderId } = req.params;

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      status: 'approved',
      validatedByAdmin: true
    },
    { new: true }
  );

  if (order) {
    await whatsappService.sendPaymentApprovedToCustomer(order);
  }

  res.redirect('/admin');
};

export const updateHomeCarouselFromAdmin = async (req: Request, res: Response): Promise<void> => {
  const { tabacoImageUrl, vapersImageUrl, parafernaliaImageUrl } = req.body;
  const files = (req as Request & { files?: { [fieldname: string]: Array<Express.Multer.File> } }).files;

  const resolveFile = (f?: Express.Multer.File) =>
    f ? (f.path?.startsWith('http') ? f.path : `/uploads/${f.filename}`) : '';

  const tabacoFromFile = resolveFile(files?.tabacoImageFile?.[0]);
  const vapersFromFile = resolveFile(files?.vapersImageFile?.[0]);
  const parafernaliaFromFile = resolveFile(files?.parafernaliaImageFile?.[0]);

  await SiteConfig.findOneAndUpdate(
    { key: 'main' },
    {
      $set: {
        homeCarousel: {
          tabacoImageUrl: tabacoFromFile || String(tabacoImageUrl || '').trim(),
          vapersImageUrl: vapersFromFile || String(vapersImageUrl || '').trim(),
          parafernaliaImageUrl: parafernaliaFromFile || String(parafernaliaImageUrl || '').trim()
        }
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  clearViewCache('home');
  res.redirect('/admin');
};
