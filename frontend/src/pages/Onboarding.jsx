import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/apiService';
import { Shield, School, Loader2, AlertCircle, Lock, Mail, Phone } from 'lucide-react';

const Onboarding = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = searchParams.get('token');

    const [verifying, setVerifying] = useState(true);
    const [invitation, setInvitation] = useState(null);
    const [verifyError, setVerifyError] = useState('');

    const [form, setForm] = useState({ username: '', phone: '', password: '', confirmPassword: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (!token) {
            setVerifyError(t('onboarding.errors.invalidToken'));
            setVerifying(false);
            return;
        }

        const verify = async () => {
            try {
                const { data } = await api.get(`/auth/verify-invitation?token=${token}`);
                setInvitation(data.invitation);
            } catch (err) {
                const code = err.response?.data?.errorCode;
                const messages = {
                    INVALID_TOKEN: t('onboarding.errors.invalidToken'),
                    TOKEN_USED: t('onboarding.errors.tokenUsed'),
                    TOKEN_EXPIRED: t('onboarding.errors.tokenExpired')
                };
                setVerifyError(messages[code] || err.response?.data?.message || t('onboarding.errors.verifyError'));
            } finally {
                setVerifying(false);
            }
        };
        verify();
    }, [token, t]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!form.phone || !/^\d{10}$/.test(form.phone)) {
            setFormError(t('onboarding.errors.invalidPhone'));
            return;
        }
        if (form.password !== form.confirmPassword) {
            setFormError(t('onboarding.errors.passwordMismatch'));
            return;
        }
        if (form.password.length < 6) {
            setFormError(t('onboarding.errors.shortPassword'));
            return;
        }

        setFormLoading(true);
        try {
            const { data } = await api.post('/auth/accept-invitation', {
                token,
                username: form.username,
                phone: form.phone,
                password: form.password
            });

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/admin';
        } catch (err) {
            const code = err.response?.data?.errorCode;
            const messages = {
                INVALID_TOKEN: t('onboarding.errors.invalidToken'),
                TOKEN_USED: t('onboarding.errors.tokenUsedShort'),
                TOKEN_EXPIRED: t('onboarding.errors.tokenExpiredShort'),
                USER_EXISTS: t('onboarding.errors.usernameTaken')
            };
            setFormError(messages[code] || err.response?.data?.message || t('onboarding.errors.createError'));
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
                        <Shield size={40} strokeWidth={1.75} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-800">{t('onboarding.title')}</h1>
                    <p className="text-gray-500 text-sm mt-1">{t('onboarding.subtitle')}</p>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8">

                    {verifying && (
                        <div className="text-center py-8">
                            <Loader2 size={40} className="animate-spin text-indigo-400 mx-auto mb-4" />
                            <p className="text-gray-500 font-bold">{t('onboarding.verifying')}</p>
                        </div>
                    )}

                    {!verifying && verifyError && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32} className="text-red-400" />
                            </div>
                            <h3 className="font-bold text-lg text-red-700 mb-2">{t('onboarding.invitationError')}</h3>
                            <p className="text-gray-600 text-sm">{verifyError}</p>
                            <button onClick={() => navigate('/login')}
                                className="mt-6 px-6 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                {t('onboarding.goToLogin')}
                            </button>
                        </div>
                    )}

                    {!verifying && invitation && (
                        <>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                    <School size={24} className="text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-indigo-800">{invitation.schoolName}</p>
                                    <p className="text-xs text-indigo-500">{invitation.schoolId} · {invitation.email}</p>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-1">{t('onboarding.setupTitle')}</h3>
                            <p className="text-gray-500 text-sm mb-6">{t('onboarding.setupSubtitle')}</p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">{t('common.username')}</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left" dir="ltr" placeholder="admin_alnour" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">{t('common.phone')}</label>
                                    <div className="relative">
                                        <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="tel" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left font-sans" dir="ltr" placeholder="05xxxxxxxx" maxLength={10} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">{t('common.password')}</label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left" dir="ltr" placeholder="••••••••" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">{t('onboarding.confirmPassword')}</label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="password" required value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left" dir="ltr" placeholder="••••••••" />
                                    </div>
                                </div>

                                <button type="submit" disabled={formLoading}
                                    className={`w-full bg-gradient-to-l from-indigo-600 to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-2 ${formLoading ? 'opacity-70 cursor-not-allowed' : 'hover:from-indigo-700 hover:to-indigo-600 shadow-indigo-500/30 transform hover:-translate-y-0.5'}`}>
                                    {formLoading && <Loader2 size={20} className="animate-spin" />}
                                    <span>{formLoading ? t('onboarding.creating') : t('onboarding.createAccount')}</span>
                                </button>

                                {formError && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                        <p className="text-sm text-red-700 flex items-start gap-2">
                                            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                            <span className="font-semibold">{formError}</span>
                                        </p>
                                    </div>
                                )}
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
