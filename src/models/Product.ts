import { Document, Schema, model } from 'mongoose';
import { Category } from '../types/category';

export interface IProduct extends Document {
  name: string;
  description: string;
  category: Category;
  price: number;
  imageUrl?: string;
  isFeatured: boolean;
  isAvailable: boolean;
  stock: number;
}

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
    }
  },
  {
    timestamps: true
  }
);

productSchema.pre('save', function preSave(next) {
  this.isAvailable = this.stock > 0;
  next();
});

productSchema.index({ isFeatured: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ isAvailable: 1, category: 1, name: 1 });

export const Product = model<IProduct>('Product', productSchema);
