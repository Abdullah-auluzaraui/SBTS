import Notification from '../models/Notification';
import Attendance from '../models/Attendance';
import { getIO } from './socket';
import mongoose from 'mongoose';

export const todayUTC = () => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
};

export const create = async (
  recipientId: mongoose.Types.ObjectId | string,
  schoolId: mongoose.Types.ObjectId | string,
  type: 'status_update' | 'urgent_alert' | 'admin_notice',
  notificationType: string,
  payload: any = {}
) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      school: schoolId,
      type,
      notificationType,
      isRead: false,
      payload
    });

    try {
      const io = getIO();
      io.to(`parent_${recipientId.toString()}`).emit('notification:new', notification);
    } catch (ioError: any) {
      console.warn('Socket emit skipped or failed:', ioError.message);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

export const handleNoBoard = async (
  studentId: mongoose.Types.ObjectId | string,
  _busId: mongoose.Types.ObjectId | string,
  parentId: mongoose.Types.ObjectId | string,
  schoolId: mongoose.Types.ObjectId | string
) => {
  try {
    const { start, end } = todayUTC();

    const morningPresence = await Attendance.findOne({
      student: studentId,
      tripType: 'to_school',
      event: { $in: ['boarding', 'exit'] },
      timestamp: { $gte: start, $lte: end }
    }).lean();

    if (morningPresence) {
      await create(
        parentId,
        schoolId,
        'urgent_alert',
        'NO_BOARD_ALERT',
        {
          studentId,
          event: 'no_board',
          tripType: 'to_home'
        }
      );
    }
  } catch (error) {
    console.error('Error handling no_board logic:', error);
  }
};

export default {
  todayUTC,
  create,
  handleNoBoard
};
