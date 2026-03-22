import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/apiService';
import {
    UserCog, Plus, X, Loader2, AlertCircle, Eye, EyeOff,
    Ban, CircleCheck, Trash2, Phone, Check
} from 'lucide-react';

const DriverManagement = () => {
    const [showAll, setShowAll] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', username: '', password: '', phone: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [successId, setSuccessId] = useState(null); // Flash for created item

    const fetchDrivers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(showAll ? '/users/drivers?all=true' : '/users/drivers');
            setDrivers(data.drivers);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [showAll]);

    useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

    const resetForm = () => {
        setForm({ name: '', username: '', password: '', phone: '' });
        setShowForm(false);
        setFormError('');
        setShowPassword(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);
        try {
            const { data } = await api.post('/users/driver', form);
            resetForm();
            fetchDrivers();
            setSuccessId(data.driver.id);
            setTimeout(() => setSuccessId(null), 3000);
        } catch (err) {
            setFormError(err.response?.data?.message || 'حدث خطأ أثناء الإنشاء');
        } finally { setFormLoading(false); }
    };

    const handleToggleStatus = async (driver) => {
        const action = driver.isActive ? 'تعليق' : 'تفعيل';
        if (!window.confirm(`هل تريد ${action} حساب السائق "${driver.name}"؟`)) return;
        try {
            await api.patch(`/users/drivers/${driver._id}/status`);
            fetchDrivers();
        } catch (err) { console.error(err); }
    };


    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <UserCog size={24} className="text-primary-500" />
                    إدارة السائقين
                </h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAll(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${
                            showAll
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        {showAll ? <Eye size={16} /> : <EyeOff size={16} />}
                        {showAll ? 'عرض النشطين فقط' : 'عرض الكل'}
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25"
                    >
                        <Plus size={18} /> إضافة سائق
                    </button>
                </div>
            </div>

            {/* ── Add Driver Modal ─────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={resetForm} className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                            <X size={18} />
                        </button>
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mb-3">
                                <UserCog size={28} className="text-primary-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">إضافة سائق جديد</h3>
                            <p className="text-gray-400 text-sm mt-1">سيُستخدم اسم المستخدم لتسجيل الدخول</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Full Name */}
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">الاسم الكامل</label>
                                <input
                                    type="text" required
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                />
                            </div>

                            {/* Username */}
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">اسم المستخدم</label>
                                <input
                                    type="text" required
                                    dir="ltr"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                    placeholder="driver_ahmed"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-right"
                                />

                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">كلمة المرور</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'} required
                                        dir="ltr"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        minLength={6}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-right"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">رقم الجوال</label>
                                <div className="relative">
                                    <input
                                        type="tel" dir="ltr" required
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                                        placeholder="0512345678"
                                        minLength={10}
                                        maxLength={10}
                                        pattern="[0-9]*"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-right"
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={formLoading}
                                className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-2 ${formLoading ? 'opacity-70' : 'hover:bg-primary-600 shadow-primary-500/30'}`}>
                                {formLoading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                                {formLoading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
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
                    </div>
                </div>
            )}

            {/* ── Drivers Table ────────────────────────────────── */}
            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
            ) : drivers.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                    <UserCog size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-lg">لا يوجد سائقون</p>
                    <p className="text-sm mt-1">قم بإضافة أول سائق لمدرستك</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-gray-500 font-bold text-right">
                                <th className="px-6 py-4">السائق</th>
                                <th className="px-6 py-4">اسم المستخدم</th>
                                <th className="px-6 py-4">الجوال</th>
                                <th className="px-6 py-4 text-center">الحالة</th>
                                <th className="px-6 py-4 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {drivers.map(driver => (
                                <tr
                                    key={driver._id}
                                    className={`hover:bg-gray-50/50 transition-colors group ${successId === driver._id ? 'bg-green-50/50' : ''}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm shrink-0">
                                                {driver.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 flex items-center gap-1.5">
                                                    {driver.name}
                                                    {successId === driver._id && <Check size={14} className="text-green-500" />}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="text-xs bg-gray-100 px-2.5 py-1 rounded-lg text-gray-600 font-mono">{driver.username}</code>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {driver.phone ? (
                                            <span className="flex items-center gap-1.5"><Phone size={13} className="text-gray-400" />{driver.phone}</span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {driver.isActive ? (
                                            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-100">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                نشط
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-100">
                                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                                معلّق
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleToggleStatus(driver)}
                                                className={`p-2 rounded-lg transition-colors ${driver.isActive
                                                    ? 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                                                    : 'hover:bg-green-50 text-gray-400 hover:text-green-500'}`}
                                                title={driver.isActive ? 'تعليق الحساب' : 'تفعيل الحساب'}
                                            >
                                                {driver.isActive ? <Ban size={16} /> : <CircleCheck size={16} />}
                                            </button>

                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DriverManagement;
