import mongoose from 'mongoose';
import Attendance from '../models/Attendance';
import School from '../models/School';
import puppeteer from 'puppeteer';
import { AppError } from '../utils/AppError';

// Bilingual label dictionary for the PDF report
interface IReportLabel {
  dir: 'rtl' | 'ltr';
  align: 'right' | 'left';
  font: string;
  fontLink: string | null;
  locale: string;
  title: string;
  period: string;
  bus: string;
  tripTypeLabel: string;
  toSchool: string;
  toHome: string;
  issued: string;
  totalRecords: string;
  totalStat: string;
  events: Record<string, string>;
  headers: string[];
  manual: string;
  footer: string;
  rangeError: string;
  sizeError: string;
  pdfError: string;
}

const REPORT_LABELS: Record<'ar' | 'en', IReportLabel> = {
  ar: {
    dir: 'rtl', align: 'right', font: "'Cairo', sans-serif",
    fontLink: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap',
    locale: 'ar-SA',
    title: 'تقرير سجل الحضور',
    period: 'الفترة', bus: 'الحافلة', tripTypeLabel: 'نوع الرحلة',
    toSchool: 'ذهاب', toHome: 'عودة',
    issued: 'تاريخ الإصدار', totalRecords: 'إجمالي السجلات', totalStat: 'الإجمالي',
    events: { boarding: 'صعود', exit: 'نزول', absent: 'غائب', arrived_home: 'وصل للمنزل', no_board: 'لم يصعد', no_receiver: 'بدون مُستَلِم' },
    headers: ['الطالب', 'رقم الطالب', 'الحافلة', 'السائق', 'نوع الرحلة', 'الحدث', 'الطريقة', 'التاريخ والوقت'],
    manual: 'يدوي',
    footer: 'تم إنشاء هذا التقرير تلقائياً بواسطة نظام SBTS',
    rangeError: 'النطاق الزمني كبير جداً. يرجى تقليل المدة إلى 30 يومًا أو أقل.',
    sizeError: 'حجم التقرير كبير جداً. يرجى تضييق نطاق البحث بتحديد حافلة معينة أو تقليل عدد الأيام.',
    pdfError: 'فشل توليد التقرير'
  },
  en: {
    dir: 'ltr', align: 'left', font: "system-ui, sans-serif",
    fontLink: null,
    locale: 'en-US',
    title: 'Attendance Report',
    period: 'Period', bus: 'Bus', tripTypeLabel: 'Trip Type',
    toSchool: 'To School', toHome: 'To Home',
    issued: 'Issued on', totalRecords: 'Total Records', totalStat: 'Total',
    events: { boarding: 'Boarding', exit: 'Exit', absent: 'Absent', arrived_home: 'Arrived Home', no_board: 'Did Not Board', no_receiver: 'No Receiver' },
    headers: ['Student', 'Student ID', 'Bus', 'Driver', 'Trip Type', 'Event', 'Method', 'Date & Time'],
    manual: 'Manual',
    footer: 'This report was generated automatically by the SBTS system.',
    rangeError: 'Date range too large. Please reduce to 30 days or fewer.',
    sizeError: 'Report size too large. Please narrow your search by selecting a specific bus or fewer days.',
    pdfError: 'Failed to generate the report'
  }
};

interface IPopulatedAttendance {
  _id: mongoose.Types.ObjectId;
  school: mongoose.Types.ObjectId;
  student: {
    _id: mongoose.Types.ObjectId;
    name: string;
    studentId: string;
  } | null;
  bus: {
    _id: mongoose.Types.ObjectId;
    busId: string;
  } | null;
  driver: {
    _id: mongoose.Types.ObjectId;
    name: string;
  } | null;
  trip: mongoose.Types.ObjectId | null;
  event: 'boarding' | 'exit' | 'absent' | 'arrived_home' | 'no_board' | 'no_receiver';
  tripType: 'to_school' | 'to_home' | null;
  timestamp: Date;
  recordedBy: 'NFC' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

interface IAttendanceQuery {
  school: string;
  bus?: string;
  student?: string;
  tripType?: string;
  timestamp?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export class AttendanceService {
  static async listAttendance(schoolId: string, filters: {
    busId?: string;
    studentId?: string;
    dateFrom?: string;
    dateTo?: string;
    tripType?: string;
    page?: number;
    limit?: number;
  }) {
    const { busId, studentId, dateFrom, dateTo, tripType, page = 1, limit = 50 } = filters;
    const query: IAttendanceQuery = { school: schoolId };

    if (busId) query.bus = busId;
    if (studentId) query.student = studentId;
    if (tripType && ['to_school', 'to_home'].includes(tripType)) {
      query.tripType = tripType;
    }

    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('student', 'name studentId')
        .populate('bus', 'busId')
        .populate('driver', 'name')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Attendance.countDocuments(query)
    ]);

    return {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    };
  }

