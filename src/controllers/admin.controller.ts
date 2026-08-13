import { Request, Response } from 'express';
import { ForumPost } from '../models/ForumPost';
import { Order } from '../models/Order';
import { Product, getProductAvailability, shouldUseGlobalStock } from '../models/Product';
import { SiteConfig } from '../models/SiteConfig';
import { sendCatalogUpdateEmails } from '../services/notification.service';
import { clearViewCache } from './view.controller';
import normalizeImageUrl from '../utils/normalizeImageUrl';
import diskUrlFor from '../utils/uploadPaths';
import { whatsappService } from '../services/whatsapp.service';

const parseVariantSelectorFromForm = (
  selectorName?: string,
  selectorOptionsText?: string,
  uploadedVariantFiles: Array<Express.Multer.File> = []
) => {
  const trimmedSelectorName = String(selectorName || '').trim();
  const lines = String(selectorOptionsText || '')
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!trimmedSelectorName || !lines.length) {
    return undefined;
  }

  const options = lines
    .map((line, index) => {
      const rawParts = line.split('|').map((part) => part.trim());
      const label = rawParts[0] || '';
      const stockValue = Number(rawParts[1] || 0);
      const fallbackImageUrl = String(rawParts[2] || '').trim();
      const uploadedFile = uploadedVariantFiles[index];
      const imageUrl = uploadedFile ? diskUrlFor(uploadedFile, 'products') : fallbackImageUrl;

      if (!label) {
        return null;
      }

      return {
        label,
        stock: Number.isFinite(stockValue) ? Math.max(0, stockValue) : 0,
        imageUrl
      };
    })
    .filter(Boolean) as Array<{ label: string; stock: number; imageUrl: string }>;

  if (!options.length) {
    return undefined;
  }

  return {
    name: trimmedSelectorName,
    options
  };
};

const normalizeVariantSelectorForSave = (
  existingOptions: Array<{ _id?: string; label: string; stock: number; imageUrl?: string }>,
  reqBody: Record<string, any>,
  uploadedVariantFiles: Array<Express.Multer.File> = []
) => {
  const variantOptionStocks = reqBody.variantOptionStock ?? {};

  return existingOptions.map((option, index) => {
    const optionId = String(option._id || '');
    const rawStock = optionId ? variantOptionStocks[optionId] ?? variantOptionStocks[String(option._id)] : undefined;
    const parsedStock = Number(rawStock ?? option.stock);
    const uploadedFile = uploadedVariantFiles[index];

    return {
      _id: option._id,
      label: option.label,
      stock: Number.isFinite(parsedStock) ? Math.max(0, parsedStock) : option.stock,
      imageUrl: uploadedFile ? diskUrlFor(uploadedFile, 'products') : String(option.imageUrl ?? '').trim()
    };
  });
};

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
      .select('name category price imageUrl isAvailable stock variantSelector')
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

  const normalizedProducts = (products || []).map((p: any) => ({ ...p, imageUrl: normalizeImageUrl(p?.imageUrl) }));
  const normalizedOrders = (ordersPendingValidation || []).map((o: any) => ({
    ...o,
    paymentProofUrl: normalizeImageUrl(o?.paymentProofUrl)
  }));

  res.render('pages/admin', {
    title: 'Panel de Administración',
    products: normalizedProducts,
    ordersPendingValidation: normalizedOrders,
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
      stock: shouldUseGlobalStock(existing) ? numericStock : existing.stock,
      isAvailable: getProductAvailability({ stock: numericStock, variantSelector: existing.variantSelector })
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

// Use `diskUrlFor` from utils/uploadPaths for canonical URLs

export const createProductFromAdmin = async (req: Request, res: Response): Promise<void> => {
  const { name, description, category, price, stock, isFeatured, imageUrl, variantSelectorName, variantOptionsText } = req.body;
  const uploadedFiles = (req as Request & { files?: { [fieldname: string]: Express.Multer.File[] } }).files;
  const uploadedFile = uploadedFiles?.imageFile?.[0];
  const uploadedImageUrl = diskUrlFor(uploadedFile, 'products');
  const uploadedVariantFiles = uploadedFiles?.variantOptionImageFiles ?? [];

  if (uploadedFile) {
    console.debug('[uploads] main file:', { path: uploadedFile.path, destination: uploadedFile.destination, filename: uploadedFile.filename, resolvedUrl: uploadedImageUrl });
  }

  if (uploadedVariantFiles.length) {
    console.debug('[uploads] variant files:', uploadedVariantFiles.map(f => ({ path: f.path, filename: f.filename, resolvedUrl: diskUrlFor(f, 'products') })));
  }
  const variantSelector = parseVariantSelectorFromForm(variantSelectorName, variantOptionsText, uploadedVariantFiles);
  const numericStock = Number(stock);

  const availability = getProductAvailability({
    stock: Number.isFinite(numericStock) ? Math.max(0, numericStock) : 0,
    variantSelector: variantSelector ?? undefined
  });

  await Product.create({
    name,
    description,
    category,
    price: Number(price),
    stock: Number.isFinite(numericStock) ? Math.max(0, numericStock) : 0,
    imageUrl: uploadedImageUrl || String(imageUrl || '').trim(),
    isFeatured: isFeatured === 'on',
    isAvailable: availability,
    ...(variantSelector ? { variantSelector } : {})
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
  const uploadedFiles = (req as Request & { files?: { [fieldname: string]: Express.Multer.File[] } }).files;
  const uploadedFile = uploadedFiles?.inventoryImageFile?.[0];
  const uploadedImageUrl = diskUrlFor(uploadedFile, 'products');
  const uploadedVariantFiles = uploadedFiles?.variantOptionImageFiles ?? [];

  if (uploadedFile) {
    console.debug('[uploads] inventory file:', { path: uploadedFile.path, destination: uploadedFile.destination, filename: uploadedFile.filename, resolvedUrl: uploadedImageUrl });
  }

  if (uploadedVariantFiles.length) {
    console.debug('[uploads] inventory variant files:', uploadedVariantFiles.map(f => ({ path: f.path, filename: f.filename, resolvedUrl: diskUrlFor(f, 'products') })));
  }

  const current = await Product.findById(productId);
  const variantSelector = current?.variantSelector;
  const hasVariantSelector = Boolean(variantSelector?.options?.length);
  const nextVariantSelector = hasVariantSelector && variantSelector
    ? {
        name: variantSelector.name,
        options: normalizeVariantSelectorForSave(variantSelector.options, req.body, uploadedVariantFiles)
      }
    : undefined;

  const normalizedStock = Number.isFinite(newStock) ? Math.max(0, newStock) : (current?.stock ?? 0);
  const nextAvailability = getProductAvailability({
    stock: normalizedStock,
    variantSelector: nextVariantSelector ?? current?.variantSelector
  });

  await Product.findByIdAndUpdate(productId, {
    stock: shouldUseGlobalStock(current ?? undefined) ? normalizedStock : current?.stock ?? 0,
    isAvailable: nextAvailability,
    ...(nextVariantSelector ? { variantSelector: nextVariantSelector } : {}),
    ...(uploadedImageUrl || imageUrlRaw ? { imageUrl: uploadedImageUrl || imageUrlRaw } : {})
  });

  if (current && current.stock <= 0 && normalizedStock > 0 && !hasVariantSelector) {
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

  const resolveFile = (f?: Express.Multer.File) => (f ? diskUrlFor(f, 'products') : '');

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
