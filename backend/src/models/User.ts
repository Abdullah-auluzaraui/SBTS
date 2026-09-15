import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type UserRole = 'superadmin' | 'schooladmin' | 'driver' | 'parent';

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  school: Types.ObjectId | null;
  phone?: string;
  isPhoneVerified: boolean;
  isActive: boolean;
  isDemoAccount?: boolean;
  accountDeletionScheduledAt?: Date | null;
  fcmToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  isDemoAccount: { type: Boolean, default: false },
  name:     { type: String, required: true },
  role:     { type: String, enum: ['superadmin', 'schooladmin', 'driver', 'parent'], required: true },
  school:   {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: function (this: IUser) { return this.role !== 'superadmin'; },
    default: null
  },
  phone:                      { type: String },
  isPhoneVerified:            { type: Boolean, default: false },
  isActive:                   { type: Boolean, default: true },
  accountDeletionScheduledAt: { type: Date, default: null },
  fcmToken:                   { type: String, default: null }
}, { timestamps: true });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export default User;
