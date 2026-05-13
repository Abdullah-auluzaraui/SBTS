const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const School = require('./models/School');
const User = require('./models/User');
const Student = require('./models/Student');
const Bus = require('./models/Bus');
const { encrypt } = require('./utils/crypto');

// ── Saudi Phone Number Generator ───────────────────────────────────────
function generateSaudiPhone() {
  // Format: +9665XXXXXXXX or 05XXXXXXXX
  const prefix = Math.random() > 0.5 ? '+9665' : '05';
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${suffix}`;
}

// ── NFC Tag ID Generator ────────────────────────────────────────────────
function generateNfcTag() {
  // Generate random hex string like "A1B2C3D4E5F6"
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

function studentName(i) {
  const first  = FIRST_NAMES[i % FIRST_NAMES.length];
  const father = FATHER_NAMES[i % FATHER_NAMES.length];
  const family = FAMILY_NAMES[Math.floor(i / FIRST_NAMES.length) % FAMILY_NAMES.length];
  return `${first} ${father} ${family}`; // اسم ثلاثي
}

// ── Geographic spread: Realistic random scatter around a residential center ──
function scatterInNeighborhood(centerLat, centerLng, count) {
  return Array.from({ length: count }, () => {
    const latOffset = (Math.random() - 0.5) * 0.012; 
    const lngOffset = (Math.random() - 0.5) * 0.015; 
    return {
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
    };
  });
}

// ── South Riyadh Neighborhoods (Al-Shifa & surroundings) ───────────
const NEIGHBORHOODS = [
  { label: 'حي الشفا (وسط)', lat: 24.5375, lng: 46.7150, count: 20 },
  { label: 'حي بدر',       lat: 24.5260, lng: 46.7210, count: 20 },
  { label: 'حي المروة',     lat: 24.5450, lng: 46.7350, count: 20 },
  { label: 'حي الحزم',      lat: 24.5420, lng: 46.6850, count: 20 },
  { label: 'حي أحد',       lat: 24.5150, lng: 46.7300, count: 20 }, // المجموع أصبح 100
];

// Flatten to 100 coordinate objects
const ALL_COORDS = NEIGHBORHOODS.flatMap(n => scatterInNeighborhood(n.lat, n.lng, n.count));

// ── DOB distribution across 2010-2014 ────────────────────────────────────
const DOB_YEARS = [2010, 2011, 2012, 2013, 2014];

function studentDob(i) {
  const year  = DOB_YEARS[i % DOB_YEARS.length];
  const month = (i % 12) + 1;       
  const day   = (i % 28) + 1;       
  return new Date(year, month - 1, day);
}

// ── Main seed function ────────────────────────────────────────────────────
const seed = async () => {
  await connectDB();

  // 1. Locate the first active school or create one if none exists
  let school = await School.findOne({ isActive: true });
  if (!school) {
    console.log('🏫  No active school found. Creating a default demo school...');
    school = await School.create({
      name: 'مدرسة الشفا النموذجية',
      schoolId: 'SCH-0001',
      contact: {
        phone: '+966500000000',
        email: 'alshifa@school.com'
      },
      location: { type: 'Point', coordinates: [46.7150, 24.5370] },
      isActive: true
    });
  }
  console.log(`🏫  School found or created: ${school.name} (${school.schoolId})`);

  // 2. Set school location to Al-Shifa, South Riyadh + contact info
  await School.findByIdAndUpdate(school._id, {
    location: { type: 'Point', coordinates: [46.7150, 24.5370] },
    emergencyContacts: [
      { name: 'أحمد محمد العتيبي', phone: '+966501234567' },
      { name: 'عبدالله سالم القحطاني', phone: '+966502345678' }
    ]
  });
  console.log('📍  School location set → 24.5370° N, 46.7150° E (حي الشفا)');

  // 3. Clear previous demo data (تنظيف شامل وعميق)
  const [delBuses, delUsers, delStudents] = await Promise.all([
    Bus.deleteMany({ busId: { $in: ['BUS-001', 'BUS-002', 'BUS-003', 'BUS-004', 'BUS-005'] } }),
    User.deleteMany({ 
      $or: [
        { role: { $in: ['driver', 'parent'] } },
        { role: 'schooladmin', school: school._id },
        { username: 's-admin' }
      ]
    }), 
    
    // مسح جميع الطلاب الذين يبدأ الـ ID حقهم بـ S26 بغض النظر عن المدرسة لتفادي أي تعارض
    Student.deleteMany({ studentId: { $regex: /^S26/ } }),
  ]);
  console.log(
    `🗑️   Cleared: ${delBuses.deletedCount} buses, ` +
    `${delUsers.deletedCount} users (including schooladmin), ` +
    `${delStudents.deletedCount} students`
  );

  // 4. Hash passwords once
  const sharedHash = await bcrypt.hash('Aa1234', 10);

  // 5. Create 5 drivers
  const driverRecords = [
    { username: 'driver01', name: 'محمد سعد العتيبي',      email: 'driver01@sbts.com' },
    { username: 'driver02', name: 'سالم عبدالله القحطاني', email: 'driver02@sbts.com' },
    { username: 'driver03', name: 'فهد ناصر الدوسري',      email: 'driver03@sbts.com' },
    { username: 'driver04', name: 'خالد يوسف الشهري',      email: 'driver04@sbts.com' },
    { username: 'driver05', name: 'علي حسن الغامدي',       email: 'driver05@sbts.com' },
  ];

  const drivers = await User.create(
    driverRecords.map(d => ({
      ...d,
      password: sharedHash,
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
        email:    `parent${n}@sbts.com`,
        password: sharedHash,
        name:     `Parent ${n}`,
        role:     'parent',
        school:   school._id,
        phone:    generateSaudiPhone(),
        isActive: true,
      };
    })
  );
  console.log(`✅  Created ${parents.length} parents`);

  // Create school administrator (s-admin)
  const schoolAdmin = await User.create({
    username: 's-admin',
    email: 'admin@sbts.com',
    password: sharedHash,
    name: 'مدير المدرسة',
    role: 'schooladmin',
    school: school._id,
    phone: generateSaudiPhone(),
    isActive: true
  });
  console.log(`✅  Created School Admin: ${schoolAdmin.username}`);

  // 8. Create 100 students 
  const students = await Student.create(
    ALL_COORDS.map((coord, i) => {
      const num = String(i + 1).padStart(6, '0');
      
      // توليد رقم هوية من 10 أرقام بشكل صحيح (يبدأ بـ 1 وبعده 9 أرقام)
      const validNationalId = `1${String(100000000 + i + 1)}`; 

      return {
        name:           studentName(i),
        studentId:      `S26${num}`,
        school:         school._id,
        nationalId:     encrypt(validNationalId),
        dob:            studentDob(i),
        normalizedName: studentName(i).replace(/\s+/g, ' ').trim(),
        parentId:       parents[i]._id,
        location: {
          type:        'Point',
          coordinates: [coord.lng, coord.lat],
        },
        nfcTagId:       generateNfcTag(),
        assignedBus: null,
        isActive:    true,
      };
    })
  );
  console.log(`✅  Created ${students.length} students (Three-part names, DOBs 2010-2014)`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('📋  Demo data ready!');
  console.log('──────────────────────────────────────────────────');
  console.log('   School Admin : s-admin');
  console.log('   Password     : Aa1234');
  console.log('──────────────────────────────────────────────────');
  console.log('   Drivers  : driver01 ... driver05');
  console.log('   Password : Aa1234');
  console.log('   Parents  : parent001 … parent100');
  console.log('   Password : Aa1234');
  console.log('──────────────────────────────────────────────────');
  console.log('🗺️   Neighborhoods:');
  NEIGHBORHOODS.forEach(n =>
    console.log(`   ${n.label.padEnd(20)} → ${n.count} students`)
  );
  console.log('══════════════════════════════════════════════════\n');

  mongoose.connection.close();
};

seed().catch(err => {
  console.error('❌  Seed failed:', err.message);
  mongoose.connection.close();
  process.exit(1);
});