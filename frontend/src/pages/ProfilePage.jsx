import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import api from '../services/apiService';
import {
  User, Shield, Phone, Loader2, AlertCircle, CheckCircle2,
  Eye, EyeOff, Info, X, Lock, ArrowLeft
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ─── Reusable sub-components ──────────────────────────────────────────────────

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${active
      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100'
      : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
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

const InputField = ({
  label,
  type = 'text',
  value,
  onChange,
  disabled,
  placeholder,
  dir,
  hint,
  required,
  labelAction,
  endAdornment,
}) => (
  <div className="space-y-1.5">
    {(label || labelAction) && (
      <div className="flex items-center justify-between gap-2 px-1">
        {label && (
          <label className="block text-gray-700 font-bold text-sm text-start">{label}</label>
        )}
        {labelAction}
      </div>
    )}
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        dir={dir}
        required={required}
        className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all text-sm text-start
          ${endAdornment ? 'pe-24' : ''}
          ${disabled
            ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed'
            : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
          }`}
      />
      {endAdornment && (
        <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none">
          {endAdornment}
        </div>
      )}
    </div>
    {hint && <p className="text-xs text-gray-400 px-1 text-start">{hint}</p>}
  </div>
);

// ─── Phone Change sub-modal ───────────────────────────────────────────────────
const PhoneChangeModal = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1: enter new phone, 2: enter OTP
  const [newPhone, setNewPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(newPhone)) { setError(t('profile.errors.invalidPhone')); return; }
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
      setError(err.response?.data?.message || t('profile.errors.genericError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otpCode.length !== 6) { setError(t('profile.errors.invalidOtp')); return; }
    setLoading(true);
    try {
      const { data } = await api.put('/profile/phone/verify', { newPhone, otpCode });
      onSuccess(data.phone);
    } catch (err) {
      setError(err.response?.data?.message || t('profile.errors.wrongOtp'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 relative">
        <button onClick={onClose} className="absolute end-5 top-5 text-gray-400 hover:text-gray-700">
          <X size={20} />
        </button>

        {step === 1 ? (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Phone size={26} strokeWidth={1.75} className="text-primary-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{t('profile.changePhoneTitle')}</h3>
              <p className="text-gray-500 text-xs mt-1">{t('profile.changePhoneSubtitle')}</p>
            </div>
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <InputField label={t('profile.newPhoneLabel')} type="tel" value={newPhone}
                onChange={e => setNewPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="05xxxxxxxx" dir="ltr" required />
              {error && <ErrorAlert message={error} />}
              <button type="submit" disabled={loading}
                className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? t('profile.sending') : t('profile.sendCode')}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Shield size={26} strokeWidth={1.75} className="text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{t('profile.verifyPhoneTitle')}</h3>
              <p className="text-gray-500 text-xs mt-1">{t('profile.sentTo')} <span dir="ltr" className="font-bold">{newPhone}</span></p>
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
                {loading ? t('profile.verifying') : t('profile.verifyPhone')}
              </button>
              <button type="button" onClick={() => { setStep(1); setOtpCode(''); setError(''); }}
                className="w-full text-sm text-gray-500 font-bold hover:text-gray-700 transition-colors">
                {t('profile.changePhoneBack')}
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
  const { t } = useTranslation();
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
      setGenSuccess(t('profile.saveSuccess'));
      updateUser({ name: data.user.name, email: data.user.email, username: data.user.username });
      setProfile(prev => ({ ...prev, ...data.user }));
    } catch (err) {
      setGenError(err.response?.data?.message || t('profile.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // ── Phone change success ───────────────────────────────────────────────────
  const handlePhoneChangeSuccess = (newPhone) => {
    setShowPhoneModal(false);
    setProfile(prev => ({ ...prev, phone: newPhone, isPhoneVerified: true }));
    updateUser({ phone: newPhone });
    setGenSuccess(t('profile.phoneUpdateSuccess'));
  };

  // ── Change Password ────────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError(''); setPwdSuccess('');
    if (newPassword.length < 6) { setPwdError(t('profile.errors.shortPassword')); return; }
    if (newPassword !== confirmPassword) { setPwdError(t('profile.errors.passwordMismatch')); return; }
    setPwdSaving(true);
    try {
      await api.put('/profile/password', { currentPassword, newPassword });
      setPwdSuccess(t('profile.passwordChangeSuccess'));
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPwdError(err.response?.data?.message || t('profile.errors.changeFailed'));
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] p-6 lg:p-8 mb-4">

          {/* Back button — positioned at the start (left in LTR, right in RTL) */}
          <div className="flex justify-start mb-6">
            <button
              type="button"
              onClick={() => navigate(dashboardPath)}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={16} className="rtl:rotate-180" />
              {t('common.back')}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            <TabButton active={tab === 'general'} onClick={() => setTab('general')} icon={User} label={t('profile.generalInfo')} />
            <TabButton active={tab === 'security'} onClick={() => setTab('security')} icon={Lock} label={t('profile.security')} />
          </div>

          {/* ── General Info Tab ─────────────────────────────────────────── */}
          {tab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-5">
              <h3 className="text-base font-bold text-gray-500 border-b pb-2 mb-4">{t('profile.personalInfo')}</h3>

              {/* Name */}
              <InputField
                label={t('profile.nameLabel')}
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isDriver}
                hint={isDriver ? t('profile.nameReadonly') : undefined}
              />

              {/* Username — parent and admin only */}
              {(isAdmin || isParent) && (
                <InputField
                  label={t('profile.usernameLabel')}
                  value={username}
                  onChange={e => setUsername(e.target.value.trim())}
                  placeholder="username"
                  hint={t('profile.usernameHint')}
                />
              )}

              {/* Email — schooladmin only */}
              {isAdmin && (
                <InputField
                  label={t('profile.emailLabel')}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              )}

              {/* Phone — full width with verified badge as end-adornment and Change as label action */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 px-1">
                  <label className="block text-gray-700 font-bold text-sm text-start">{t('profile.phoneLabel')}</label>
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(true)}
                    className="text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                  >
                    {t('profile.changePhone')}
                  </button>
                </div>
                <div className="relative">
                  <div
                    className={`w-full px-4 py-3 border rounded-xl text-sm font-sans bg-gray-50 border-gray-200 text-start ${profile?.isPhoneVerified ? 'pe-28' : ''} ${profile?.phone ? 'text-gray-700' : 'text-gray-400'}`}
                  >
                    <bdi dir="ltr">{profile?.phone || t('profile.noPhone')}</bdi>
                  </div>
                  {profile?.isPhoneVerified && (
                    <span className="absolute inset-y-0 end-3 flex items-center gap-1 text-xs text-green-700 font-bold pointer-events-none">
                      <CheckCircle2 size={14} /> {t('profile.verified')}
                    </span>
                  )}
                </div>
              </div>

              {genSuccess && <SuccessAlert message={genSuccess} />}
              {genError && <ErrorAlert message={genError} />}

              {/* Save button — hidden for driver (no editable fields) */}
              {!isDriver && (
                <button type="submit" disabled={saving}
                  className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  {saving ? t('profile.savingChanges') : t('profile.saveChanges')}
                </button>
              )}

              {isDriver && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <span>{t('profile.driverNote')}</span>
                </div>
              )}
            </form>
          )}

          {/* ── Security Tab ─────────────────────────────────────────────── */}
          {tab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-5">
              <h3 className="text-base font-bold text-gray-500 border-b pb-2 mb-4">{t('profile.changePasswordTitle')}</h3>

              <div className="space-y-1.5">
                <label className="block text-gray-700 font-bold text-sm px-1 text-start">{t('profile.currentPassword')}</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="w-full px-4 py-3 pe-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-start text-sm"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <InputField
                label={t('profile.newPassword')}
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />

              <InputField
                label={t('profile.confirmNewPassword')}
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />

              {pwdSuccess && <SuccessAlert message={pwdSuccess} />}
              {pwdError && <ErrorAlert message={pwdError} />}

              <button type="submit" disabled={pwdSaving}
                className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                {pwdSaving && <Loader2 size={18} className="animate-spin" />}
                {pwdSaving ? t('profile.changingPassword') : t('profile.changePassword')}
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
