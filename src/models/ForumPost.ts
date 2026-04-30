import { Document, Schema, Types, model } from 'mongoose';

interface IForumComment {
  author: Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface IForumPost extends Document {
  title: string;
  categoryTag: 'Tabaco' | 'Vapers' | 'Parafernalia' | 'General';
  productRef: Types.ObjectId;
  productNameSnapshot: string;
  content: string;
  author: Types.ObjectId;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedByAdmin: boolean;
  comments: IForumComment[];
}

const forumCommentSchema = new Schema<IForumComment>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 600
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const forumPostSchema = new Schema<IForumPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 120
    },
    categoryTag: {
      type: String,
      enum: ['Tabaco', 'Vapers', 'Parafernalia', 'General'],
      default: 'General'
    },
    productRef: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productNameSnapshot: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 5000
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedByAdmin: {
      type: Boolean,
      default: false
    },
    comments: {
      type: [forumCommentSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

forumPostSchema.index({ approvalStatus: 1, createdAt: -1 });

export const ForumPost = model<IForumPost>('ForumPost', forumPostSchema);
