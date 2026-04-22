import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, AlertCircle, Eye, EyeOff, Loader2, Phone, CheckCircle, ShieldCheck } from 'lucide-react';

const Register = () => {
    // Step 1 Form Data
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        phone: '',
        studentName: '',
        nationalId: '',
        dob: ''
    });

    // Step 2 OTP Data
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState('');
    const [studentId, setStudentId] = useState(null);

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { registerRequest, registerVerify, loading } = useAuth();
    const navigate = useNavigate();

    // ─── Step 1: Request OTP ───────────────────────────────────────────
    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setError('');

        // Basic Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('يرجى إدخال بريد إلكتروني صحيح.');
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(formData.username)) {
            setError('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط.');
            return;
        }

        if (formData.password.length < 6) {
            setError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
            return;
        }

        try {
            const data = await registerRequest(
                formData.name,
                formData.username,
                formData.email,
                formData.phone,
                formData.studentName,
                formData.nationalId,
                formData.dob
            );

            // Success! Save studentId and move to step 2
            setStudentId(data.studentId);
            setStep(2);
            
            if (data.mockOtp) {
                console.log(`\n========================================`);
                console.log(`🔑 MOCK OTP CODE: ${data.mockOtp}`);
                console.log(`========================================\n`);
            }
        } catch (err) {
            const errorMessages = {
                USER_EXISTS: 'المستخدم مسجل مسبقاً. يرجى تسجيل الدخول أو استخدام بريد مختلف.',
                STUDENT_ALREADY_LINKED: 'هذا الطالب مرتبط بالفعل بحساب ولي أمر. يرجى التواصل مع الإدارة.',
                VALIDATION_ERROR: err.message || 'يرجى التحقق من البيانات المدخلة.',
                NETWORK_ERROR: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك.',
            };
            setError(errorMessages[err.errorCode] || err.message || 'فشل التحقق. تأكد من صحة بيانات الطالب.');
        }
    };

    // ─── Step 2: Verify OTP ────────────────────────────────────────────
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (otp.length !== 6) {
            setError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
            return;
        }

        try {
            await registerVerify(
                formData.name,
                formData.username,
                formData.email,
                formData.password,
                formData.phone,
                otp,
                studentId
            );
            // registerVerify automatically persists session and navigates to /parent
        } catch (err) {
            setError(err.message || 'رمز التحقق غير صحيح أو انتهت صلاحيته.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 relative overflow-hidden py-12 px-4">
            {/* Decorative background blobs */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>

            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-lg relative z-10 border border-gray-100">

                {step === 1 ? (
                    // ─── Step 1 UI: Registration Form ────────────────────────────────
                    <>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Users size={30} strokeWidth={1.75} className="text-primary-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">تسجيل حساب ولي أمر</h2>
                            <p className="text-gray-500 font-medium text-sm">أدخل بياناتك وبيانات الطالب للتحقق</p>
                        </div>

                        <form onSubmit={handleRequestOTP} className="space-y-6">

                            {/* Parent Info Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2">بيانات ولي الامر</h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                            placeholder="user_name"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder-gray-400 text-left"
                                            dir="ltr"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        <label className="block text-gray-700 font-bold text-sm px-1">رقم الجوال</label>
                                        <input
                                            type="tel"
                                            placeholder="05xxxxxxxx"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-sans placeholder-gray-400 text-left"
                                            dir="ltr"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">كلمة المرور</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
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
                            </div>

                            {/* Student Info Section */}
                            <div className="space-y-4 pt-2">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-2">بيانات الطالب </h3>

                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">اسم الطالب (ثلاثي)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        value={formData.studentName}
                                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-gray-700 font-bold text-sm px-1">الهوية الوطنية</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-sans text-left"
                                            dir="ltr"
                                            value={formData.nationalId}
                                            onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-gray-700 font-bold text-sm px-1">تاريخ الميلاد</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                            value={formData.dob}
                                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                            required
                                        />
                                    </div>
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
                                    <span>{loading ? 'جاري المطابقة...' : 'مطابقة البيانات'}</span>
                                </button>
                            </div>

                            <div className="text-center pt-4 mt-4 border-t border-gray-100">
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
                    </>
                ) : (
                    // ─── Step 2 UI: OTP Verification ────────────────────────────────
                    <div className="text-center animate-fade-in-up">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100">
                            <ShieldCheck size={40} strokeWidth={1.5} className="text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">التحقق بخطوتين</h2>
                        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                            تمت مطابقة بيانات الطالب بنجاح! <br />
                            أرسلنا رمز تحقق (OTP) إلى جوالك <span className="font-bold text-gray-800" dir="ltr">{formData.phone}</span>
                        </p>

                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className="flex justify-center">
                                <input
                                    type="text"
                                    maxLength="6"
                                    className="w-48 text-center text-3xl tracking-widest px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-0 focus:border-green-500 transition-all font-mono"
                                    placeholder="------"
                                    dir="ltr"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    autoFocus
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                className={`w-full bg-green-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-4 ${(loading || otp.length !== 6)
                                    ? 'opacity-70 cursor-not-allowed shadow-none'
                                    : 'hover:bg-green-600 shadow-green-500/30 transform hover:-translate-y-0.5'
                                    }`}
                            >
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <CheckCircle size={20} />
                                )}
                                <span>{loading ? 'جاري التفعيل...' : 'تأكيد الحساب'}</span>
                            </button>

                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    تعديل البيانات
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-shake">
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
