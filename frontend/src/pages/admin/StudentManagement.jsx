import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/apiService';
import { GraduationCap, Plus, Upload, X, Loader2, AlertCircle, CheckCircle2, Users, Search } from 'lucide-react';

const StudentManagement = () => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', studentId: '', grade: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // CSV state
    const [csvLoading, setCsvLoading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const fileRef = useRef(null);

    const fetchStudents = async () => {
        try {
            const { data } = await api.get('/students');
            setStudents(data.students);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStudents(); }, []);

    // ─── Single Create ─────────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setFormLoading(true);
        try {
            const { data } = await api.post('/students', form);
            setSuccess(`تم إضافة "${data.student.name}" — رمز الوصول: ${data.student.parentAccessCode}`);
            setForm({ name: '', studentId: '', grade: '' });
            fetchStudents();
        } catch (err) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally { setFormLoading(false); }
    };

    // ─── CSV Bulk Upload ───────────────────────────────────────────────
    const handleCSV = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCsvLoading(true); setCsvResult(null);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await api.post('/students/bulk', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setCsvResult(data);
            fetchStudents();
        } catch (err) {
            setCsvResult({ success: false, message: err.response?.data?.message || 'فشل رفع الملف' });
        } finally {
            setCsvLoading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <GraduationCap size={24} className="text-primary-500" />
                    إدارة الطلاب
                </h2>
                <div className="flex gap-3">
                    <label className={`flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-dashed border-primary-300 text-primary-600 font-bold rounded-xl hover:bg-primary-50 transition-all cursor-pointer ${csvLoading ? 'opacity-70 cursor-wait' : ''}`}>
                        {csvLoading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {csvLoading ? 'جاري الرفع...' : 'رفع CSV'}
                        <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" disabled={csvLoading} />
                    </label>
                    <button onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25">
                        <Plus size={18} /> إضافة طالب
                    </button>
                </div>
            </div>

            {/* CSV Result Toast */}
            {csvResult && (
                <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${csvResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {csvResult.success ? <CheckCircle2 size={20} className="text-green-500 mt-0.5 shrink-0" /> : <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />}
                    <div>
                        <p className={`font-bold ${csvResult.success ? 'text-green-700' : 'text-red-700'}`}>{csvResult.message}</p>
                        {csvResult.imported !== undefined && <p className="text-sm text-gray-600 mt-1">تم استيراد: {csvResult.imported} — تم تجاهل: {csvResult.skipped}</p>}
                    </div>
                    <button onClick={() => setCsvResult(null)} className="mr-auto text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
            )}

            {/* Search Bar */}
            <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-2 flex items-center gap-2 shadow-sm">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                    <Search size={20} className="text-gray-400" />
                </div>
                <input 
                    type="text" 
                    placeholder="ابحث عن طالب بالاسم أو برقم الطالب..." 
                    className="w-full bg-transparent border-none focus:outline-none text-gray-700 placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="p-2 text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Create Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowForm(false)} className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={18} /></button>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">إضافة طالب</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">اسم الطالب *</label>
                                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="خالد العتيبي" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">رقم الطالب *</label>
                                <input type="text" required value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left" dir="ltr" placeholder="STU-2024-001" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">الصف</label>
                                <input type="text" value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="5A" />
                            </div>
                            <button type="submit" disabled={formLoading}
                                className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 ${formLoading ? 'opacity-70' : 'hover:bg-primary-600 shadow-primary-500/30'}`}>
                                {formLoading && <Loader2 size={20} className="animate-spin" />}
                                {formLoading ? 'جاري الإضافة...' : 'إضافة'}
                            </button>
                            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl"><p className="text-sm text-red-700 flex items-center gap-2"><AlertCircle size={16} className="text-red-500 shrink-0" /><span className="font-semibold">{error}</span></p></div>}
                            {success && <div className="p-3 bg-green-50 border border-green-100 rounded-xl"><p className="text-sm text-green-700 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500 shrink-0" /><span className="font-semibold">{success}</span></p></div>}
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
            ) : students.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                    <Users size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-lg">لا يوجد طلاب</p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                    <Search size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-lg">لم يتم العثور على نتائج</p>
                    <p className="text-sm mt-1">جرب البحث بكلمات أخرى</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-bold">إجمالي: {filteredStudents.length} طالب</span>
                    </div>

                    {/* ── Mobile: Card List (< md) ───────────────── */}
                    <div className="md:hidden flex flex-col p-3 gap-3 bg-gray-50/30">
                        {filteredStudents.map(s => (
                            <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-800 text-sm truncate">{s.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[11px] font-mono shrink-0" dir="ltr">
                                                {s.studentId}
                                            </span>
                                            {s.grade && <span className="text-[11px] text-gray-400">الصف: {s.grade}</span>}
                                        </div>
                                    </div>
                                    {/* Parent Status Badge */}
                                    <div className="shrink-0 text-right">
                                        {s.parentLinked ? (
                                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> مرتبط
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> غير مرتبط
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                    <div className="text-xs">
                                        <span className="text-gray-400">ولي الأمر: </span>
                                        <span className="font-bold text-gray-700">{s.parentLinked ? s.parentName : '—'}</span>
                                    </div>
                                    {!s.parentLinked && (
                                        <div className="text-right">
                                            <span className="text-[10px] text-gray-400 block mb-0.5">رمز الوصول:</span>
                                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-200 font-mono" dir="ltr">
                                                {s.parentAccessCode}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Desktop: Table (>= md) ─────────────────── */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/50">
                                <tr className="text-gray-500 font-bold">
                                    <th className="px-6 py-3 text-right">الطالب</th>
                                    <th className="px-6 py-3 text-right">رقم الطالب</th>
                                    <th className="px-6 py-3 text-center">الصف</th>
                                    <th className="px-6 py-3 text-center">رمز الوصول</th>
                                    <th className="px-6 py-3 text-center">ولي الأمر</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{s.name}</td>
                                        <td className="px-6 py-4"><span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-mono" dir="ltr">{s.studentId}</span></td>
                                        <td className="px-6 py-4 text-center text-gray-600">{s.grade || '—'}</td>
                                        <td className="px-6 py-4 text-center">
                                            {!s.parentLinked ? (
                                                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-200 font-mono" dir="ltr">{s.parentAccessCode}</span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {s.parentLinked ? (
                                                <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                    {s.parentName}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-200">
                                                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                                    غير مرتبط
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentManagement;
