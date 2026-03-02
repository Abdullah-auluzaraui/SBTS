import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

// Task FE-S1-3: RegisterForm (Parent only)
const Register = () => {
    const [formData, setFormData] = useState({ name: '', username: '', email: '', password: '', studentId: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { register, loading } = useAuth();
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('يرجى إدخال بريد إلكتروني صحيح.');
            return;
        }

        if (formData.password.length < 6) {
            setError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
            return;
        }

        try {
            await register(formData.name, formData.username, formData.email, formData.password, formData.studentId);
        } catch (err) {
            // Map backend errorCodes to Arabic messages
            const errorMessages = {
                USER_EXISTS: 'المستخدم موجود بالفعل. يرجى استخدام بريد إلكتروني مختلف أو تسجيل الدخول.',
                EMAIL_IN_USE: 'البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول أو استخدام بريد آخر.',
                INVALID_STUDENT_ID: `لم يتم العثور على طالب برقم '${formData.studentId}'. يرجى التحقق من الرقم.`,
                VALIDATION_ERROR: err.message || 'يرجى التحقق من البيانات المدخلة.',
                NETWORK_ERROR: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك.',
            };
            setError(errorMessages[err.errorCode] || err.message || 'فشل التسجيل. يرجى المحاولة مجدداً.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 relative overflow-hidden py-12 px-4">
            {/* Decorative background blobs */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>

            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md relative z-10 border border-gray-100">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Users size={30} strokeWidth={1.75} className="text-primary-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        تسجيل حساب ولي أمر
                    </h2>
                    <p className="text-gray-500 font-medium text-sm">أدخل البيانات لربط حسابك بملف الطالب</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-gray-700 font-bold text-sm px-1">الاسم الكامل</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-gray-700 font-bold text-sm px-1">اسم المستخدم</label>
                        <input
                            type="text"
                            placeholder="مثال: sara_2024"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder-gray-400 text-left"
                            dir="ltr"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-gray-700 font-bold text-sm px-1">البريد الإلكتروني</label>
                        <input
                            type="email"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left"
                            dir="ltr"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-gray-700 font-bold text-sm px-1">كلمة المرور</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="(6 أحرف كحد أدنى)"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder-gray-400 text-left pl-12"
                                dir="ltr"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-gray-700 font-bold text-sm px-1">رقم الطالب الأكاديمي</label>
                        <input
                            type="text"
                            placeholder="مثال: STU-2024-001"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-sans placeholder-gray-400 text-left"
                            dir="ltr"
                            value={formData.studentId}
                            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                            required
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 ${loading
                                ? 'opacity-70 cursor-not-allowed shadow-none'
                                : 'hover:bg-primary-600 shadow-primary-500/30 transform hover:-translate-y-0.5'
                                }`}
                        >
                            {loading && <Loader2 size={20} className="animate-spin" />}
                            <span>{loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}</span>
                        </button>
                    </div>

                    <div className="text-center pt-6 mt-6 border-t border-gray-100">
                        <p className="text-base text-gray-600">
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="font-bold text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-2 mx-auto"
                            >
                                <span>العودة لتسجيل الدخول</span>
                                <span>→</span>
                            </button>
                        </p>
                    </div>
                </form>

                {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-sm text-red-700 flex items-start gap-2">
                            <AlertCircle size={16} strokeWidth={2} className="text-red-500 mt-0.5 shrink-0" />
                            <span className="font-semibold">{error}</span>
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Register;
