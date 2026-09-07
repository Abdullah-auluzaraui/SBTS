import { encrypt, decrypt, maskData } from '../../src/utils/crypto';

describe('crypto (أدوات التشفير وحماية البيانات الحساسة)', () => {
  describe('encrypt & decrypt (التشفير وفك التشفير)', () => {
    it('يقوم بتشفير النص وفك تشفيره ليعود مطابقاً للأصل تماماً (Round-trip)', () => {
      const originalPhone = '0501234567';
      const encrypted = encrypt(originalPhone);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalPhone);
      expect(encrypted).toContain(':'); // بصيغة iv:ciphertext

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalPhone);
    });

    it('ينتج نصوصاً مشفرة مختلفة لنفس المدخل عند تكرار التشفير (بسبب عشوائية IV)', () => {
      const secret = '1012345678';
      const encrypted1 = encrypt(secret);
      const encrypted2 = encrypt(secret);

      // يجب أن يكون التشفيران مختلفين تماماً لمنع هجمات التحليل الإحصائي
      expect(encrypted1).not.toBe(encrypted2);

      // لكن كلاهما يفك تشفيره لنفس القيمة الأصلية
      expect(decrypt(encrypted1)).toBe(secret);
      expect(decrypt(encrypted2)).toBe(secret);
    });

    it('يدعم تشفير وفك تشفير النصوص العربية بدقة (ترميز UTF-8)', () => {
      const arabicText = 'الطالب: محمد عبد الله السبيعي';
      const encrypted = encrypt(arabicText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(arabicText);
    });

    it('يدعم مفاتيح التشفير ذات طول 64 محرف سداسي عشري (64 hex characters = 32 bytes)', () => {
      const originalEnvKey = process.env.ENCRYPTION_KEY;
      try {
        let isolatedCrypto: typeof import('../../src/utils/crypto');
        jest.isolateModules(() => {
          process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
          isolatedCrypto = require('../../src/utils/crypto');
        });
        const enc = isolatedCrypto!.encrypt('اختبار مفتاح سداسي');
        expect(isolatedCrypto!.decrypt(enc)).toBe('اختبار مفتاح سداسي');
      } finally {
        process.env.ENCRYPTION_KEY = originalEnvKey;
      }
    });

    it('يتعامل بأمان مع القيم الفارغة دون أخطاء', () => {
      expect(encrypt('')).toBe('');
      // @ts-expect-error اختبار قيمة null
      expect(encrypt(null)).toBe(null);
      expect(decrypt('')).toBe('');
      // @ts-expect-error اختبار قيمة null
      expect(decrypt(null)).toBe(null);
    });

    it('يرجع نصاً فارغاً بأمان دون انهيار النظام عند تمرير نص تالف أو غير مشفر إلى decrypt', () => {
      // إخفاء الـ console.error أثناء هذا الاختبار لتجنب تلويث التقرير
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const corruptData = 'invalid_format_string';
      const badHex = '1234:notahexstring';
      const randomGarbage = 'badivhex1234567890123456789012:badcipher1234';

      expect(decrypt(corruptData)).toBe('');
      expect(decrypt(badHex)).toBe('');
      expect(decrypt(randomGarbage)).toBe('');

      consoleSpy.mockRestore();
    });
  });

  describe('maskData (حجب البيانات الحساسة وإخفاؤها جزئياً)', () => {
    it('يحجب رقم الهوية الوطنية المكون من 10 أرقام ويُبقي فقط آخر 4 أرقام', () => {
      const nationalId = '1098765432';
      const masked = maskData(nationalId);

      expect(masked).toBe('******5432');
      expect(masked.length).toBe(10);
    });

    it('يحجب رقم الجوال ويُظهر فقط آخر 4 أرقام', () => {
      const phone = '0555123456';
      const masked = maskData(phone);

      expect(masked).toBe('******3456');
    });

    it('يُبقي النص كما هو إذا كان طوله 4 أحرف أو أقل', () => {
      expect(maskData('1234')).toBe('1234');
      expect(maskData('123')).toBe('123');
      expect(maskData('A')).toBe('A');
    });

    it('يرجع النص كما هو بأمان إذا كان فارغاً', () => {
      expect(maskData('')).toBe('');
      // @ts-expect-error اختبار قيمة null
      expect(maskData(null)).toBe(null);
    });
  });
});
