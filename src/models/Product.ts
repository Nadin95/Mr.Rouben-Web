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
  const hasVariantOptions = Boolean(this.variantSelector?.options?.length);
  this.isAvailable = hasVariantOptions
    ? this.variantSelector!.options.some((option) => option.stock > 0)
    : this.stock > 0;
  next();
});

productSchema.index({ isFeatured: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ isAvailable: 1, category: 1, name: 1 });

export const Product = model<IProduct>('Product', productSchema);
