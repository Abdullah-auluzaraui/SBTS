import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInvitation extends Document {
  school: mongoose.Types.ObjectId;
  email: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>({
  school:    { type: Schema.Types.ObjectId, ref: 'School', required: true },
  email:     { type: String, required: true, lowercase: true, trim: true },
  token:     { type: String, required: true, unique: true },     // crypto.randomBytes(32).toString('hex')
  expiresAt: { type: Date, required: true },                     // +24 hours
  isUsed:    { type: Boolean, default: false }
}, { timestamps: true });

export const Invitation: Model<IInvitation> = mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', invitationSchema);
export default Invitation;
