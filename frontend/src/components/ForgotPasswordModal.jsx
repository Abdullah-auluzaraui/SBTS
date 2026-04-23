import React, { useState } from 'react';
import { X, Phone, ShieldCheck, Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../services/apiService';

const STEPS = {
  PHONE: 1,
  OTP: 2,
  NEW_PASSWORD: 3,
  SUCCESS: 4
};

const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep] = useState(STEPS.PHONE);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Step 1: Request OTP ─────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('اسم المستخدم مطلوب');
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError('رقم الجوال يجب أن يتكون من 10 أرقام');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { username, phone });
      if (data.mockOtp) {
        console.log(`\n========================================`);
        console.log(`🔑 MOCK OTP [forgot-password]: ${data.mockOtp}`);
        console.log(`========================================\n`);
      }
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP ──────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otpCode.length !== 6) {
      setError('أدخل الرمز المكون من 6 أرقام');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otpCode });
      setResetToken(data.resetToken);
      setStep(STEPS.NEW_PASSWORD);
    } catch (err) {
      setError(err.response?.data?.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: Reset Password ──────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { resetToken, newPassword });
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تغيير كلمة المرور. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">

        {/* Close button */}
        {step !== STEPS.SUCCESS && (
          <button onClick={onClose} className="absolute left-5 top-5 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={22} />
          </button>
        )}

        {/* ── Step 1: Enter Phone ────────────────────────────────── */}
        {step === STEPS.PHONE && (
          <>
            <div className="text-center mb-7">
              <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone size={30} strokeWidth={1.75} className="text-primary-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">نسيت كلمة المرور؟</h2>
              <p className="text-gray-500 text-sm mt-1">أدخل اسم المستخدم ورقم جوالك المسجّلين وسنرسل لك رمز التحقق</p>
            </div>
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold text-sm px-1">اسم المستخدم</label>
                <input
                  type="text"
                  placeholder="username"
                  dir="ltr"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left font-sans"
                  value={username}
                  onChange={e => setUsername(e.target.value.trim())}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold text-sm px-1">رقم الجوال</label>
                <input
                  type="tel"
                  placeholder="05xxxxxxxx"
                  maxLength={10}
                  dir="ltr"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left font-sans"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={loading}
                className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </button>
            </form>
          </>
        )}

        {/* ── Step 2: Enter OTP ─────────────────────────────────── */}
        {step === STEPS.OTP && (
          <>
            <div className="text-center mb-7">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={30} strokeWidth={1.75} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">أدخل رمز التحقق</h2>
              <p className="text-gray-500 text-sm mt-1">
                أُرسل رمز مكون من 6 أرقام إلى{' '}
                <span className="font-bold text-gray-700" dir="ltr">{phone}</span>
              </p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  dir="ltr"
                  placeholder="------"
                  className="w-48 text-center text-3xl tracking-widest px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-green-500 transition-all font-mono"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </div>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={loading || otpCode.length !== 6}
                className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'جاري التحقق...' : 'تحقق من الرمز'}
              </button>
              <button type="button" onClick={() => { setStep(STEPS.PHONE); setOtpCode(''); setError(''); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 font-bold transition-colors">
                تغيير رقم الجوال
              </button>
            </form>
          </>
        )}

        {/* ── Step 3: New Password ───────────────────────────────── */}
        {step === STEPS.NEW_PASSWORD && (
          <>
            <div className="text-center mb-7">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={30} strokeWidth={1.75} className="text-indigo-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">كلمة المرور الجديدة</h2>
              <p className="text-gray-500 text-sm mt-1">اختر كلمة مرور قوية لحسابك</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold text-sm px-1">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold text-sm px-1">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  dir="ltr"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {error && <ErrorBox message={error} />}
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-500 text-white font-bold py-3 rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
              </button>
            </form>
          </>
        )}

        {/* ── Step 4: Success ────────────────────────────────────── */}
        {step === STEPS.SUCCESS && (
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={40} strokeWidth={1.75} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">تم تغيير كلمة المرور!</h2>
            <p className="text-gray-500 text-sm mb-6">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
            <button onClick={onClose}
              className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-all">
              العودة لتسجيل الدخول
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

const ErrorBox = ({ message }) => (
  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
    <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
    <span className="text-sm text-red-700 font-semibold">{message}</span>
  </div>
);

export default ForgotPasswordModal;
