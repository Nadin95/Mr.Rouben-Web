import { Response } from 'express';
import { env } from '../config/env';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { whatsappService } from '../services/whatsapp.service';
import { AuthenticatedRequest } from '../types/auth';

interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

export const createOrder = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const { items, customerPhone, deliveryMethod, deliveryAddress } = req.body as {
    items: CheckoutItemInput[];
    customerPhone?: string;
    deliveryMethod?: string;
    deliveryAddress?: string;
  };

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Debes enviar items para crear la orden' });
  }

  const user = await User.findById(req.user.id).select('phone isEmailVerified').lean();
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({ message: 'Debes verificar tu email antes de comprar' });
  }

  const method = deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
  if (method === 'delivery' && !String(deliveryAddress || '').trim()) {
    return res.status(400).json({ message: 'La dirección de entrega es obligatoria para envíos a domicilio' });
  }

  const uniqueIds = [...new Set(items.map((item) => item.productId))];
  const products = await Product.find({ _id: { $in: uniqueIds } })
    .select('name price stock isAvailable')
    .lean();
  const productsMap = new Map(products.map((product) => [String(product._id), product]));

  const orderItems = [] as {
    product: string;
    quantity: number;
    unitPrice: number;
    titleSnapshot: string;
  }[];

  let total = 0;

  for (const item of items) {
    const product = productsMap.get(item.productId);

    if (!product) {
      return res.status(404).json({ message: `Producto no encontrado: ${item.productId}` });
    }

    if (!product.isAvailable || product.stock < item.quantity) {
      return res.status(409).json({ message: `Stock insuficiente para ${product.name}` });
    }

    orderItems.push({
      product: String(product._id),
      quantity: item.quantity,
      unitPrice: product.price,
      titleSnapshot: product.name
    });

    total += product.price * item.quantity;
  }

  const finalPhone = String(customerPhone || user.phone || '').trim();
  if (!finalPhone) {
    return res.status(400).json({ message: 'Falta teléfono de contacto' });
  }

  const order = await Order.create({
    user: req.user.id,
    customerPhone: finalPhone,
    deliveryMethod: method,
    deliveryAddress: method === 'delivery' ? String(deliveryAddress || '').trim() : '',
    items: orderItems,
    total,
    status: 'pending_payment'
  });

  await Promise.all(
    orderItems.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      })
    )
  );

  await Product.updateMany(
    { stock: { $lte: 0 } },
    {
      $set: { isAvailable: false, stock: 0 }
    }
  );

  await Promise.all([
    whatsappService.sendPaymentInstructionsToCustomer(order),
    whatsappService.notifyAdminNewOrder(order)
  ]);

  return res.status(201).json({
    message: env.whatsappEnabled
      ? 'Orden creada. Enviamos instrucciones de pago por WhatsApp.'
      : 'Orden creada.',
    whatsappEnabled: env.whatsappEnabled,
    order
  });
};

export const uploadProof = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const { orderId } = req.params;
  const uploadedFile = (req as AuthenticatedRequest & { file?: Express.Multer.File }).file;

  if (!uploadedFile) {
    return res.status(400).json({ message: 'Debes adjuntar una imagen del comprobante' });
  }

  const order = await Order.findOne({ _id: orderId, user: req.user.id });
  if (!order) {
    return res.status(404).json({ message: 'Pedido no encontrado' });
  }

  if (!['pending_payment'].includes(order.status)) {
    return res.status(409).json({ message: 'Este pedido ya tiene un comprobante o fue procesado' });
  }

  const proofUrl = uploadedFile.path?.startsWith('http')
    ? uploadedFile.path
    : `/uploads/${uploadedFile.filename}`;

  await Order.findByIdAndUpdate(orderId, {
    paymentProofUrl: proofUrl,
    status: 'whatsapp_pending_validation'
  });

  return res.status(200).json({ message: 'Comprobante subido. El equipo lo revisará pronto.' });
};
