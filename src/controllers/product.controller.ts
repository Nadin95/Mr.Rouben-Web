import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { sendCatalogUpdateEmails } from '../services/notification.service';
import { Category } from '../types/category';

const validCategories: Category[] = ['Tabaco', 'Vapers', 'Parafernalia'];

export const getFeaturedProducts = async (_req: Request, res: Response): Promise<Response> => {
  const products = await Product.find({ isFeatured: true }).sort({ createdAt: -1 });
  return res.status(200).json(products);
};

export const getProducts = async (req: Request, res: Response): Promise<Response> => {
  const category = req.query.category as Category | undefined;

  if (category && !validCategories.includes(category)) {
    return res.status(400).json({ message: 'Categoría inválida' });
  }

  const filters = category ? { category } : {};
  const products = await Product.find(filters).sort({ createdAt: -1 });

  return res.status(200).json(products);
};

export const createProduct = async (req: Request, res: Response): Promise<Response> => {
  const payload = req.body;
  const product = await Product.create(payload);

  await sendCatalogUpdateEmails(product, 'new_product');

  return res.status(201).json(product);
};

export const deleteProduct = async (req: Request, res: Response): Promise<Response> => {
  const { productId } = req.params;
  const deleted = await Product.findByIdAndDelete(productId);

  if (!deleted) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }

  return res.status(200).json({ message: 'Producto eliminado correctamente' });
};
