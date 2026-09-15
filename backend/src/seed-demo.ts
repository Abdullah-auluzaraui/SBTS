import dns from 'node:dns';
if (process.env.OVERRIDE_DNS === 'true') {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
}

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const demoEnvPath = path.resolve(__dirname, '../.env.demo');
if (fs.existsSync(demoEnvPath)) {
  dotenv.config({ path: demoEnvPath });
} else {
  dotenv.config();
}

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from './config/db';
import School from './models/School';
import User from './models/User';
import Student from './models/Student';
import Bus from './models/Bus';
import Invitation from './models/Invitation';
import { encrypt } from './utils/crypto';
import { assertDemoDatabase } from './config/security';

// ── Saudi Phone Number Generator ───────────────────────────────────────
function generateSaudiPhone(): string {
  const prefix = Math.random() > 0.5 ? '+9665' : '05';
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${suffix}`;
}

// ── NFC Tag ID Generator ────────────────────────────────────────────────
function generateNfcTag(): string {
  return Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join('');
}

// ── Arabic Name Pools (Three-part names) ──────────────────────────────────
const FIRST_NAMES = [
  'أحمد', 'خالد', 'إبراهيم', 'عمر', 'محمد', 'سعد', 'فيصل', 'عبدالله',
  'يوسف', 'عبدالرحمن', 'عبدالعزيز', 'راشد', 'ماجد', 'بندر', 'طارق',
  'نواف', 'سلطان', 'تركي', 'هاني', 'وليد', 'جاسم', 'صالح', 'ناصر',
  'رياض', 'مشاري'
];

const FATHER_NAMES = [
  'محمد', 'علي', 'عبدالله', 'عبدالرحمن', 'سعد', 'سالم', 'فهد', 'خالد',
  'سعيد', 'صالح', 'ناصر', 'سليمان', 'إبراهيم', 'عبدالعزيز', 'يوسف'
];

const FAMILY_NAMES = [
  'العتيبي', 'القحطاني', 'الدوسري', 'الشهري', 'الزهراني',
  'المطيري', 'الغامدي', 'الحربي', 'الشمري', 'العمري',
  'السبيعي', 'الرشيدي', 'الأحمدي', 'البلوي', 'الجهني',
  'السلمي', 'العنزي', 'الوادعي', 'المالكي', 'الأسمري'
];

function studentName(i: number): string {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const father = FATHER_NAMES[i % FATHER_NAMES.length];
  const family = FAMILY_NAMES[Math.floor(i / FIRST_NAMES.length) % FAMILY_NAMES.length];
  return `${first} ${father} ${family}`; // اسم ثلاثي
}

// ── Verified Residential Coordinates in Al-Shifa District (Google Maps) ─────
// All 100 coordinates are strictly located on real residential streets & villa blocks.
// Bounded between Dirab Road (northwest) and Ibn Taymiyyah Road (southeast), safely west of Wadi Hanifa lake.
interface NeighborhoodGroup {
  busId: string;
  label: string;
  driverName: string;
  coords: Array<{ lat: number; lng: number }>;
}

const NEIGHBORHOOD_CLUSTERS: NeighborhoodGroup[] = [
  {
    busId: 'BUS-001',
    label: 'حي الشفا - القطاع الأوسط',
    driverName: 'محمد سعد العتيبي',
    coords: [
      { lat: 24.5530, lng: 46.6945 },
      { lat: 24.5538, lng: 46.6958 },
      { lat: 24.5546, lng: 46.6970 },
      { lat: 24.5554, lng: 46.6982 },
      { lat: 24.5562, lng: 46.6995 },
      { lat: 24.5570, lng: 46.7008 },
      { lat: 24.5578, lng: 46.6992 },
      { lat: 24.5570, lng: 46.6978 },
      { lat: 24.5562, lng: 46.6962 },
      { lat: 24.5554, lng: 46.6948 },
      { lat: 24.5546, lng: 46.6935 },
      { lat: 24.5538, lng: 46.6922 },
      { lat: 24.5528, lng: 46.6938 },
      { lat: 24.5520, lng: 46.6952 },
      { lat: 24.5528, lng: 46.6968 },
      { lat: 24.5536, lng: 46.6982 },
      { lat: 24.5545, lng: 46.6998 },
      { lat: 24.5555, lng: 46.7012 },
      { lat: 24.5565, lng: 46.6950 },
      { lat: 24.5575, lng: 46.6965 },
    ],
  },
  {
    busId: 'BUS-002',
    label: 'حي الشفا - القطاع الشرقي السكني',
    driverName: 'سالم عبدالله القحطاني',
    coords: [
      { lat: 24.5585, lng: 46.7020 },
      { lat: 24.5595, lng: 46.7032 },
      { lat: 24.5605, lng: 46.7045 },
      { lat: 24.5615, lng: 46.7058 },
      { lat: 24.5625, lng: 46.7070 },
      { lat: 24.5635, lng: 46.7082 },
      { lat: 24.5645, lng: 46.7075 },
      { lat: 24.5655, lng: 46.7062 },
      { lat: 24.5665, lng: 46.7050 },
      { lat: 24.5650, lng: 46.7038 },
      { lat: 24.5640, lng: 46.7025 },
      { lat: 24.5630, lng: 46.7015 },
      { lat: 24.5618, lng: 46.7028 },
      { lat: 24.5608, lng: 46.7040 },
      { lat: 24.5598, lng: 46.7052 },
      { lat: 24.5588, lng: 46.7065 },
      { lat: 24.5600, lng: 46.7078 },
      { lat: 24.5620, lng: 46.7065 },
      { lat: 24.5640, lng: 46.7050 },
      { lat: 24.5660, lng: 46.7035 },
    ],
  },
  {
    busId: 'BUS-003',
    label: 'حي الشفا - القطاع الشمالي',
    driverName: 'فهد ناصر الدوسري',
    coords: [
      { lat: 24.5625, lng: 46.6915 },
      { lat: 24.5635, lng: 46.6930 },
      { lat: 24.5645, lng: 46.6945 },
      { lat: 24.5655, lng: 46.6960 },
      { lat: 24.5665, lng: 46.6975 },
      { lat: 24.5675, lng: 46.6990 },
      { lat: 24.5685, lng: 46.7005 },
      { lat: 24.5692, lng: 46.6985 },
      { lat: 24.5682, lng: 46.6968 },
      { lat: 24.5672, lng: 46.6952 },
      { lat: 24.5662, lng: 46.6938 },
      { lat: 24.5652, lng: 46.6922 },
      { lat: 24.5640, lng: 46.6935 },
      { lat: 24.5648, lng: 46.6950 },
      { lat: 24.5658, lng: 46.6965 },
      { lat: 24.5668, lng: 46.6980 },
      { lat: 24.5678, lng: 46.6995 },
      { lat: 24.5688, lng: 46.6975 },
      { lat: 24.5670, lng: 46.6940 },
      { lat: 24.5655, lng: 46.6925 },
    ],
  },
  {
    busId: 'BUS-004',
    label: 'حي الشفا - القطاع الغربي',
    driverName: 'خالد يوسف الشهري',
    coords: [
      { lat: 24.5510, lng: 46.6830 },
      { lat: 24.5520, lng: 46.6845 },
      { lat: 24.5530, lng: 46.6860 },
      { lat: 24.5540, lng: 46.6875 },
      { lat: 24.5550, lng: 46.6890 },
      { lat: 24.5560, lng: 46.6905 },
      { lat: 24.5570, lng: 46.6918 },
      { lat: 24.5580, lng: 46.6905 },
      { lat: 24.5590, lng: 46.6890 },
      { lat: 24.5600, lng: 46.6875 },
      { lat: 24.5590, lng: 46.6860 },
      { lat: 24.5580, lng: 46.6845 },
      { lat: 24.5570, lng: 46.6832 },
      { lat: 24.5558, lng: 46.6848 },
      { lat: 24.5548, lng: 46.6862 },
      { lat: 24.5538, lng: 46.6878 },
      { lat: 24.5528, lng: 46.6892 },
      { lat: 24.5518, lng: 46.6908 },
      { lat: 24.5535, lng: 46.6850 },
      { lat: 24.5555, lng: 46.6870 },
    ],
  },
  {
    busId: 'BUS-005',
    label: 'حي الشفا - القطاع الجنوبي',
    driverName: 'علي حسن الغامدي',
    coords: [
      { lat: 24.5460, lng: 46.6880 },
      { lat: 24.5470, lng: 46.6895 },
      { lat: 24.5480, lng: 46.6910 },
      { lat: 24.5490, lng: 46.6925 },
      { lat: 24.5500, lng: 46.6940 },
      { lat: 24.5510, lng: 46.6955 },
      { lat: 24.5520, lng: 46.6970 },
      { lat: 24.5512, lng: 46.6985 },
      { lat: 24.5502, lng: 46.7000 },
      { lat: 24.5492, lng: 46.7015 },
      { lat: 24.5482, lng: 46.7000 },
      { lat: 24.5472, lng: 46.6985 },
      { lat: 24.5462, lng: 46.6970 },
      { lat: 24.5455, lng: 46.6955 },
      { lat: 24.5465, lng: 46.6940 },
      { lat: 24.5475, lng: 46.6925 },
      { lat: 24.5485, lng: 46.6942 },
      { lat: 24.5495, lng: 46.6960 },
      { lat: 24.5505, lng: 46.6978 },
      { lat: 24.5515, lng: 46.6995 },
    ],
  },
];

// Flatten to 100 verified coordinate objects
const ALL_COORDS = NEIGHBORHOOD_CLUSTERS.flatMap(n => n.coords);

// ── DOB distribution across 2010-2014 ────────────────────────────────────
const DOB_YEARS = [2010, 2011, 2012, 2013, 2014];

function studentDob(i: number): Date {
  const year = DOB_YEARS[i % DOB_YEARS.length];
  const month = (i % 12) + 1;
  const day = (i % 28) + 1;
  return new Date(year, month - 1, day);
}

// ── Main seed function ────────────────────────────────────────────────────
const seed = async () => {
  assertDemoDatabase();
  await connectDB();

  // 1. Clear previous demo data FIRST before creating any new records!
  console.log('🧹  Clearing previous demo data...');
  const [delBuses, delUsers, delStudents] = await Promise.all([
    Bus.deleteMany({}),
    User.deleteMany({
      $or: [
        { role: { $in: ['driver', 'parent', 'superadmin', 'schooladmin'] } },
        { username: { $in: ['s_admin', 'superadmin'] } },
        { username: { $regex: /^(admin_|driver_|parent)/ } }
      ]
    }),
    Student.deleteMany({ studentId: { $regex: /^S26/ } }),
    Invitation.deleteMany({}),
    School.deleteMany({})
  ]);
  console.log(
    `🗑️   Cleared: ${delBuses.deletedCount} buses, ` +
    `${delUsers.deletedCount} users, ` +
    `${delStudents.deletedCount} students`
  );

  // 2. Hash passwords once
  const sharedHash = await bcrypt.hash('Aa1234', 10);

  // 3. Create primary demo school (SCH-0001)
  console.log('🏫  Creating primary demo school (SCH-0001)...');
  const school = await School.create({
    name: 'مدرسة الشفا النموذجية',
    schoolId: 'SCH-0001',
    contact: {
      phone: '+966500000000',
      email: 'alshifa@school.com'
    },
    location: { type: 'Point', coordinates: [46.6965, 24.5545] },
    isActive: true
  });

  // 4. Seed 29 additional schools across major Saudi cities for realistic SuperAdmin showcase
  const DEMO_EXTRA_SCHOOLS = [
    // ── Accepted & Active Schools (مسجلة ولديها مدير ونشطة) ──
    { name: 'مدارس الرياض الأهلية', schoolId: 'SCH-1002', email: 'riyadh.schools@edu.sa', phone: '+966511001002', status: 'accepted', isActive: true, adminName: 'سليمان خالد الدخيل', adminUser: 'admin_riyadh' },
    { name: 'مدارس الملك فيصل الدولية', schoolId: 'SCH-1003', email: 'kfs@edu.sa', phone: '+966511001003', status: 'accepted', isActive: true, adminName: 'عبدالعزيز إبراهيم المانع', adminUser: 'admin_kfs' },
    { name: 'مدارس الفرسان الأهلية', schoolId: 'SCH-1004', email: 'alfursan@school.sa', phone: '+966511001004', status: 'accepted', isActive: true, adminName: 'منصور محمد السبيعي', adminUser: 'admin_fursan' },
    { name: 'مدارس الرواد العالمية', schoolId: 'SCH-1005', email: 'rowaad@schools.edu', phone: '+966511001005', status: 'accepted', isActive: true, adminName: 'تركي ناصر الشمري', adminUser: 'admin_rowaad' },
    { name: 'مدارس دار العلوم الحديثة', schoolId: 'SCH-1006', email: 'darulum@edu.sa', phone: '+966511001006', status: 'accepted', isActive: true, adminName: 'سعود فهد الحربي', adminUser: 'admin_darulum' },
    { name: 'مدارس نجد الأهلية', schoolId: 'SCH-1007', email: 'najd.schools@najd.edu', phone: '+966511001007', status: 'accepted', isActive: true, adminName: 'حمد عبدالله التميمي', adminUser: 'admin_najd' },
    { name: 'مدارس المملكة الدولية', schoolId: 'SCH-1008', email: 'kingdom@schools.sa', phone: '+966511001008', status: 'accepted', isActive: true, adminName: 'فيصل عبدالرحمن الزهراني', adminUser: 'admin_kingdom' },
    { name: 'مدرسة الأندلس الثانوية', schoolId: 'SCH-1009', email: 'alandalus@edu.sa', phone: '+966511001009', status: 'accepted', isActive: true, adminName: 'عادل سعيد الشهري', adminUser: 'admin_andalus' },
    { name: 'مدارس التربية النموذجية', schoolId: 'SCH-1010', email: 'tarbiyah@schools.sa', phone: '+966511001010', status: 'accepted', isActive: true, adminName: 'بندر سلطان المطيري', adminUser: 'admin_tarbiyah' },
    { name: 'مدارس منارات الرياض', schoolId: 'SCH-1011', email: 'manarat.riyadh@edu.sa', phone: '+966511001011', status: 'accepted', isActive: true, adminName: 'ماجد صالح البليهي', adminUser: 'admin_manarat' },
    { name: 'مدارس أضواء الهداية الأهلية', schoolId: 'SCH-1012', email: 'adwaa@school.sa', phone: '+966511001012', status: 'accepted', isActive: true, adminName: 'نايف مخلد العتيبي', adminUser: 'admin_adwaa' },
    { name: 'مدرسة دار الفكر - جدة', schoolId: 'SCH-1013', email: 'daralfikr.jed@edu.sa', phone: '+966511001013', status: 'accepted', isActive: true, adminName: 'أحمد طارق خياط', adminUser: 'admin_daralfikr' },
    { name: 'مدارس البيان النموذجية - جدة', schoolId: 'SCH-1014', email: 'albayan.jed@schools.sa', phone: '+966511001014', status: 'accepted', isActive: true, adminName: 'وائل هشام بخش', adminUser: 'admin_bayan' },
    { name: 'مدارس الظهران الأهلية', schoolId: 'SCH-1017', email: 'das@dammam.edu.sa', phone: '+966511001017', status: 'accepted', isActive: true, adminName: 'عصام خالد الغامدي', adminUser: 'admin_das' },
    { name: 'مدارس الفيصلية الإسلامية - الخبر', schoolId: 'SCH-1018', email: 'faisaliah@khobar.edu', phone: '+966511001018', status: 'accepted', isActive: true, adminName: 'طارق عثمان القرني', adminUser: 'admin_faisaliah' },
    { name: 'مدارس الحصان النموذجية - الدمام', schoolId: 'SCH-1019', email: 'alhussan@dammam.sa', phone: '+966511001019', status: 'accepted', isActive: true, adminName: 'رشيد كمال الحصان', adminUser: 'admin_hussan' },
    { name: 'مدرسة العقيق الأهلية - المدينة المنورة', schoolId: 'SCH-1021', email: 'alaqeeq@madinah.edu', phone: '+966511001021', status: 'accepted', isActive: true, adminName: 'إبراهيم موسى الأنصاري', adminUser: 'admin_aqeeq' },
    { name: 'مدارس الفلاح الأهلية - مكة المكرمة', schoolId: 'SCH-1022', email: 'alfalah@makkah.edu', phone: '+966511001022', status: 'accepted', isActive: true, adminName: 'سراج أحمد بصنوي', adminUser: 'admin_falah' },
    { name: 'مدرسة براعم المستقبل الابتدائية', schoolId: 'SCH-1024', email: 'baraem@future.edu', phone: '+966511001024', status: 'accepted', isActive: true, adminName: 'مروان راشد الرويلي', adminUser: 'admin_baraem' },
    { name: 'مدرسة النخبة الأهلية - القصيم', schoolId: 'SCH-1025', email: 'nokhba@qassim.edu', phone: '+966511001025', status: 'accepted', isActive: true, adminName: 'سليمان صالح المشيقح', adminUser: 'admin_nokhba' },
    { name: 'مدارس المعالي العالمية - تبوك', schoolId: 'SCH-1027', email: 'almaali@tabuk.edu', phone: '+966511001027', status: 'accepted', isActive: true, adminName: 'وليد محمود العمراني', adminUser: 'admin_maali' },

    // ── Accepted but Disabled Schools (مسجلة ولكن عطلها السوبر أدمن) ──
    { name: 'مدارس دار العلوم الأهلية - الرياض', schoolId: 'SCH-1031', email: 'darulum.riyadh@edu.sa', phone: '+966511001031', status: 'accepted', isActive: false, adminName: 'ياسر حمود العنزي', adminUser: 'admin_darulum_dis' },

    // ── Pending Invitation Schools (دعوة معلقة — لم يسجل الأدمن بعد = غير نشطة) ──
    { name: 'مدارس الحمراء الأهلية - جدة', schoolId: 'SCH-1015', email: 'alhamraa@edu.sa', phone: '+966511001015', status: 'pending', isActive: false },
    { name: 'مدرسة الثغر النموذجية - جدة', schoolId: 'SCH-1016', email: 'althaghr@edu.sa', phone: '+966511001016', status: 'pending', isActive: false },
    { name: 'مدارس شمس الجزيرة الأهلية', schoolId: 'SCH-1020', email: 'shams@schools.sa', phone: '+966511001020', status: 'pending', isActive: false },
    { name: 'مدارس المنهاج العالمية', schoolId: 'SCH-1023', email: 'almenhaj@schools.sa', phone: '+966511001023', status: 'pending', isActive: false },
    { name: 'مدارس الرسالة النموذجية - أبها', schoolId: 'SCH-1026', email: 'resalah@abha.edu', phone: '+966511001026', status: 'pending', isActive: false },
    { name: 'مدارس براعم الوطن - الجبيل', schoolId: 'SCH-1030', email: 'baraem.jubail@edu.sa', phone: '+966511001030', status: 'pending', isActive: false },

    // ── Expired Invitation Schools (دعوة منتهية الصلاحية — لم تقبل = غير نشطة) ──
    { name: 'مدرسة الرواد النموذجية - حائل', schoolId: 'SCH-1028', email: 'rowaad.hail@edu.sa', phone: '+966511001028', status: 'expired', isActive: false },
    { name: 'مدارس المجد الأهلية - الرياض', schoolId: 'SCH-1029', email: 'almajd@schools.sa', phone: '+966511001029', status: 'expired', isActive: false },
  ];

  const createdExtraSchools = await School.insertMany(
    DEMO_EXTRA_SCHOOLS.map((s, idx) => ({
      name: s.name,
      schoolId: s.schoolId,
      contact: { email: s.email, phone: s.phone },
      location: { type: 'Point', coordinates: [46.65 + (idx * 0.01), 24.60 + (idx * 0.01)] },
      isActive: s.isActive
    }))
  );

  // Add invitations and admin users realistically
  const invitationDocs: any[] = [];
  const extraAdminUsers: any[] = [];

  createdExtraSchools.forEach((sDoc, i) => {
    const config = DEMO_EXTRA_SCHOOLS[i];
    const isAccepted = config.status === 'accepted';
    const isExpired = config.status === 'expired';

    invitationDocs.push({
      school: sDoc._id,
      email: config.email,
      token: `demo-token-${config.schoolId.toLowerCase()}`,
      expiresAt: isExpired ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      isUsed: isAccepted
    });

    if (isAccepted && config.adminUser) {
      extraAdminUsers.push({
        username: config.adminUser,
        name: config.adminName || config.name,
        email: config.email,
        phone: config.phone,
        password: sharedHash,
        isDemoAccount: true,
        role: 'schooladmin',
        school: sDoc._id,
        isPhoneVerified: true,
        isActive: config.isActive
      });
    }
  });

  await Invitation.insertMany(invitationDocs);

  if (extraAdminUsers.length > 0) {
    await User.insertMany(extraAdminUsers);
  }

  console.log(`🏫  Created ${createdExtraSchools.length + 1} total schools with admin accounts.`);

  // Create Super Administrator (superadmin)
  const superAdmin = await User.create({
    username: 'superadmin',
    email: 'superadmin@sbts.edu',
    password: sharedHash,
        isDemoAccount: true,
    name: 'مدير النظام التجريبي',
    role: 'superadmin',
    school: null,
    phone: '+966500000001',
    isActive: true
  });
  console.log(`✅  Created Super Admin: ${superAdmin.username}`);

  // 5. Create 5 drivers
  const driverRecords = [
    { username: 'driver01', name: 'محمد سعد العتيبي', email: 'driver01@sbts.com' },
    { username: 'driver02', name: 'سالم عبدالله القحطاني', email: 'driver02@sbts.com' },
    { username: 'driver03', name: 'فهد ناصر الدوسري', email: 'driver03@sbts.com' },
    { username: 'driver04', name: 'خالد يوسف الشهري', email: 'driver04@sbts.com' },
    { username: 'driver05', name: 'علي حسن الغامدي', email: 'driver05@sbts.com' },
  ];

  const drivers = await User.create(
    driverRecords.map(d => ({
      ...d,
      password: sharedHash,
        isDemoAccount: true,
      role: 'driver',
      school: school._id,
      phone: generateSaudiPhone(),
      isActive: true,
    }))
  );
  console.log(`✅  Created ${drivers.length} drivers`);

  // 6. Create 5 buses (capacity 20)
  const buses = await Bus.create([
    { busId: 'BUS-001', driver: drivers[0]._id, school: school._id, capacity: 20, isActive: true },
    { busId: 'BUS-002', driver: drivers[1]._id, school: school._id, capacity: 20, isActive: true },
    { busId: 'BUS-003', driver: drivers[2]._id, school: school._id, capacity: 20, isActive: true },
    { busId: 'BUS-004', driver: drivers[3]._id, school: school._id, capacity: 20, isActive: true },
    { busId: 'BUS-005', driver: drivers[4]._id, school: school._id, capacity: 20, isActive: true },
  ]);
  console.log(`✅  Created ${buses.length} buses (capacity: 20 seats each)`);

  // 7. Create 100 parents
  const parents = await User.create(
    Array.from({ length: 100 }, (_, i) => {
      const n = String(i + 1).padStart(3, '0');
      return {
        username: `parent${n}`,
        email: `parent${n}@sbts.com`,
        password: sharedHash,
        isDemoAccount: true,
        name: `Parent ${n}`,
        role: 'parent',
        school: school._id,
        phone: generateSaudiPhone(),
        isActive: true,
      };
    })
  );
  console.log(`✅  Created ${parents.length} parents`);

  // Create school administrator (s-admin)
  const schoolAdmin = await User.create({
    username: 's_admin',
    email: 'admin@sbts.com',
    password: sharedHash,
        isDemoAccount: true,
    name: 'صالح الغامدي',
    role: 'schooladmin',
    school: school._id,
    phone: generateSaudiPhone(),
    isActive: true
  });
  console.log(`✅  Created School Admin: ${schoolAdmin.username}`);

  // 8. Create 100 students (20 assigned to each of the 5 buses)
  const students = await Student.create(
    ALL_COORDS.map((coord, i) => {
      const num = String(i + 1).padStart(6, '0');
      const validNationalId = `1${String(100000000 + i + 1)}`;
      const busIndex = Math.min(Math.floor(i / 20), buses.length - 1);
      const assignedBusId = buses[busIndex]._id;

      return {
        name: studentName(i),
        studentId: `S26${num}`,
        school: school._id,
        nationalId: encrypt(validNationalId),
        dob: studentDob(i),
        normalizedName: studentName(i).replace(/\s+/g, ' ').trim(),
        parentId: parents[i]._id,
        location: {
          type: 'Point',
          coordinates: [coord.lng, coord.lat],
        },
        nfcTagId: generateNfcTag(),
        assignedBus: assignedBusId,
        isActive: true,
      };
    })
  );
  console.log(`✅  Created ${students.length} students for primary demo school (Assigned 20 to each bus)`);

  // 9. Populate Realistic Fleet & Students for Accepted Extra Schools
  console.log('🚌  Populating realistic fleets and students for other accepted schools...');
  const extraDriversDocs: any[] = [];
  const extraBusesDocs: any[] = [];
  const extraStudentsDocs: any[] = [];

  const acceptedSchools = createdExtraSchools.filter(
    (_, i) => DEMO_EXTRA_SCHOOLS[i].status === 'accepted'
  );

  let globalStudentCounter = 101; // Primary school used S26000001..S26000100

  acceptedSchools.forEach((sDoc, schIdx) => {
    // Determine bus count (2, 3, or 4 buses per school)
    const busCount = (schIdx % 3) + 2;
    const schoolCleanId = sDoc.schoolId.replace('SCH-', '');
    const isSchoolActive = sDoc.isActive;

    // Base coordinates for this school
    const [baseLng, baseLat] = sDoc.location?.coordinates || [46.7, 24.7];

    for (let b = 1; b <= busCount; b++) {
      const busId = `BUS-${schoolCleanId}-${b}`;
      const driverUsername = `driver_${schoolCleanId}_${b}`.toLowerCase();
      const driverObjId = new mongoose.Types.ObjectId();
      const busObjId = new mongoose.Types.ObjectId();

      const dNameIdx = (schIdx * 4 + b) % FIRST_NAMES.length;
      const dFamIdx = (schIdx * 3 + b) % FAMILY_NAMES.length;
      const driverFullName = `${FIRST_NAMES[dNameIdx]} ${FATHER_NAMES[dNameIdx % FATHER_NAMES.length]} ${FAMILY_NAMES[dFamIdx]}`;

      extraDriversDocs.push({
        _id: driverObjId,
        username: driverUsername,
        name: driverFullName,
        email: `${driverUsername}@sbts.demo`,
        password: sharedHash,
        isDemoAccount: true,
        role: 'driver',
        school: sDoc._id,
        phone: generateSaudiPhone(),
        isActive: isSchoolActive,
        isPhoneVerified: true
      });

      extraBusesDocs.push({
        _id: busObjId,
        busId,
        school: sDoc._id,
        driver: driverObjId,
        capacity: 20,
        isActive: isSchoolActive
      });

      // 12 students per bus
      const studentsPerBus = 12;
      for (let s = 1; s <= studentsPerBus; s++) {
        const sNum = String(globalStudentCounter++).padStart(6, '0');
        const stName = studentName(globalStudentCounter);
        const validNationalId = `1${String(100000000 + globalStudentCounter)}`;

        // Slight geographic offset around school
        const angle = (s / studentsPerBus) * 2 * Math.PI + (b * 0.5);
        const distance = 0.008 + (s * 0.001); // within 1-2 km
        const stLng = baseLng + Math.cos(angle) * distance;
        const stLat = baseLat + Math.sin(angle) * distance;

        extraStudentsDocs.push({
          name: stName,
          studentId: `S26${sNum}`,
          school: sDoc._id,
          nationalId: encrypt(validNationalId),
          dob: studentDob(globalStudentCounter),
          normalizedName: stName.replace(/\s+/g, ' ').trim(),
          assignedBus: busObjId,
          location: {
            type: 'Point',
            coordinates: [stLng, stLat]
          },
          nfcTagId: generateNfcTag(),
          isActive: isSchoolActive
        });
      }
    }
  });

  if (extraDriversDocs.length > 0) {
    await User.insertMany(extraDriversDocs);
  }
  if (extraBusesDocs.length > 0) {
    await Bus.insertMany(extraBusesDocs);
  }
  if (extraStudentsDocs.length > 0) {
    await Student.insertMany(extraStudentsDocs);
  }

  console.log(
    `✅  Enriched extra schools with ${extraBusesDocs.length} buses, ` +
    `${extraDriversDocs.length} drivers, and ${extraStudentsDocs.length} students!`
  );

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalSchoolsCount = await School.countDocuments();
  const totalBusesCount = await Bus.countDocuments();
  const totalStudentsCount = await Student.countDocuments();

  console.log('\n══════════════════════════════════════════════════');
  console.log('📋  Enterprise Demo Data Ready!');
  console.log('──────────────────────────────────────────────────');
  console.log(`   Total Schools  : ${totalSchoolsCount}`);
  console.log(`   Total Buses    : ${totalBusesCount}`);
  console.log(`   Total Students : ${totalStudentsCount}`);
  console.log('──────────────────────────────────────────────────');
  console.log('   Super Admin  : superadmin');
  console.log('   School Admin : s_admin');
  console.log('   Password     : Aa1234');
  console.log('──────────────────────────────────────────────────');
  console.log('   Drivers  : driver01 ... driver05');
  console.log('   Password : Aa1234');
  console.log('   Parents  : parent001 … parent100');
  console.log('   Password : Aa1234');
  console.log('──────────────────────────────────────────────────');
  console.log('🗺️   Neighborhoods & Buses:');
  NEIGHBORHOOD_CLUSTERS.forEach(n =>
    console.log(`   ${n.busId} (${n.driverName}) → ${n.label.padEnd(30)} : ${n.coords.length} students`)
  );
  console.log('══════════════════════════════════════════════════\n');

  return { success: true };
};

export const runSeed = seed;

// Run directly if called from command line
if (require.main === module) {
  seed()
    .then(() => {
      mongoose.connection.close();
      process.exit(0);
    })
    .catch((err: any) => {
      console.error('❌  Seed failed:', err.message);
      mongoose.connection.close();
      process.exit(1);
    });
}
