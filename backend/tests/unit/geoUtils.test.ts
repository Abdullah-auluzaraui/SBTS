import { haversineDistance, bearingTo, bearingDelta, calculateSpeedKmH } from '../../src/utils/geoUtils';

describe('geoUtils (دوال الجغرافيا والحسابات المكانية)', () => {
  describe('haversineDistance (حساب المسافة بين نقطتين)', () => {
    it('يحسب المسافة بين مدينتين معروفتين (الرياض وجدة ≈ 840-860 كم)', () => {
      // إحداثيات الرياض وجدة
      const riyadh = { lat: 24.7136, lng: 46.6753 };
      const jeddah = { lat: 21.4858, lng: 39.1925 };

      const distanceMeters = haversineDistance(riyadh.lat, riyadh.lng, jeddah.lat, jeddah.lng);
      const distanceKm = distanceMeters / 1000;

      // المسافة المباشرة (Great Circle) بين الرياض وجدة حوالي 850 كم
      expect(distanceKm).toBeGreaterThan(840);
      expect(distanceKm).toBeLessThan(860);
    });

    it('يرجع 0 عند حساب المسافة بين نفس النقطة (الباص متوقف في نفس المكان)', () => {
      const distance = haversineDistance(24.7136, 46.6753, 24.7136, 46.6753);
      expect(distance).toBe(0);
    });

    it('يحسب بدقة مسافة قصيرة (سيناريو اقتراب الباص من الطالب ~500 متر)', () => {
      // نقطة الأصل
      const lat1 = 24.7136;
      const lng1 = 46.6753;
      // نقطة تبعد حوالي ~500 متر شمالاً (1 درجة عرض تقريباً 111 كم، إذن 0.0045 درجة ≈ 500 متر)
      const lat2 = lat1 + 0.0045;
      const lng2 = lng1;

      const distance = haversineDistance(lat1, lng1, lat2, lng2);
      expect(distance).toBeGreaterThan(450);
      expect(distance).toBeLessThan(550);
    });

    it('يتعامل بشكل صحيح مع الإحداثيات السالبة (نصف الكرة الغربي أو الجنوبي)', () => {
      const distance = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631); // سيدني إلى ملبورن
      const distanceKm = distance / 1000;
      expect(distanceKm).toBeGreaterThan(700);
      expect(distanceKm).toBeLessThan(750);
    });
  });

  describe('bearingTo (حساب زاوية الاتجاه)', () => {
    it('يرجع زاوية الشمال (0° تقريباً) عند التحرك مباشرة نحو الشمال', () => {
      const bearing = bearingTo(24.0, 46.0, 25.0, 46.0);
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('يرجع زاوية الشرق (90° تقريباً) عند التحرك مباشرة نحو الشرق', () => {
      const bearing = bearingTo(24.0, 46.0, 24.0, 47.0);
      expect(bearing).toBeCloseTo(90, 0);
    });

    it('يرجع زاوية الجنوب (180° تقريباً) عند التحرك مباشرة نحو الجنوب', () => {
      const bearing = bearingTo(25.0, 46.0, 24.0, 46.0);
      expect(bearing).toBeCloseTo(180, 0);
    });

    it('يرجع زاوية الغرب (270° تقريباً) عند التحرك مباشرة نحو الغرب', () => {
      const bearing = bearingTo(24.0, 47.0, 24.0, 46.0);
      expect(bearing).toBeCloseTo(270, 0);
    });
  });

  describe('bearingDelta (الفرق الزاوي بين اتجاهين)', () => {
    it('يحسب الفرق الصحيح عبر خط الصفر/الشمال (350° و 10° الفرق 20° وليس 340°)', () => {
      const delta1 = bearingDelta(350, 10);
      const delta2 = bearingDelta(10, 350);

      expect(delta1).toBe(20);
      expect(delta2).toBe(20);
    });

    it('يرجع 0 عندما يكون الاتجاهان متطابقين', () => {
      expect(bearingDelta(90, 90)).toBe(0);
      expect(bearingDelta(0, 360)).toBe(0);
    });

    it('يرجع 180 عندما يكون الاتجاهان متعاكسين تماماً', () => {
      expect(bearingDelta(0, 180)).toBe(180);
      expect(bearingDelta(90, 270)).toBe(180);
    });
  });

  describe('calculateSpeedKmH (حساب سرعة الحافلة)', () => {
    it('يحسب السرعة بدقة لقطع مسافة معروفة في زمن معروف (60 كم/س)', () => {
      const now = new Date('2026-09-05T07:00:00Z');
      const oneMinuteLater = new Date('2026-09-05T07:01:00Z');

      // نقطتان تفصل بينهما 1 كم شمالاً (تقريباً 0.009 درجة عرض)
      const lat1 = 24.7000;
      const lng1 = 46.7000;
      const distanceOneKm = 1000;
      // نحسب lat2 بدقة تعطي مسافة 1000 متر
      // 1000m / 111139m/deg ≈ 0.008997 deg
      const lat2 = lat1 + (distanceOneKm / 6371000) * (180 / Math.PI);

      const pos1 = { lat: lat1, lng: lng1, updatedAt: now };
      const pos2 = { lat: lat2, lng: lng1, updatedAt: oneMinuteLater };

      const speed = calculateSpeedKmH(pos1, pos2);
      // 1 كم في دقيقة واحدة = 60 كم/ساعة
      expect(speed).toBeCloseTo(60, 0);
    });

    it('يرجع 0 بأمان إذا كان فارق الوقت صفراً (حماية من القسمة على صفر)', () => {
      const sameTime = new Date('2026-09-05T07:00:00Z');
      const pos1 = { lat: 24.7136, lng: 46.6753, updatedAt: sameTime };
      const pos2 = { lat: 24.7200, lng: 46.6800, updatedAt: sameTime };

      const speed = calculateSpeedKmH(pos1, pos2);
      expect(speed).toBe(0);
    });

    it('يدعم التواريخ بصيغة نصوص ISO القادمة من شبكة Socket.io أو JSON', () => {
      const pos1 = { lat: 24.7000, lng: 46.7000, updatedAt: '2026-09-05T07:00:00Z' };
      const pos2 = { lat: 24.7000 + (1000 / 6371000) * (180 / Math.PI), lng: 46.7000, updatedAt: '2026-09-05T07:01:00Z' };

      const speed = calculateSpeedKmH(pos1, pos2);
      expect(speed).toBeCloseTo(60, 0);
    });

    it('يدعم التواريخ بصيغة أرقام الميلي ثانية (UNIX timestamp)', () => {
      const t1 = 1757055600000;
      const t2 = t1 + 60000; // دقيقة واحدة
      const pos1 = { lat: 24.7000, lng: 46.7000, updatedAt: t1 };
      const pos2 = { lat: 24.7000 + (1000 / 6371000) * (180 / Math.PI), lng: 46.7000, updatedAt: t2 };

      const speed = calculateSpeedKmH(pos1, pos2);
      expect(speed).toBeCloseTo(60, 0);
    });

    it('يرجع 0 بأمان إذا كانت إحدى النقاط أو التواريخ غير معرّفة أو تالفة (حماية من الانهيار)', () => {
      const validPos = { lat: 24.7136, lng: 46.6753, updatedAt: new Date() };

      // @ts-expect-error اختبار تمرير كائن غير مكتمل
      expect(calculateSpeedKmH(null, validPos)).toBe(0);
      // @ts-expect-error اختبار تمرير كائن غير مكتمل
      expect(calculateSpeedKmH(validPos, null)).toBe(0);
      // @ts-expect-error اختبار بدون تاريخ
      expect(calculateSpeedKmH({ lat: 24, lng: 46 }, validPos)).toBe(0);
      // تاريخ تالف (Invalid Date string)
      expect(calculateSpeedKmH({ lat: 24, lng: 46, updatedAt: 'invalid-date' }, validPos)).toBe(0);
    });
  });
});
