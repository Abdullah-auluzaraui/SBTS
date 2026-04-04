import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import api from '../services/apiService';
import { User, Map, Bus, GraduationCap, Clock, Bell, Phone, X, UserPlus, Loader2, AlertCircle, CheckCircle2, MapPin } from 'lucide-react';
import LocationPicker from '../components/maps/LocationPicker';

const ParentDashboard = () => {
    const { user } = useAuth();
    const [showToast, setShowToast] = useState(false);

    // ─── FE-S1-9: Add Another Child Modal State ────────────────────────
    const [showAddChildModal, setShowAddChildModal] = useState(false);
    const [childForm, setChildForm] = useState({ studentId: '', parentAccessCode: '' });
    const [childLoading, setChildLoading] = useState(false);
    const [childError, setChildError] = useState('');
    const [childSuccess, setChildSuccess] = useState('');

    // ─── Maps Feature State ──────────────────────────────────────────
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(true);
    const [pickingLocationFor, setPickingLocationFor] = useState(null);

    const fetchStudents = async () => {
        try {
            const { data } = await api.get('/parents/students');
            setStudents(data.students);
        } catch (err) {
            console.error('Failed to fetch students:', err);
        } finally {
            setStudentsLoading(false);
        }
    };

    useEffect(() => { fetchStudents(); }, []);

    // Simulate an approaching notification toast after 2 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowToast(true);
        }, 2000);

        // Auto-hide the toast after 6 seconds of showing
        const hideTimer = setTimeout(() => {
            setShowToast(false);
        }, 8000);

        return () => {
            clearTimeout(timer);
            clearTimeout(hideTimer);
        };
    }, []);

    // ─── FE-S1-9: Handle linking another child ─────────────────────────
    const handleAddChild = async (e) => {
        e.preventDefault();
        setChildError('');
        setChildSuccess('');
        setChildLoading(true);

        try {
            const { data } = await api.post('/parents/students', {
                studentId: childForm.studentId,
                parentAccessCode: childForm.parentAccessCode
            });
            setChildSuccess(`تم ربط الطالب "${data.student.name}" بنجاح!`);
            setChildForm({ studentId: '', parentAccessCode: '' });

            // Auto-close modal after 2 seconds
            setTimeout(() => {
                setShowAddChildModal(false);
                setChildSuccess('');
            }, 2000);
        } catch (err) {
            const payload = err.response?.data || {};
            const errorMessages = {
                INVALID_CREDENTIALS: 'رقم الطالب أو رمز الوصول غير صحيح.',
                STUDENT_ALREADY_LINKED: 'هذا الطالب مرتبط بالفعل بحساب ولي أمر.',
                SCHOOL_MISMATCH: 'هذا الطالب لا ينتمي لنفس مدرستك.',
            };
            setChildError(errorMessages[payload.errorCode] || payload.message || 'حدث خطأ. يرجى المحاولة مجدداً.');
        } finally {
            setChildLoading(false);
        }
    };

    const handleLocationSaved = (position) => {
        setPickingLocationFor(null);
        setShowToast(true); // Optional: re-use toast to say success
        fetchStudents(); // Refresh students to get new coordinates
    };

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-10 overflow-hidden relative min-h-[85vh] lg:min-h-0">

                <div className="absolute top-0 right-0 w-full h-40 bg-gradient-to-b from-primary-50/70 to-transparent pointer-events-none"></div>

                {/* Toast Notification (In-App) */}
                <div
                    className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 transform ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0 pointer-events-none'
                        } w-[90%] max-w-sm`}
                >
                    <div className="bg-white border border-primary-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.08)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-transparent via-primary-50/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none"></div>
                        <div className="flex items-center gap-4 z-10">
                            <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                <Bell size={20} strokeWidth={2} className="text-primary-500 animate-bounce" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">الحافلة تقترب!</h4>
                                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                                    الحافلة BUS-001 تصل لمحطتك خلال 3 دقائق.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowToast(false)}
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                        >
                            <X size={16} strokeWidth={2} />
                        </button>
                    </div>
                </div>

                {/* Welcome Message */}
                <div className="mb-8 border-b border-gray-100 pb-6 relative z-10 flex items-center gap-4">
                    <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
                        <User size={32} strokeWidth={1.75} className="text-primary-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl text-gray-800 font-bold">
                            مرحباً، <span className="text-primary-600">{user?.name}</span>
                        </h2>
                        <p className="text-gray-500 mt-1">تتبع حافلة أبنائك بسهولة</p>
                    </div>
                </div>

                {/* ETA Panel (Prioritized) */}
                <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow mb-8 relative z-10 overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full -ml-12 -mb-12 transition-transform group-hover:scale-110 pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shadow-inner shrink-0 relative z-10">
                                <Clock size={28} strokeWidth={2} className="text-blue-500" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-xl text-gray-800 mb-1">الوقت المقدر للوصول</h3>
                                <p className="text-gray-500 text-sm">الوقت المتبقي للوصول إلى محطة: <span className="font-bold text-gray-700">النخيل</span></p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 relative z-10 bg-gray-50/50 px-6 py-4 rounded-2xl border border-gray-100/50">
                            <div className="text-6xl font-black text-blue-600 drop-shadow-sm flex items-baseline gap-2 tracking-tight">
                                <span>8</span>
                                <span className="text-2xl font-bold text-blue-400">دقائق</span>
                            </div>
                            <div className="hidden sm:block h-12 w-px bg-gray-200"></div>
                            <div className="px-5 py-2.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-full border border-blue-100 flex items-center gap-2 shadow-sm whitespace-nowrap">
                                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                                الحافلة تقترب
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-8 relative z-10 flex-grow flex flex-col">
                    {/* Student Status */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-[0_4px_24px_rgb(0,0,0,0.04)] flex flex-col h-full flex-grow">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                            <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                <GraduationCap size={24} strokeWidth={2.5} className="text-primary-500" />
                                الطلاب المسجلين
                            </h3>
                            <span className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-sm font-bold border border-primary-100">
                                {students.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow items-start content-start">
                            {studentsLoading ? (
                                <div className="flex items-center justify-center p-8 text-primary-500">
                                    <Loader2 size={30} className="animate-spin" />
                                </div>
                            ) : students.length === 0 ? (
                                <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-100 text-gray-500">
                                    لا يوجد طلاب مرتبطين بحسابك حالياً.
                                </div>
                            ) : (
                                students.map(student => (
                                    <div key={student._id} className="flex flex-col gap-3 bg-gray-50 px-5 py-5 border border-gray-100 rounded-2xl">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                                    <span className="text-gray-500 font-bold text-lg">{student.name.charAt(0)}</span>
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-gray-800 text-lg mb-1">{student.name}</span>
                                                    <span className="text-xs text-gray-500 font-medium bg-white px-2 py-0.5 rounded border border-gray-200">
                                                        {student.assignedBus ? `حافلة: ${student.assignedBus.busId}` : 'غير معين لحافلة'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center sm:justify-start gap-2 bg-green-50 text-green-700 px-4 py-2.5 rounded-xl border border-green-200 shadow-sm font-bold text-sm">
                                                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]"></span>
                                                {student.assignedBus ? 'متواجد بالحافلة' : 'في المنزل'}
                                            </div>
                                        </div>

                                        {/* Driver Info */}
                                        {student.assignedBus?.driver && (
                                            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                                        <User size={14} className="text-gray-500" />
                                                    </div>
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="text-[10px] text-gray-500 font-normal">السائق</span>
                                                        <span className="text-xs font-bold text-gray-800">{student.assignedBus.driver.name}</span>
                                                    </div>
                                                </div>
                                                {student.assignedBus.driver.phone ? (
                                                    <a
                                                        href={`tel:${student.assignedBus.driver.phone}`}
                                                        className="flex items-center justify-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 shadow-sm font-bold text-xs hover:bg-green-100 transition-colors"
                                                    >
                                                        <Phone size={14} strokeWidth={2} />
                                                        اتصال
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-400">لا يوجد رقم</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions Footer */}
                                        <div className="border-t border-gray-200 mt-2 pt-4 flex flex-col sm:flex-row gap-3 justify-between">
                                            {/* Track Bus Button */}
                                            <button
                                                disabled={!student.assignedBus}
                                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${student.assignedBus
                                                    ? 'bg-primary-500 text-white border border-primary-600 hover:bg-primary-600 shadow-md shadow-primary-500/20'
                                                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                                    }`}
                                            >
                                                <Map size={18} strokeWidth={2} />
                                                تتبع الحافلة
                                            </button>

                                            {/* Set Location Button */}
                                            <button
                                                onClick={() => setPickingLocationFor(student)}
                                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all border ${student.location && student.location.coordinates[0] !== 0
                                                    ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <MapPin size={18} strokeWidth={2} />
                                                {student.location && student.location.coordinates[0] !== 0 ? 'تحديث المنزل' : 'موقع المنزل'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* FE-S1-9: Add Another Child Button */}
                            <button
                                onClick={() => { setShowAddChildModal(true); setChildError(''); setChildSuccess(''); }}
                                className="flex items-center justify-center gap-3 text-primary-600 bg-primary-50/50 hover:bg-primary-50 border-2 border-primary-100 border-dashed rounded-2xl p-5 font-bold transition-colors w-full h-full min-h-[140px]"
                            >
                                <UserPlus size={24} strokeWidth={2} className="opacity-70" />
                                <span>إضافة طالب آخر </span>
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* ─── FE-S1-9: Add Another Child Modal ─────────────────────────── */}
            {showAddChildModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddChildModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowAddChildModal(false)}
                            className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <UserPlus size={28} strokeWidth={1.75} className="text-primary-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">إضافة طالب آخر</h3>
                            <p className="text-gray-500 text-sm mt-1">أدخل رقم الطالب ورمز الوصول المقدم من المدرسة</p>
                        </div>

                        <form onSubmit={handleAddChild} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">رقم الطالب</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-sans placeholder-gray-400 text-left"
                                    dir="ltr"
                                    value={childForm.studentId}
                                    onChange={(e) => setChildForm({ ...childForm, studentId: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">رمز الوصول (Access Code)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-sans placeholder-gray-400 text-left"
                                    dir="ltr"
                                    value={childForm.parentAccessCode}
                                    onChange={(e) => setChildForm({ ...childForm, parentAccessCode: e.target.value })}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={childLoading}
                                className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-2 ${childLoading
                                    ? 'opacity-70 cursor-not-allowed shadow-none'
                                    : 'hover:bg-primary-600 shadow-primary-500/30 transform hover:-translate-y-0.5'
                                    }`}
                            >
                                {childLoading && <Loader2 size={20} className="animate-spin" />}
                                <span>{childLoading ? 'جاري الربط...' : 'ربط الطالب'}</span>
                            </button>
                        </form>

                        {/* Error */}
                        {childError && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-sm text-red-700 flex items-start gap-2">
                                    <AlertCircle size={16} strokeWidth={2} className="text-red-500 mt-0.5 shrink-0" />
                                    <span className="font-semibold">{childError}</span>
                                </p>
                            </div>
                        )}

                        {/* Success */}
                        {childSuccess && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl">
                                <p className="text-sm text-green-700 flex items-start gap-2">
                                    <CheckCircle2 size={16} strokeWidth={2} className="text-green-500 mt-0.5 shrink-0" />
                                    <span className="font-semibold">{childSuccess}</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Map Location Picker Modal ──────────────────────── */}
            {pickingLocationFor && (
                <LocationPicker
                    student={pickingLocationFor}
                    onClose={() => setPickingLocationFor(null)}
                    onSaved={handleLocationSaved}
                />
            )}
        </MainLayout>
    );
};

export default ParentDashboard;
