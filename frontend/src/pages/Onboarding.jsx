import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/apiService';
import { Shield, School, Loader2, AlertCircle, CheckCircle2, User, Lock, Mail } from 'lucide-react';

const Onboarding = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    // Verification state
    const [verifying, setVerifying] = useState(true);
    const [invitation, setInvitation] = useState(null);
    const [verifyError, setVerifyError] = useState('');

    // Form state
    const [form, setForm] = useState({ name: '', username: '', password: '', confirmPassword: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    // ─── Step 1: Verify token on mount ─────────────────────────────────
    useEffect(() => {
        if (!token) {
            setVerifyError('رابط الدعوة غير صالح — لا يوجد Token');
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
                    INVALID_TOKEN: 'رابط الدعوة غير صالح',
                    TOKEN_USED: 'هذه الدعوة مستخدمة بالفعل — تم تسجيل حساب المدير سابقاً',
                    TOKEN_EXPIRED: 'انتهت صلاحية هذه الدعوة — تواصل مع مدير النظام لإعادة الإرسال'
                };
                setVerifyError(messages[code] || err.response?.data?.message || 'حدث خطأ أثناء التحقق');
            } finally {
                setVerifying(false);
            }
        };
        verify();
    }, [token]);

    // ─── Step 2: Accept invitation (create account) ────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (form.password !== form.confirmPassword) {
            setFormError('كلمتا المرور غير متطابقتين');
            return;
        }
        if (form.password.length < 6) {
            setFormError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        setFormLoading(true);
        try {
            const { data } = await api.post('/auth/accept-invitation', {
                token,
                name: form.name,
                username: form.username,
                password: form.password
            });

            // Store auth data and redirect to admin dashboard
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/admin'; // Full reload to trigger AuthContext session restore
        } catch (err) {
            const code = err.response?.data?.errorCode;
            const messages = {
                INVALID_TOKEN: 'رابط الدعوة غير صالح',
                TOKEN_USED: 'هذه الدعوة مستخدمة بالفعل',
                TOKEN_EXPIRED: 'انتهت صلاحية الدعوة',
                USER_EXISTS: 'اسم المستخدم مأخوذ بالفعل — اختر اسماً آخر'
            };
            setFormError(messages[code] || err.response?.data?.message || 'حدث خطأ أثناء إنشاء الحساب');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 flex items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
                        <Shield size={40} strokeWidth={1.75} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-800">دعوة مدير مدرسة</h1>
                    <p className="text-gray-500 text-sm mt-1">نظام تتبع الحافلات المدرسية</p>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8">

                    {/* Loading State */}
                    {verifying && (
                        <div className="text-center py-8">
                            <Loader2 size={40} className="animate-spin text-indigo-400 mx-auto mb-4" />
                            <p className="text-gray-500 font-bold">جاري التحقق من الدعوة...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {!verifying && verifyError && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32} className="text-red-400" />
                            </div>
                            <h3 className="font-bold text-lg text-red-700 mb-2">خطأ في الدعوة</h3>
                            <p className="text-gray-600 text-sm">{verifyError}</p>
                            <button onClick={() => navigate('/login')}
                                className="mt-6 px-6 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                                الذهاب لصفحة الدخول
                            </button>
                        </div>
                    )}

                    {/* Registration Form */}
                    {!verifying && invitation && (
                        <>
                            {/* School Info Banner */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                    <School size={24} className="text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-indigo-800">{invitation.schoolName}</p>
                                    <p className="text-xs text-indigo-500">{invitation.schoolId} · {invitation.email}</p>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-1">إنشاء حسابك</h3>
                            <p className="text-gray-500 text-sm mb-6">أدخل بياناتك لإكمال تسجيل حساب مدير المدرسة</p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">الاسم الكامل</label>
                                    <div className="relative">
                                        <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="يوسف الأحمد" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">اسم المستخدم</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left" dir="ltr" placeholder="admin_alnour" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">كلمة المرور</label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left" dir="ltr" placeholder="••••••••" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">تأكيد كلمة المرور</label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="password" required value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left" dir="ltr" placeholder="••••••••" />
                                    </div>
                                </div>

                                <button type="submit" disabled={formLoading}
                                    className={`w-full bg-gradient-to-l from-indigo-600 to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-2 ${formLoading ? 'opacity-70 cursor-not-allowed' : 'hover:from-indigo-700 hover:to-indigo-600 shadow-indigo-500/30 transform hover:-translate-y-0.5'}`}>
                                    {formLoading && <Loader2 size={20} className="animate-spin" />}
                                    <span>{formLoading ? 'جاري الإنشاء...' : 'إنشاء الحساب والدخول'}</span>
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
