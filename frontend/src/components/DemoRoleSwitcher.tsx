import React, { useState } from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  School,
  Bus,
  Users,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  X,
  Layers
} from 'lucide-react';
import api from '../services/apiService';

const DEMO_USERS_MAP: Record<UserRole, { username: string; labelAr: string; labelEn: string; icon: any; color: string; descAr: string }> = {
  driver: {
    username: 'driver01',
    labelAr: 'السائق',
    labelEn: 'Driver',
    icon: Bus,
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    descAr: 'محاكي المسار وصعود NFC'
  },
  parent: {
    username: 'parent001',
    labelAr: 'ولي الأمر',
    labelEn: 'Parent',
    icon: Users,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    descAr: 'تتبع الحافلة وإشعارات الاقتراب'
  },
  schooladmin: {
    username: 's_admin',
    labelAr: 'مدير المدرسة',
    labelEn: 'School Admin',
    icon: School,
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    descAr: 'خريطة الأسطول وسجلات الحضور'
  },
  superadmin: {
    username: 'superadmin',
    labelAr: 'مدير النظام',
    labelEn: 'Super Admin',
    icon: ShieldCheck,
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    descAr: 'إدارة المدارس والإحصائيات'
  }
};

export const DemoRoleSwitcher: React.FC = () => {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState<boolean>(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const currentRoleInfo = user ? DEMO_USERS_MAP[user.role] : null;

  const handleRoleSwitch = async (targetRole: UserRole) => {
    if (switchingTo) return;
    if (user && user.role === targetRole) {
      setIsMobileSheetOpen(false);
      return;
    }
    const target = DEMO_USERS_MAP[targetRole];
    if (!target) return;

    setSwitchingTo(targetRole);
    try {
      if (isAuthenticated) {
        logout();
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      await login(target.username, 'Aa1234');
      setIsMobileSheetOpen(false);
    } catch (err: any) {
      console.error('Demo role switch failed:', err);
      setNotification({
        type: 'error',
        message: err.message || (isRtl ? 'تعذر التبديل' : 'Switch failed')
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setSwitchingTo(null);
    }
  };

  const handleResetDemo = async () => {
    if (resetting) return;
    const confirmText = isRtl
      ? 'هل ترغب في إعادة ضبط البيانات التجريبية لحالتها الأولية؟ (100 طالب و 5 باصات)'
      : 'Reset demo database to initial state?';
    if (!window.confirm(confirmText)) return;

    setResetting(true);
    try {
      const { data } = await api.post('/demo/reset');
      setNotification({
        type: 'success',
        message: data.message || (isRtl ? 'تمت إعادة ضبط البيانات بنجاح' : 'Reset successful')
      });
      setIsMobileSheetOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.message || (isRtl ? 'تعذر إعادة الضبط' : 'Reset failed');
      setNotification({
        type: 'error',
        message: msg
      });
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      {/* Toast Notification (Both Desktop & Mobile) */}
      {notification && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] font-sans">
          <div
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 shadow-xl border animate-in fade-in slide-in-from-top-2 ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            {notification.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* ── DESKTOP VIEW (Top Floating Bar) ─────────────────────────────────── */}
      <aside
        aria-label="Demo Role Switcher"
        className="hidden md:flex fixed top-2 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 font-sans max-w-[98vw]"
      >
        <div className="bg-white/95 hover:bg-white backdrop-blur-md text-gray-800 border border-gray-200/90 shadow-xl rounded-2xl p-1.5 flex items-center gap-1.5 transition-all ring-1 ring-black/5">
          {/* Demo Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-xs font-extrabold shadow-sm shrink-0">
            <Sparkles size={13} className="animate-pulse" />
            <span>{isRtl ? 'عرض تجريبي' : 'Demo'}</span>
          </div>

          {/* Quick Role Buttons */}
          {!isDesktopCollapsed && (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
              {(['driver', 'parent', 'schooladmin', 'superadmin'] as UserRole[]).map((roleKey) => {
                const info = DEMO_USERS_MAP[roleKey];
                const RoleIcon = info.icon;
                const isActive = user?.role === roleKey;
                const isLoadingThis = switchingTo === roleKey;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    disabled={!!switchingTo}
                    onClick={() => handleRoleSwitch(roleKey)}
                    className={`relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? 'bg-primary-50 text-primary-800 border-primary-400 font-extrabold'
                        : 'bg-gray-50/80 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-gray-200/70 hover:border-gray-300'
                    } disabled:opacity-50`}
                    title={isRtl ? `${info.labelAr} (${info.username})` : `${info.labelEn} (${info.username})`}
                  >
                    {isLoadingThis ? (
                      <Loader2 size={13} className="animate-spin text-primary-600" />
                    ) : (
                      <RoleIcon size={14} className={isActive ? 'text-primary-600' : 'text-gray-500'} />
                    )}
                    <span>{isRtl ? info.labelAr : info.labelEn}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </button>
                );
              })}

              <div className="h-4 w-px bg-gray-200 mx-0.5" />

              {/* Guide Button */}
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
              >
                <Sparkles size={12} className="text-blue-600" />
                <span>{isRtl ? 'دليل التجربة' : 'Guide'}</span>
              </button>

              {/* Reset Demo Button */}
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetDemo}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-gray-600 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 border border-gray-200/70 hover:border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw size={12} className={resetting ? 'animate-spin text-rose-500' : 'text-gray-500'} />
                <span>{isRtl ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            </div>
          )}

          {/* Toggle Collapse */}
          <button
            type="button"
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {isDesktopCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </aside>

      {/* ── MOBILE VIEW (Floating Bottom Action Capsule) ───────────────────── */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] font-sans">
        <button
          type="button"
          onClick={() => setIsMobileSheetOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900/95 hover:bg-black text-white rounded-full shadow-2xl backdrop-blur-md border border-white/20 active:scale-95 transition-all cursor-pointer ring-2 ring-primary-500/30"
        >
          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white">
            <Sparkles size={13} className="animate-pulse" />
          </div>
          <div className="flex flex-col text-right leading-tight">
            <span className="text-[10px] text-gray-300 font-medium">
              {isRtl ? 'تبديل الدور التجريبي' : 'Demo Switcher'}
            </span>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              {currentRoleInfo ? (isRtl ? currentRoleInfo.labelAr : currentRoleInfo.labelEn) : (isRtl ? 'اختر حساباً' : 'Select Role')}
              <ChevronUp size={13} className="text-gray-400" />
            </span>
          </div>
        </button>
      </div>

      {/* ── MOBILE BOTTOM SHEET MODAL ─────────────────────────────────────── */}
      {isMobileSheetOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-end justify-center animate-in fade-in duration-200"
          onClick={() => setIsMobileSheetOpen(false)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-5 shadow-2xl border-t border-gray-100 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 font-sans"
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {isRtl ? 'التبديل بين أدوار النظام' : 'Demo Roles'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isRtl ? 'اضغط على أي حساب لتسجيل الدخول فوراً' : 'Tap any persona to switch instantly'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* 4 Mobile Role Cards */}
            <div className="grid grid-cols-1 gap-2.5 my-3">
              {(['driver', 'parent', 'schooladmin', 'superadmin'] as UserRole[]).map((roleKey) => {
                const info = DEMO_USERS_MAP[roleKey];
                const RoleIcon = info.icon;
                const isActive = user?.role === roleKey;
                const isLoadingThis = switchingTo === roleKey;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    disabled={!!switchingTo}
                    onClick={() => handleRoleSwitch(roleKey)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-right w-full cursor-pointer ${
                      isActive
                        ? 'bg-primary-50/80 border-primary-400 ring-2 ring-primary-500/20 shadow-xs'
                        : 'bg-gray-50 hover:bg-gray-100/80 border-gray-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-primary-500 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200'
                      }`}>
                        {isLoadingThis ? (
                          <Loader2 size={18} className="animate-spin text-primary-600" />
                        ) : (
                          <RoleIcon size={20} strokeWidth={1.75} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">
                            {isRtl ? info.labelAr : info.labelEn}
                          </span>
                          <span className="text-[11px] font-mono text-gray-400">
                            ({info.username})
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{info.descAr}</p>
                      </div>
                    </div>

                    {isActive && (
                      <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2.5 py-1 rounded-full shrink-0">
                        {isRtl ? 'أنت هنا' : 'Active'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Bottom Actions */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsMobileSheetOpen(false);
                  setShowGuideModal(true);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                <Sparkles size={14} className="text-blue-600" />
                <span>{isRtl ? 'دليل التجربة' : 'Guide'}</span>
              </button>

              <button
                type="button"
                disabled={resetting}
                onClick={handleResetDemo}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
              >
                <RotateCcw size={14} className={resetting ? 'animate-spin' : ''} />
                <span>{isRtl ? 'إعادة ضبط البيانات' : 'Reset Demo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Recruiter Demo Guide Modal */}
      {showGuideModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 sm:p-8 relative overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150 text-right font-sans max-h-[90vh] overflow-y-auto"
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 shadow-sm shrink-0">
                <Sparkles size={24} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  {isRtl ? 'دليل تجربة النظام السريع (3 خطوات)' : 'Quick 3-Step Demo Walkthrough'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isRtl ? 'سلسلة تجربة متكاملة لإبراز قدرات النظام اللحظية' : 'Experience full real-time tracking in 2 minutes'}
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-sm">
              {/* Step 1 */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-xs sm:text-sm">
                    <Bus size={14} />
                    {isRtl ? 'السائق (Driver - driver01):' : 'Driver (driver01):'}
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    {isRtl
                      ? 'اضغط "بدء الرحلة"، ثم شغّل المحاكي (Simulator) وشاهد صعود الطلاب التلقائي بـ NFC عند وصول الحافلة لباب منازلهم.'
                      : 'Click "Start Trip", run the Simulator, and watch automatic NFC boarding when the bus reaches student houses.'}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs sm:text-sm">
                    <Users size={14} />
                    {isRtl ? 'ولي الأمر (Parent - parent001):' : 'Parent (parent001):'}
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    {isRtl
                      ? 'انتقل لحساب ولي الأمر واضغط "تتبع الحافلة" لمشاهدة حافلة الابن تتحرك حياً على الخريطة عبر الـ WebSockets واستلام تنبيه الاقتراب.'
                      : 'Switch to Parent, click "Track Bus", and watch live bus movement with proximity alerts via WebSockets.'}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-900 flex items-center gap-1.5 text-xs sm:text-sm">
                    <School size={14} />
                    {isRtl ? 'مدير المدرسة (Admin - s_admin):' : 'School Admin (s_admin):'}
                  </h4>
                  <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
                    {isRtl
                      ? 'انتقل لحساب مدير المدرسة وافتح "خريطة الأسطول" لمتابعة الحافلات الـ 5 معاً، وتصفح "سجلات الحضور" اللحظية.'
                      : 'Switch to School Admin, view the Fleet Map to monitor all 5 buses, and inspect real-time attendance logs.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                {isRtl ? 'كلمة المرور: Aa1234' : 'Password: Aa1234'}
              </span>
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                {isRtl ? 'فهمت، لنبدأ' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DemoRoleSwitcher;
