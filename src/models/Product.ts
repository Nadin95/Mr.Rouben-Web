import { Document, Schema, model } from 'mongoose';
import { Category } from '../types/category';

export interface IProductOption {
  _id?: string;
  label: string;
  stock: number;
  imageUrl?: string;
}

export interface IProductVariantSelector {
  name: string;
  options: IProductOption[];
}

export interface IProduct extends Document {
  name: string;
  description: string;
  category: Category;
  price: number;
  imageUrl?: string;
  isFeatured: boolean;
  isAvailable: boolean;
  stock: number;
  variantSelector?: IProductVariantSelector;
}

export const getProductAvailability = (product?: Partial<IProduct>): boolean => {
  const options = product?.variantSelector?.options ?? [];

  if (options.length) {
    return options.some((option) => Number(option.stock ?? 0) > 0);
  }

  return Number(product?.stock ?? 0) > 0;
};

export const shouldUseGlobalStock = (product?: Partial<IProduct>): boolean => {
  return !((product?.variantSelector?.options?.length ?? 0) > 0);
};

const productVariantOptionSchema = new Schema<IProductOption>(
  {
    label: {
      type: String,
      required: true,
      trim: true
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    imageUrl: {
      type: String,
      default: ''
    }
  },
  { _id: true }
);

const productVariantSelectorSchema = new Schema<IProductVariantSelector>(
  {
    name: {
      type: String,
      default: '',
      trim: true
    },
    options: {
      type: [productVariantOptionSchema],
      default: []
    }
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['Tabaco', 'Vapers', 'Parafernalia'],
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    imageUrl: {
      type: String,
      default: ''
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    variantSelector: {
      type: productVariantSelectorSchema,
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

productSchema.pre('save', function preSave(next) {
  this.isAvailable = getProductAvailability(this as unknown as Partial<IProduct>);
  next();
});

productSchema.index({ isFeatured: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ isAvailable: 1, category: 1, name: 1 });

export const Product = model<IProduct>('Product', productSchema);