  static async generateReport(schoolId: string, filters: {
    busId?: string;
    tripType?: string;
    dateFrom?: string;
    dateTo?: string;
    lang?: 'ar' | 'en';
  }) {
    const { busId, tripType, lang = 'ar' } = filters;
    let { dateFrom, dateTo } = filters;

    const L = REPORT_LABELS[lang] || REPORT_LABELS.ar;

    const startOfDay = (d: Date | string | number) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const endOfDay   = (d: Date | string | number) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

    const today = new Date();
    let dateFromParsed: Date;
    let dateToParsed: Date;

    if (!dateFrom && !dateTo) {
      dateFromParsed = startOfDay(today);
      dateToParsed   = endOfDay(today);
    } else if (dateFrom && !dateTo) {
      dateFromParsed = startOfDay(new Date(dateFrom));
      dateToParsed   = endOfDay(today);
    } else if (!dateFrom && dateTo) {
      dateToParsed   = endOfDay(new Date(dateTo));
      dateFromParsed = startOfDay(new Date(dateTo));
    } else {
      dateFromParsed = startOfDay(new Date(dateFrom!));
      dateToParsed   = endOfDay(new Date(dateTo!));
    }

    const diffDays = (dateToParsed.getTime() - dateFromParsed.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      throw new AppError(400, 'INVALID_INPUT', L.rangeError);
    }

    const query: IAttendanceQuery = { school: schoolId, timestamp: { $gte: dateFromParsed, $lte: dateToParsed } };
    if (busId) query.bus = busId;
    if (tripType && ['to_school', 'to_home'].includes(tripType)) query.tripType = tripType;

    const count = await Attendance.countDocuments(query);
    if (count > 5000) {
      throw new AppError(400, 'INVALID_INPUT', L.sizeError);
    }

    const [school, records] = await Promise.all([
      School.findById(schoolId).select('name').lean(),
      Attendance.find(query)
        .populate('student', 'name studentId')
        .populate('bus', 'busId')
        .populate('driver', 'name')
        .sort({ timestamp: -1 })
        .lean()
    ]);

    const stats: Record<string, number> = {};
    records.forEach(r => { stats[r.event] = (stats[r.event] || 0) + 1; });

    const schoolName = school?.name || '';
    const typedRecords = records as unknown as IPopulatedAttendance[];
    const busLabel = typedRecords.find(r => r.bus)?.bus?.busId || busId || '';
    const filterMeta = [
      `${L.period}: ${dateFromParsed.toLocaleDateString(L.locale)} — ${dateToParsed.toLocaleDateString(L.locale)}`,
      busId    ? `${L.bus}: ${busLabel}`                                              : null,
      tripType ? `${L.tripTypeLabel}: ${tripType === 'to_school' ? L.toSchool : L.toHome}` : null
    ].filter(Boolean).join('  |  ');

    const statsHtml = Object.entries(L.events)
      .map(([key, label]) => `
        <div class="stat-box">
          <div class="stat-num">${stats[key] || 0}</div>
          <div class="stat-label">${label}</div>
        </div>`)
      .join('');

    const rowsHtml = typedRecords.map(r => `
      <tr>
        <td>${r.student?.name || '—'}</td>
        <td dir="ltr">${r.student?.studentId || '—'}</td>
        <td>${r.bus?.busId || '—'}</td>
        <td>${r.driver?.name || '—'}</td>
        <td>${r.tripType === 'to_school' ? L.toSchool : r.tripType === 'to_home' ? L.toHome : '—'}</td>
        <td>${L.events[r.event] || r.event}</td>
        <td>${r.recordedBy === 'NFC' ? 'NFC' : L.manual}</td>
        <td dir="ltr">${new Date(r.timestamp).toLocaleString(L.locale)}</td>
      </tr>`).join('');

    const thHtml = L.headers.map((h: string) => `<th>${h}</th>`).join('');

    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${L.dir}">
<head>
  <meta charset="UTF-8"/>
  ${L.fontLink ? `<link rel="preconnect" href="https://fonts.googleapis.com"/><link href="${L.fontLink}" rel="stylesheet"/>` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${L.font}; direction: ${L.dir}; color: #1e293b; padding: 32px; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; margin-bottom: 16px; }
    .header h1 { font-size: 20px; font-weight: 700; color: #1e40af; }
    .header .meta { font-size: 11px; color: #64748b; text-align: ${lang === 'ar' ? 'left' : 'right'}; }
    .filters { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; font-size: 11px; color: #475569; }
    .stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat-box { flex: 1; min-width: 100px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; text-align: center; }
    .stat-num { font-size: 22px; font-weight: 700; color: #1d4ed8; }
    .stat-label { font-size: 11px; color: #3b82f6; margin-top: 4px; }
    .total-box { background: #1e40af; color: white; border: none; }
    .total-box .stat-num, .total-box .stat-label { color: white; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead { background: #1e40af; color: white; }
    th { padding: 10px 8px; text-align: ${L.align}; font-weight: 700; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: ${L.align}; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${L.title}</h1>
      <div style="font-size:13px;color:#64748b;margin-top:4px">${schoolName}</div>
    </div>
    <div class="meta">
      ${L.issued}: ${new Date().toLocaleString(L.locale)}<br/>
      ${L.totalRecords}: ${records.length}
    </div>
  </div>
  <div class="filters">${filterMeta}</div>
  <div class="stats">
    <div class="stat-box total-box">
      <div class="stat-num">${records.length}</div>
      <div class="stat-label">${L.totalStat}</div>
    </div>
    ${statsHtml}
  </div>
  <table>
    <thead><tr>${thHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">${L.footer}</div>
</body>
</html>`;

    let browser;
    try {
      browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16px', bottom: '16px', left: '16px', right: '16px' } });
      return { pdfBuffer, dateLabel: dateFromParsed.toISOString().slice(0, 10) };
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', L.pdfError);
    } finally {
      if (browser) await browser.close();
    }
  }
}
