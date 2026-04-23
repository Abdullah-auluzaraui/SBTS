import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bus, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

// Task FE-S1-2: LoginForm
const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [showForgotModal, setShowForgotModal] = useState(false);
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(username, password);
        } catch (err) {
            // Map backend errorCodes (Section 3.3) to user-friendly Arabic messages
            const errorMessages = {
                INVALID_CREDENTIALS: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
                ACCOUNT_INACTIVE: 'تم تعليق حسابك. يرجى التواصل مع الإدارة.',
                NETWORK_ERROR: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك.',
            };
            setError(errorMessages[err.errorCode] || err.message || 'فشل تسجيل الدخول. يرجى المحاولة مجدداً.');
        }
    };

    return (
        <>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 relative overflow-hidden">
            {/* Decorative background blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md relative z-10 border border-gray-100">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Bus size={40} strokeWidth={1.75} className="text-primary-500" />
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-l from-primary-600 to-primary-400 bg-clip-text text-transparent mb-2">
                        مرحباً بك مجدداً
                    </h2>
                    <p className="text-gray-500 font-medium">تسجيل الدخول إلى نظام تتبع الحافلات</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-gray-700 font-bold text-sm px-1">اسم المستخدم</label>
                        <input
                            type="text"
                            placeholder="ادخل اسم المستخدم"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder-gray-400"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-gray-700 font-bold text-sm px-1">كلمة المرور</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="أدخل كلمة المرور"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder-gray-400 pl-12"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                            <span>{loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}</span>
                        </button>
                    </div>

                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => setShowForgotModal(true)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-bold hover:underline transition-colors"
                        >
                            نسيت كلمة المرور؟
                        </button>
                    </div>

                    <div className="text-center pt-4 mt-2 border-t border-gray-100">
                        <p className="text-base text-gray-600">
                            ليس لديك حساب؟{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/register')}
                                className="font-bold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                            >
                                سجل من هنا كولي أمر
                            </button>
                        </p>
                    </div>
                </form>

                {/* Error state */}
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

        {showForgotModal && <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />}
        </>
    );
};

export default Login;
