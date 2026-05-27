import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationPayload {
  studentId?: mongoose.Types.ObjectId | null;
  tripId?: mongoose.Types.ObjectId | null;
  attendanceId?: mongoose.Types.ObjectId | null;
  event?: string | null;
  tripType?: string | null;
}

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  school: mongoose.Types.ObjectId;
  type: 'status_update' | 'urgent_alert' | 'admin_notice';
  notificationType: string | null;
  title?: string;
  message?: string;
  isRead: boolean;
  payload: INotificationPayload;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  school: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  type: { 
    type: String, 
    enum: ['status_update', 'urgent_alert', 'admin_notice'], 
    required: true 
  },
  notificationType: {
    type: String,
    default: null,
    index: true
  },
  title: { type: String },
  message: { type: String },
  isRead: { type: Boolean, default: false, index: true },
  payload: {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', default: null },
    attendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance', default: null },
    event: { type: String, default: null },
    tripType: { type: String, default: null },
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;
