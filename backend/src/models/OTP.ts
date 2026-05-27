import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IOTP extends Document {
  phone: string;
  otp: string;
  purpose: 'link-student' | 'forgot-password' | 'change-phone';
  studentId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  matchOTP(enteredOTP: string): Promise<boolean>;
}

const otpSchema = new Schema<IOTP>({
  phone: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['link-student', 'forgot-password', 'change-phone'],
    default: 'link-student'
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: false,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // 5-minute TTL
  }
});

otpSchema.pre('save', async function () {
  if (!this.isModified('otp')) return;
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
});

otpSchema.methods.matchOTP = async function (enteredOTP: string): Promise<boolean> {
  return await bcrypt.compare(enteredOTP, this.otp);
};

export const OTP: Model<IOTP> = mongoose.models.OTP || mongoose.model<IOTP>('OTP', otpSchema);
export default OTP;
