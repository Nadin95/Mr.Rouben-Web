import bcrypt from 'bcrypt';
import { Document, Model, Schema, model } from 'mongoose';

export type UserRole = 'user' | 'admin';

export interface IUser extends Document {
  username: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  isEmailVerified: boolean;
  emailVerificationToken: string;
  marketingOptIn: boolean;
  passwordResetToken: string;
  passwordResetExpires: Date | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {
  assignRoleByIdentity(username: string, email: string): UserRole;
}

const userSchema = new Schema<IUser, IUserModel>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      default: ''
    },
    marketingOptIn: {
      type: Boolean,
      default: true
    },
    passwordResetToken: {
      type: String,
      default: ''
    },
    passwordResetExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.statics.assignRoleByIdentity = function assignRoleByIdentity(
  username: string,
  email: string
): UserRole {
  const isNadine =
    username.trim().toLowerCase() === 'nadine' ||
    email.trim().toLowerCase() === (process.env.NADINE_EMAIL || 'nadine@mrrouben.com').toLowerCase();
  return isNadine ? 'admin' : 'user';
};

userSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser, IUserModel>('User', userSchema);
