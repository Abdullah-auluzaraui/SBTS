import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import api from '../services/apiService';
import {
  User, Shield, Phone, Loader2, AlertCircle, CheckCircle2,
  Eye, EyeOff, Info, X, Lock, ArrowRight
} from 'lucide-react';

// ─── Reusable sub-components ──────────────────────────────────────────────────

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${active
      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
      }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

const SuccessAlert = ({ message }) => (
  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-semibold">
    <CheckCircle2 size={16} className="shrink-0" />
    {message}
  </div>
);

const ErrorAlert = ({ message }) => (
  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-semibold">
    <AlertCircle size={16} className="shrink-0 mt-0.5" />
    {message}
  </div>
);

const InputField = ({ label, type = 'text', value, onChange, disabled, placeholder, dir = 'rtl', hint, required }) => (
  <div className="space-y-1.5">
    <label className="block text-gray-700 font-bold text-sm px-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      dir={dir}
      required={required}
      className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all text-sm
        ${disabled
          ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed'
          : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
        }`}
    />
    {hint && <p className="text-xs text-gray-400 px-1">{hint}</p>}
  </div>
);

// ─── Phone Change sub-modal ───────────────────────────────────────────────────
const PhoneChangeModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: enter new phone, 2: enter OTP
  const [newPhone, setNewPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(newPhone)) { setError('رقم الجوال يجب أن يتكون من 10 أرقام'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/profile/phone/request', { newPhone });
      if (data.mockOtp) {
        console.log(`\n========================================`);
        console.log(`🔑 MOCK OTP [change-phone]: ${data.mockOtp}`);
        console.log(`========================================\n`);
      }
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otpCode.length !== 6) { setError('أدخل الرمز المكون من 6 أرقام'); return; }
    setLoading(true);
    try {
      const { data } = await api.put('/profile/phone/verify', { newPhone, otpCode });
      onSuccess(data.phone);
    } catch (err) {
      setError(err.response?.data?.message || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 relative">
        <button onClick={onClose} className="absolute left-5 top-5 text-gray-400 hover:text-gray-700">
          <X size={20} />
        </button>

        {step === 1 ? (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Phone size={26} strokeWidth={1.75} className="text-primary-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">تغيير رقم الجوال</h3>
              <p className="text-gray-500 text-xs mt-1">سيُرسل رمز تحقق إلى الرقم الجديد</p>
            </div>
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <InputField label="الرقم الجديد" type="tel" value={newPhone}
                onChange={e => setNewPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="05xxxxxxxx" dir="ltr" required />
              {error && <ErrorAlert message={error} />}
              <button type="submit" disabled={loading}
                className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'جاري الإرسال...' : 'إرسال الرمز'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Shield size={26} strokeWidth={1.75} className="text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">أدخل رمز التحقق</h3>
              <p className="text-gray-500 text-xs mt-1">أُرسل إلى <span dir="ltr" className="font-bold">{newPhone}</span></p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex justify-center">
                <input type="text" maxLength={6} dir="ltr" placeholder="------" autoFocus
                  className="w-40 text-center text-2xl tracking-widest px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-green-500 transition-all font-mono"
                  value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} required />
              </div>
              {error && <ErrorAlert message={error} />}
              <button type="submit" disabled={loading || otpCode.length !== 6}
                className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'جاري التحقق...' : 'تأكيد الرقم'}
              </button>
              <button type="button" onClick={() => { setStep(1); setOtpCode(''); setError(''); }}
                className="w-full text-sm text-gray-500 font-bold hover:text-gray-700 transition-colors">
                تغيير الرقم
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main Profile Page ────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const dashboardPath = { schooladmin: '/admin', parent: '/parent', driver: '/driver' }[user?.role] || '/';
  const [tab, setTab] = useState('general');
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // General Info state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [genSuccess, setGenSuccess] = useState('');
  const [genError, setGenError] = useState('');

  // Phone change modal
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/profile/me');
      setProfile(data.user);
      setName(data.user.name || '');
      setEmail(data.user.email || '');
      setUsername(data.user.username || '');
    } catch {
      // silent
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Save General Info ──────────────────────────────────────────────────────
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setGenError(''); setGenSuccess('');
    setSaving(true);
    try {
      const payload = {};
      if (user.role !== 'driver') payload.name = name;
      if (user.role === 'schooladmin') payload.email = email;
      if (['parent', 'schooladmin'].includes(user.role)) payload.username = username;

      const { data } = await api.put('/profile/me', payload);
      setGenSuccess('تم حفظ التغييرات بنجاح');
      updateUser({ name: data.user.name, email: data.user.email, username: data.user.username });
      setProfile(prev => ({ ...prev, ...data.user }));
    } catch (err) {
      setGenError(err.response?.data?.message || 'فشل الحفظ. حاول مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  // ── Phone change success ───────────────────────────────────────────────────
  const handlePhoneChangeSuccess = (newPhone) => {
    setShowPhoneModal(false);
    setProfile(prev => ({ ...prev, phone: newPhone, isPhoneVerified: true }));
    updateUser({ phone: newPhone });
    setGenSuccess('تم تحديث رقم الجوال بنجاح');
  };

  // ── Change Password ────────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError(''); setPwdSuccess('');
    if (newPassword.length < 6) { setPwdError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (newPassword !== confirmPassword) { setPwdError('كلمتا المرور غير متطابقتين'); return; }
    setPwdSaving(true);
    try {
      await api.put('/profile/password', { currentPassword, newPassword });
      setPwdSuccess('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPwdError(err.response?.data?.message || 'فشل التغيير. تأكد من كلمة المرور الحالية.');
    } finally {
      setPwdSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={36} className="animate-spin text-primary-400" />
        </div>
      </MainLayout>
    );
  }

  const isDriver = user?.role === 'driver';
  const isAdmin = user?.role === 'schooladmin';
  const isParent = user?.role === 'parent';

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] p-6 lg:p-8 mb-4">

          {/* Back button */}
          <button
            onClick={() => navigate(dashboardPath)}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors mb-6"
          >
            <ArrowRight size={16} />
            العودة
          </button>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            <TabButton active={tab === 'general'} onClick={() => setTab('general')} icon={User} label="المعلومات العامة" />
            <TabButton active={tab === 'security'} onClick={() => setTab('security')} icon={Lock} label="الأمان" />
          </div>

          {/* ── General Info Tab ─────────────────────────────────────────── */}
          {tab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-5">
              <h3 className="text-base font-bold text-gray-500 border-b pb-2 mb-4">المعلومات الشخصية</h3>

              {/* Name */}
              <InputField
                label="الاسم"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isDriver}
                hint={isDriver ? 'الاسم للقراءة فقط — تواصل مع مدير المدرسة لتغييره' : undefined}
              />

              {/* Username — parent and admin only */}
              {(isAdmin || isParent) && (
                <InputField
                  label="اسم المستخدم"
                  value={username}
                  onChange={e => setUsername(e.target.value.trim())}
                  dir="ltr"
                  placeholder="username"
                  hint="الحروف الإنجليزية والأرقام والشرطة السفلية فقط"
                />
              )}

              {/* Email — schooladmin only */}
              {isAdmin && (
                <InputField
                  label="البريد الإلكتروني"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  dir="ltr"
                />
              )}

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold text-sm px-1">رقم الجوال</label>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 px-4 py-3 border rounded-xl text-sm text-left font-sans bg-gray-50 border-gray-100 ${profile?.phone ? 'text-gray-700' : 'text-gray-400'}`} dir="ltr">
                    {profile?.phone || 'لم يُضف رقم جوال بعد'}
                  </div>
                  {profile?.isPhoneVerified && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-bold shrink-0">
                      <CheckCircle2 size={14} /> موثّق
                    </span>
                  )}
                  <button type="button" onClick={() => setShowPhoneModal(true)}
                    className="shrink-0 px-4 py-3 text-sm font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors border border-primary-100">
                    تغيير
                  </button>
                </div>
              </div>

              {genSuccess && <SuccessAlert message={genSuccess} />}
              {genError && <ErrorAlert message={genError} />}

              {/* Save button — hidden for driver (no editable fields) */}
              {!isDriver && (
                <button type="submit" disabled={saving}
                  className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              )}

              {isDriver && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <span>لتغيير اسمك، تواصل مع مدير المدرسة.</span>
                </div>
              )}
            </form>
          )}

          {/* ── Security Tab ─────────────────────────────────────────────── */}
          {tab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-5">
              <h3 className="text-base font-bold text-gray-500 border-b pb-2 mb-4">تغيير كلمة المرور</h3>

              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold text-sm px-1">كلمة المرور الحالية</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    dir="ltr"
                    className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left text-sm"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <InputField
                label="كلمة المرور الجديدة"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                dir="ltr"
                required
              />

              <InputField
                label="تأكيد كلمة المرور الجديدة"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                dir="ltr"
                required
              />

              {pwdSuccess && <SuccessAlert message={pwdSuccess} />}
              {pwdError && <ErrorAlert message={pwdError} />}

              <button type="submit" disabled={pwdSaving}
                className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                {pwdSaving && <Loader2 size={18} className="animate-spin" />}
                {pwdSaving ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
              </button>
            </form>
          )}

        </div>
      </div>

      {showPhoneModal && (
        <PhoneChangeModal
          onClose={() => setShowPhoneModal(false)}
          onSuccess={handlePhoneChangeSuccess}
        />
      )}
    </MainLayout>
  );
};

export default ProfilePage;
