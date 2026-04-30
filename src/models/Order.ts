import { Document, Schema, Types, model } from 'mongoose';

export type OrderStatus =
  | 'pending_payment'
  | 'approved'
  | 'paid'
  | 'shipped'
  | 'cancelled'
  | 'whatsapp_pending_validation';

interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  titleSnapshot: string;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  customerPhone: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress: string;
  items: IOrderItem[];
  total: number;
  status: OrderStatus;
  paymentProofUrl?: string;
  validatedByAdmin: boolean;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    titleSnapshot: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true
    },
    deliveryMethod: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'pickup'
    },
    deliveryAddress: {
      type: String,
      default: ''
    },
    items: {
      type: [orderItemSchema],
      validate: [(items: IOrderItem[]) => items.length > 0, 'La orden debe tener al menos un item']
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending_payment', 'approved', 'paid', 'shipped', 'cancelled', 'whatsapp_pending_validation'],
      default: 'pending_payment'
    },
    paymentProofUrl: {
      type: String,
      default: ''
    },
    validatedByAdmin: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = model<IOrder>('Order', orderSchema);
