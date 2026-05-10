const Notification = require('../models/Notification');
const Attendance = require('../models/Attendance');
const { getIO } = require('./socket');

/**
 * Helper to get the start and end of the current day in UTC.
 * Used for querying today's records regardless of local server timezone.
 */
const todayUTC = () => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Creates a notification in the database and emits it via socket.io.
 * 
 * @param {ObjectId} recipientId - The user ID receiving the notification
 * @param {ObjectId} school - The school ID
 * @param {String} type - 'status_update', 'urgent_alert', or 'admin_notice'
 * @param {String} notificationType - Language-agnostic key (e.g., 'BOARDED_BUS', 'TRIP_STARTED')
 * @param {Object} payload - Additional data (studentId, tripId, attendanceId, event, tripType)
 * @returns {Promise<Document>} The saved notification document
 */
const create = async (recipientId, school, type, notificationType, payload = {}) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      school,
      type,
      notificationType,
      isRead: false,
      payload
    });

    try {
      const io = getIO();
      // Emit to the specific parent's room
      io.to(`parent_${recipientId.toString()}`).emit('notification:new', notification);
    } catch (ioError) {
      console.warn('Socket emit skipped or failed:', ioError.message);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Handles the logic when a student does not board the bus returning home.
 * 'Ghost Morning' Edge Case: Checks if they were actually on the bus this morning.
 */
const handleNoBoard = async (studentId, busId, parentId, schoolId) => {
  try {
    const { start, end } = todayUTC();

    // Check if there is an explicit morning presence record today
    const morningPresence = await Attendance.findOne({
      student: studentId,
      tripType: 'to_school',
      event: { $in: ['boarding', 'exit'] },
      timestamp: { $gte: start, $lte: end }
    }).lean();

    if (morningPresence) {
      // Student was on the bus this morning, but missed the afternoon bus. URGENT.
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
    // If no morningPresence, we stay SILENT. (e.g., Parent drove them)

  } catch (error) {
    console.error('Error handling no_board logic:', error);
  }
};

module.exports = {
  todayUTC,
  create,
  handleNoBoard
};
