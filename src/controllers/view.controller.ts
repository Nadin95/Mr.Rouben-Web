import { Request, Response } from 'express';
import { ForumPost } from '../models/ForumPost';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { SiteConfig } from '../models/SiteConfig';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../types/auth';

const viewDataCache = new Map<string, { expiresAt: number; value: unknown }>();

export const clearViewCache = (key?: 'home' | 'catalog') => {
  if (key) {
    viewDataCache.delete(`${key}:view-data`);
  } else {
    viewDataCache.clear();
  }
};

const getCached = async <T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> => {
  const now = Date.now();
  const existing = viewDataCache.get(key);

  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const value = await fetcher();
  viewDataCache.set(key, {
    value,
    expiresAt: now + ttlMs
  });

  return value;
};

export const renderHome = async (_req: Request, res: Response): Promise<void> => {
  const { featuredProducts, siteConfig } = await getCached(
    'home:view-data',
    20_000,
    async () => {
      const [cachedFeaturedProducts, cachedSiteConfig] = await Promise.all([
        Product.find({ isFeatured: true })
          .select('name price imageUrl category description isAvailable stock')
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
        SiteConfig.findOne({ key: 'main' }).select('homeCarousel').lean()
      ]);

      return {
        featuredProducts: cachedFeaturedProducts,
        siteConfig: cachedSiteConfig
      };
    }
  );

  const homeCarouselSlides = [
    {
      category: 'Tabaco',
      href: '/catalogo#tabaco',
      imageUrl: siteConfig?.homeCarousel?.tabacoImageUrl || ''
    },
    {
      category: 'Vapers',
      href: '/catalogo#vapers',
      imageUrl: siteConfig?.homeCarousel?.vapersImageUrl || ''
    },
    {
      category: 'Parafernalia',
      href: '/catalogo#parafernalia',
      imageUrl: siteConfig?.homeCarousel?.parafernaliaImageUrl || ''
    }
  ].filter((slide) => slide.imageUrl);

  res.render('pages/home', {
    title: 'Inicio',
    featuredProducts,
    homeCarouselSlides
  });
};

export const renderCatalog = async (_req: Request, res: Response): Promise<void> => {
  const { tabaco, vapers, parafernalia } = await getCached(
    'catalog:view-data',
    15_000,
    async () => {
      const [cachedTabaco, cachedVapers, cachedParafernalia] = await Promise.all([
        Product.find({ category: 'Tabaco' })
          .select('name description price imageUrl isAvailable stock category')
          .sort({ createdAt: -1 })
          .lean(),
        Product.find({ category: 'Vapers' })
          .select('name description price imageUrl isAvailable stock category')
          .sort({ createdAt: -1 })
          .lean(),
        Product.find({ category: 'Parafernalia' })
          .select('name description price imageUrl isAvailable stock category')
          .sort({ createdAt: -1 })
          .lean()
      ]);

      return {
        tabaco: cachedTabaco,
        vapers: cachedVapers,
        parafernalia: cachedParafernalia
      };
    }
  );

  res.render('pages/catalog', {
    title: 'Catálogo',
    categories: {
      Tabaco: tabaco,
      Vapers: vapers,
      Parafernalia: parafernalia
    }
  });
};

export const renderForum = async (_req: Request, res: Response): Promise<void> => {
  const [posts, products] = await Promise.all([
    ForumPost.find({ approvalStatus: 'approved' })
      .select('title categoryTag productNameSnapshot content author comments createdAt')
      .populate({ path: 'author', select: 'username', options: { lean: true } })
      .populate({ path: 'comments.author', select: 'username', options: { lean: true } })
      .sort({ createdAt: -1 })
      .lean(),
    Product.find({ isAvailable: true }).select('name category').sort({ category: 1, name: 1 }).lean()
  ]);

  const groupedProducts = {
    Tabaco: products.filter((product) => product.category === 'Tabaco'),
    Vapers: products.filter((product) => product.category === 'Vapers'),
    Parafernalia: products.filter((product) => product.category === 'Parafernalia')
  };

  res.render('pages/forum', {
    title: 'Comunidad',
    posts,
    groupedProducts,
    error: String(_req.query.error || ''),
    notice: String(_req.query.notice || '')
  });
};

export const renderCheckout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  let registeredPhone = '';

  if (req.user?.id) {
    const user = await User.findById(req.user.id).select('phone').lean();
    registeredPhone = user?.phone || '';
  }

  res.render('pages/checkout', {
    title: 'Checkout',
    registeredPhone
  });
};

export const renderLogin = (req: Request, res: Response): void => {
  res.render('pages/login', {
    title: 'Ingresar',
    error: '',
    notice: String(req.query.notice || ''),
    formData: { email: '' }
  });
};

export const renderRegister = (_req: Request, res: Response): void => {
  res.render('pages/register', {
    title: 'Crear cuenta',
    error: '',
    notice: '',
    formData: {
      username: '',
      email: '',
      countryCode: '+54',
      phone: '',
      marketingOptIn: true
    }
  });
};

export const renderOrderConfirm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.redirect('/login');
    return;
  }

  const order = await Order.findOne({ _id: req.params.orderId, user: req.user.id })
    .select('items total status deliveryMethod deliveryAddress customerPhone paymentProofUrl createdAt')
    .lean();

  if (!order) {
    res.status(404).render('pages/not-found', { title: 'Pedido no encontrado' });
    return;
  }

  res.render('pages/order-confirm', {
    title: 'Pedido confirmado',
    order
  });
};

export const renderMyOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.redirect('/login');
    return;
  }

  const orders = await Order.find({ user: req.user.id })
    .select('items total status deliveryMethod deliveryAddress customerPhone paymentProofUrl createdAt')
    .sort({ createdAt: -1 })
    .lean();

  res.render('pages/my-orders', {
    title: 'Mis pedidos',
    orders
  });
};
