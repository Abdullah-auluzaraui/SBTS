import School from '../models/School';
import Invitation from '../models/Invitation';
import User from '../models/User';
import Student from '../models/Student';
import Bus from '../models/Bus';
import crypto from 'crypto';
import { AppError } from '../utils/AppError';

export class SchoolService {
  static async generateSchoolId(): Promise<string> {
    let id = '';
    let exists = true;
    while (exists) {
      const num = Math.floor(1000 + Math.random() * 9000);
      id = `SCH-${num}`;
      exists = await School.exists({ schoolId: id }) !== null;
    }
    return id;
  }

  static generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async createSchoolInvitation(schoolName: string, contactEmail: string, contactPhone?: string) {
    const schoolId = await this.generateSchoolId();
    const school: any = await School.create({
      name: schoolName,
      schoolId,
      contact: { email: contactEmail, phone: contactPhone || undefined },
      isActive: true
    });

    const token = this.generateInvitationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await Invitation.create({
      school: school._id,
      email: contactEmail,
      token,
      expiresAt
    });

    return {
      school: { id: school._id, schoolId: school.schoolId, name: school.name },
      invitationLink: `/onboarding?token=${token}`,
      expiresAt
    };
  }

  static async resendSchoolInvitation(schoolId: string, emailOverride?: string) {
    const school = await School.findById(schoolId);
    if (!school) throw new AppError(404, 'SCHOOL_NOT_FOUND');

    await Invitation.updateMany(
      { school: school._id, isUsed: false },
      { isUsed: true }
    );

    const lastInvitation: any = await Invitation.findOne({ school: school._id }).sort({ createdAt: -1 });
    const email = emailOverride || lastInvitation?.email || school.contact?.email;

    if (!email) throw new AppError(400, 'NO_EMAIL_FOUND');

    const token = this.generateInvitationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await Invitation.create({
      school: school._id,
      email,
      token,
      expiresAt
    });

    return {
      email,
      invitationLink: `/onboarding?token=${token}`,
      expiresAt
    };
  }

  static async listAllSchools(allSchools: boolean) {
    const filter = allSchools ? {} : { isActive: true };
    const schools = await School.find(filter).sort({ createdAt: -1 }).lean();

    return Promise.all(
      schools.map(async (school: any) => {
        const [studentCount, busCount, adminUser, latestInvitation]: any[] = await Promise.all([
          Student.countDocuments({ school: school._id }),
          Bus.countDocuments({ school: school._id }),
          User.findOne({ school: school._id, role: 'schooladmin' }).select('username name').lean(),
          Invitation.findOne({ school: school._id }).sort({ createdAt: -1 }).lean()
        ]);

        let invitationStatus = 'none';
        if (adminUser) {
          invitationStatus = 'accepted';
        } else if (latestInvitation && !latestInvitation.isUsed && latestInvitation.expiresAt > new Date()) {
          invitationStatus = 'pending';
        } else if (latestInvitation) {
          invitationStatus = 'expired';
        }

        return {
          ...school,
          studentCount,
          busCount,
          admin: adminUser || null,
          invitationStatus,
          invitationEmail: latestInvitation?.email || null
        };
      })
    );
  }

  static async toggleStatus(id: string) {
    const school = await School.findById(id);
    if (!school) throw new AppError(404, 'SCHOOL_NOT_FOUND');

    school.isActive = !school.isActive;
    await school.save();

    await User.updateMany(
      { school: school._id, role: 'schooladmin' },
      { isActive: school.isActive }
    );

    return {
      name: school.name,
      isActive: school.isActive
    };
  }

  static async getSchoolInfo(schoolId: string) {
    const school = await School.findById(schoolId).select('name schoolId contact location emergencyContacts');
    if (!school) throw new AppError(404, 'SCHOOL_NOT_FOUND');
    return school;
  }

  static async updateSchoolLocation(schoolId: string, lat: number, lng: number) {
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
      throw new AppError(400, 'INVALID_INPUT', 'lat and lng are required');
    }
    const school = await School.findByIdAndUpdate(
      schoolId,
      { location: { type: 'Point', coordinates: [lng, lat] } },
      { new: true }
    );
    if (!school) throw new AppError(404, 'SCHOOL_NOT_FOUND');
    return school.location;
  }

  static async updateSchoolEmergencyContacts(schoolId: string, contacts: any[]) {
    if (!Array.isArray(contacts)) {
      throw new AppError(400, 'INVALID_INPUT', 'contacts must be an array');
    }

    const sanitized = contacts.map(({ name, phone }) => ({ name, phone }));

    const school = await School.findByIdAndUpdate(
      schoolId,
      { $set: { emergencyContacts: sanitized } },
      { new: true, runValidators: false }
    );

    if (!school) {
      throw new AppError(404, 'SCHOOL_NOT_FOUND');
    }

    return school.emergencyContacts;
  }
}
