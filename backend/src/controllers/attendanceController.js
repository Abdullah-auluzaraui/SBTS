const Attendance = require('../models/Attendance');
const School     = require('../models/School');
const puppeteer  = require('puppeteer');

// BE-S2-8: GET /api/attendance — List attendance records (scoped, filtered, paginated)
exports.list = async (req, res) => {
  try {
    const { busId, studentId, dateFrom, dateTo, tripType, page = 1, limit = 50 } = req.query;

    // Build query — always scoped to school
    const query = { school: req.schoolId };

    if (busId) query.bus = busId;
    if (studentId) query.student = studentId;
    if (tripType && ['to_school', 'to_home'].includes(tripType)) {
      query.tripType = tripType;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('student', 'name studentId')
        .populate('bus', 'busId')
        .populate('driver', 'name')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(query)
    ]);

    res.json({
      success: true,
      attendance: records,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/report — Generate and stream a PDF attendance report
// ─────────────────────────────────────────────────────────────────────────────
// Bilingual label dictionary for the PDF report
const REPORT_LABELS = {
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

exports.generateReport = async (req, res) => {
  try {
    const { busId, tripType } = req.query;
    let { dateFrom, dateTo } = req.query;

    // ── Language ──────────────────────────────────────────────────────────
    const lang = req.query.lang === 'en' ? 'en' : 'ar';
    const L = REPORT_LABELS[lang];

    // ── أ) تحديد التواريخ (الـ Backend مصدر الحقيقة) ──────────────────────
    const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const endOfDay   = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

    const today = new Date();
    if (!dateFrom && !dateTo) {
      dateFrom = startOfDay(today);
      dateTo   = endOfDay(today);
    } else if (dateFrom && !dateTo) {
      dateFrom = startOfDay(new Date(dateFrom));
      dateTo   = endOfDay(today);
    } else if (!dateFrom && dateTo) {
      dateTo   = endOfDay(new Date(dateTo));
      dateFrom = startOfDay(new Date(dateTo));
    } else {
      dateFrom = startOfDay(new Date(dateFrom));
      dateTo   = endOfDay(new Date(dateTo));
    }

    // ── ب) Validation: نطاق زمني ──────────────────────────────────────────
    const diffDays = (dateTo - dateFrom) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      return res.status(400).json({ success: false, message: L.rangeError });
    }

    // ── ج) بناء الـ query (مع إجبارية schoolId) ──────────────────────────
    const query = { school: req.schoolId, timestamp: { $gte: dateFrom, $lte: dateTo } };
    if (busId)    query.bus      = busId;
    if (tripType && ['to_school', 'to_home'].includes(tripType)) query.tripType = tripType;

    // ── Debug: inspect the exact query sent to MongoDB ────────────────────
    console.log('[attendance/report] query:', JSON.stringify(query));

    // ── د) فحص حجم البيانات ────────────────────────────────────────────────
    const count = await Attendance.countDocuments(query);
    if (count > 5000) {
      return res.status(400).json({ success: false, message: L.sizeError });
    }

    // ── هـ) جلب البيانات ──────────────────────────────────────────────────
    const [school, records] = await Promise.all([
      School.findById(req.schoolId).select('name').lean(),
      Attendance.find(query)
        .populate('student', 'name studentId')
        .populate('bus', 'busId')
        .populate('driver', 'name')
        .sort({ timestamp: -1 })
        .lean()
    ]);

    // ── و) الإحصائيات ─────────────────────────────────────────────────────
    const stats = {};
    records.forEach(r => { stats[r.event] = (stats[r.event] || 0) + 1; });

    // ── ز) بناء الـ HTML ──────────────────────────────────────────────────
    const schoolName = school?.name || '';
    const busLabel   = records.find(r => r.bus)?.bus?.busId || busId || '';
    const filterMeta = [
      `${L.period}: ${dateFrom.toLocaleDateString(L.locale)} — ${dateTo.toLocaleDateString(L.locale)}`,
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

    const rowsHtml = records.map(r => `
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

    const thHtml = L.headers.map(h => `<th>${h}</th>`).join('');

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

    // ── ح) توليد الـ PDF عبر Puppeteer ───────────────────────────────────
    let browser;
    try {
      browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16px', bottom: '16px', left: '16px', right: '16px' } });

      const dateLabel = dateFrom.toISOString().slice(0, 10);
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="attendance-report-${dateLabel}.pdf"`);
      res.send(pdfBuffer);
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
      res.status(500).json({ success: false, message: L.pdfError });
    } finally {
      if (browser) await browser.close();
    }

  } catch (err) {
    console.error('generateReport error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
