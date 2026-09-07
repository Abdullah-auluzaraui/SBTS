import { normalizeArabicName, isValidSaudiId, convertArabicDigitsToEnglish } from '../../src/utils/textUtils';

describe('textUtils (معالجة النصوص العربية والتحقق من الهويات)', () => {
  describe('convertArabicDigitsToEnglish (تحويل الأرقام العربية المشرقية إلى إنجليزية)', () => {
    it('يحول الأرقام العربية (٠-٩) إلى أرقام إنجليزية قياسية (0-9)', () => {
      expect(convertArabicDigitsToEnglish('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
      expect(convertArabicDigitsToEnglish('٠٥٠١٢٣٤٥٦٧')).toBe('0501234567');
    });

    it('يتعامل بنجاح مع نصوص مختلطة بأرقام وحروف', () => {
      expect(convertArabicDigitsToEnglish('طالب رقم ١٢٣ و 45')).toBe('طالب رقم 123 و 45');
    });

    it('يرجع نصاً فارغاً بأمان عند تمرير قيم غير صالحة', () => {
      expect(convertArabicDigitsToEnglish('')).toBe('');
      // @ts-expect-error اختبار قيمة null
      expect(convertArabicDigitsToEnglish(null)).toBe('');
      // @ts-expect-error اختبار نوع غير نصي
      expect(convertArabicDigitsToEnglish(12345)).toBe('');
    });
  });

  describe('normalizeArabicName (توحيد ومعالجة الأسماء العربية)', () => {
    it('يحذف علامات التشكيل (الفتحة، الضمة، الكسرة، الشدة، التنوين)', () => {
      const withTashkeel = 'مُحَمَّدٌ عَبْدُ الرَّحْمَٰنِ';
      const normalized = normalizeArabicName(withTashkeel);
      expect(normalized).toBe('محمد عبد الرحمن');
    });

    it('يحذف التطويل / الكشيدة (ـ) لمنع تكرار الأسماء المزخرفة', () => {
      expect(normalizeArabicName('مـحـمـد')).toBe('محمد');
      expect(normalizeArabicName('ســـارة')).toBe('ساره');
    });

    it('يُوحد همزات الألف المختلفة (أ، إ، آ، ٱ) إلى ألف مجردة (ا)', () => {
      expect(normalizeArabicName('أحمد')).toBe('احمد');
      expect(normalizeArabicName('إبراهيم')).toBe('ابراهيم');
      expect(normalizeArabicName('آدم')).toBe('ادم');
      expect(normalizeArabicName('ٱلرياض')).toBe('الرياض'); // همزة الوصل
    });

    it('يُوحد التاء المربوطة (ة) إلى هاء (ه)', () => {
      expect(normalizeArabicName('فاطمة')).toBe('فاطمه');
      expect(normalizeArabicName('مدرسة')).toBe('مدرسه');
    });

    it('يُوحد الألف المقصورة (ى) إلى ياء (ي)', () => {
      expect(normalizeArabicName('منى')).toBe('مني');
      expect(normalizeArabicName('مصطفى')).toBe('مصطفي');
      expect(normalizeArabicName('هدى')).toBe('هدي');
    });

    it('ينظف المسافات الزائدة من البداية والنهاية والوسط', () => {
      const spaced = '   سارة    عبدالله    الغامدي   ';
      expect(normalizeArabicName(spaced)).toBe('ساره عبدالله الغامدي');
    });

    it('يرجع نصاً فارغاً بأمان إذا كان المدخل فارغاً أو نوعاً غير نصي (حماية من الانهيار)', () => {
      expect(normalizeArabicName('')).toBe('');
      // @ts-expect-error اختبار قيمة null
      expect(normalizeArabicName(null)).toBe('');
      // @ts-expect-error اختبار قيمة undefined
      expect(normalizeArabicName(undefined)).toBe('');
      // @ts-expect-error اختبار تمرير رقم كاسم طالب
      expect(normalizeArabicName(999)).toBe('');
    });
  });

  describe('isValidSaudiId (التحقق من صحة رقم الهوية الوطنية والإقامة)', () => {
    it('يقبل رقم هوية مواطن صالح بالأرقام الإنجليزية (يبدأ بـ 1 ومكون من 10 أرقام)', () => {
      expect(isValidSaudiId('1012345678')).toBe(true);
      expect(isValidSaudiId('1198765432')).toBe(true);
    });

    it('يقبل رقم هوية مواطن مدخل بالأرقام العربية (سيناريو كيبورد الجوال العربي)', () => {
      expect(isValidSaudiId('١٠١٢٣٤٥٦٧٨')).toBe(true);
      expect(isValidSaudiId('١١٩٨٧٦٥٤٣٢')).toBe(true);
    });

    it('يقبل رقم هوية مقيم صالح (يبدأ بـ 2 ومكون من 10 أرقام)', () => {
      expect(isValidSaudiId('2012345678')).toBe(true);
      expect(isValidSaudiId('٢٤٥٦٧٨٩٠١٢')).toBe(true);
    });

    it('يرفض الهويات التي تبدأ برقم غير 1 أو 2 (مثل 3 أو 0 أو غيرها)', () => {
      expect(isValidSaudiId('3012345678')).toBe(false);
      expect(isValidSaudiId('٣٠١٢٣٤٥٦٧٨')).toBe(false);
      expect(isValidSaudiId('0123456789')).toBe(false);
      expect(isValidSaudiId('5012345678')).toBe(false);
    });

    it('يرفض الهويات التي يقل طولها عن 10 أرقام', () => {
      expect(isValidSaudiId('12345')).toBe(false);
      expect(isValidSaudiId('١٢٣٤٥')).toBe(false);
      expect(isValidSaudiId('101234567')).toBe(false); // 9 أرقام
    });

    it('يرفض الهويات التي يزيد طولها عن 10 أرقام', () => {
      expect(isValidSaudiId('10123456789')).toBe(false); // 11 رقم
    });

    it('يرفض النصوص التي تحتوي على أحرف أو رموز خاصة', () => {
      expect(isValidSaudiId('101234567a')).toBe(false);
      expect(isValidSaudiId('10123-4567')).toBe(false);
      expect(isValidSaudiId('10123 4567')).toBe(false);
    });

    it('يقبل الرقم إذا احتوى على مسافات زائدة في البداية أو النهاية (عبر trim)', () => {
      expect(isValidSaudiId('  1012345678  ')).toBe(true);
      expect(isValidSaudiId('  ١٠١٢٣٤٥٦٧٨  ')).toBe(true);
    });

    it('يرفض بأمان القيم الفارغة أو غير النصية دون أخطاء', () => {
      expect(isValidSaudiId('')).toBe(false);
      expect(isValidSaudiId('   ')).toBe(false);
      // @ts-expect-error اختبار قيمة null
      expect(isValidSaudiId(null)).toBe(false);
      // @ts-expect-error اختبار قيمة undefined
      expect(isValidSaudiId(undefined)).toBe(false);
      // @ts-expect-error اختبار تمرير رقم بدل نص
      expect(isValidSaudiId(1012345678)).toBe(false);
    });
  });
});
