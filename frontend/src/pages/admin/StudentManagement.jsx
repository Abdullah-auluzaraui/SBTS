import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/apiService';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Plus, Upload, X, Loader2, AlertCircle, CheckCircle2, Users, Search, Eye, EyeOff, ToggleLeft, ToggleRight, Printer, CheckSquare, Square, Pencil, Check, Lock, Unlink, Link2 } from 'lucide-react';
import UnlinkParentModal from '../../components/UnlinkParentModal';
import RelinkParentModal from '../../components/RelinkParentModal';

// ─── Print Styles (injected once) ─────────────────────────────────────────
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #print-area, #print-area * { visibility: visible !important; }
  #print-area {
    position: fixed !important;
    inset: 0 !important;
    padding: 16px !important;
    background: white !important;
    direction: rtl !important;
    font-family: 'Segoe UI', Tahoma, sans-serif !important;
  }
}
`;

function injectPrintStyles() {
  if (document.getElementById('student-print-styles')) return;
  const style = document.createElement('style');
  style.id = 'student-print-styles';
  style.innerHTML = PRINT_STYLES;
  document.head.appendChild(style);
}

// ─── Main Component ────────────────────────────────────────────────────────
const StudentManagement = () => {
    const { t } = useTranslation();
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', nationalId: '', dob: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [togglingId, setTogglingId] = useState(null);

    const [editStudent, setEditStudent] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', nationalId: '' });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    // Unlink-parent confirmation modal
    const [unlinkTarget, setUnlinkTarget] = useState(null);
    // Relink-parent confirmation modal
    const [relinkTarget, setRelinkTarget] = useState(null);

    // CSV state
    const [csvLoading, setCsvLoading] = useState(false);
    const [csvResult, setCsvResult] = useState(null);
    const fileRef = useRef(null);

    const fetchStudents = async () => {
        try {
            const url = showAll ? '/students?all=true' : '/students';
            const { data } = await api.get(url);
            setStudents(data.students);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStudents(); }, [showAll]);

    // ─── Single Create ─────────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setFormLoading(true);
        try {
            const { data } = await api.post('/students', form);
            setSuccess(`تم إضافة "${data.student.name}" بنجاح.`);
            setForm({ name: '', nationalId: '', dob: '' });
            fetchStudents();
        } catch (err) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally { setFormLoading(false); }
    };

    // ─── Toggle Active Status ──────────────────────────────────────────
    const handleToggleStatus = async (student) => {
        setTogglingId(student.id);
        try {
            await api.patch(`/students/${student.id}/status`);
            fetchStudents();
        } catch (err) {
            console.error(err);
        } finally { setTogglingId(null); }
    };

    // ─── Edit Student ─────────────────────────────────────────────────
    const openEditStudent = (s) => {
        setEditStudent(s);
        setEditForm({ name: s.name, nationalId: '' });
        setEditError('');
    };

    const handleEditStudent = async (e) => {
        e.preventDefault();
        setEditError('');
        setEditLoading(true);
        try {
            await api.patch(`/students/${editStudent.id}`, {
                name: editForm.name,
                nationalId: editForm.nationalId
            });
            setEditStudent(null);
            fetchStudents();
        } catch (err) {
            setEditError(err.response?.data?.message || t('studentManagement.errors.updateError'));
        } finally { setEditLoading(false); }
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
            setCsvResult({ success: false, message: err.response?.data?.message || t('studentManagement.csvFailed') });
        } finally {
            setCsvLoading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Students eligible for printing (active + not yet linked)
    const printableStudents = students.filter(s => s.isActive !== false && !s.parentLinked);

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <GraduationCap size={24} className="text-primary-500" />
                    {t('studentManagement.title')}
                </h2>
                <div className="flex gap-3 flex-wrap">
                    {/* Show All toggle */}
                    <button
                        onClick={() => setShowAll(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border transition-all ${showAll
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                    >
                        {showAll ? <Eye size={15} /> : <EyeOff size={15} />}
                        {showAll ? t('common.showActiveOnly') : t('common.showAll')}
                    </button>
                    <label className={`flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-dashed border-primary-300 text-primary-600 font-bold rounded-xl hover:bg-primary-50 transition-all cursor-pointer ${csvLoading ? 'opacity-70 cursor-wait' : ''}`}>
                        {csvLoading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {csvLoading ? t('studentManagement.uploading') : t('studentManagement.uploadCsv')}
                        <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" disabled={csvLoading} />
                    </label>
                    <button onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25">
                        <Plus size={18} /> {t('studentManagement.addStudent')}
                    </button>
                </div>
            </div>

            {/* CSV Result Toast */}
            {csvResult && (
                <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${csvResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {csvResult.success ? <CheckCircle2 size={20} className="text-green-500 mt-0.5 shrink-0" /> : <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />}
                    <div>
                        <p className={`font-bold ${csvResult.success ? 'text-green-700' : 'text-red-700'}`}>
                            {csvResult.success ? t('studentManagement.uploadSuccess', { count: csvResult.imported }) : csvResult.message}
                        </p>
                        {csvResult.imported !== undefined && <p className="text-sm text-gray-600 mt-1">{t('studentManagement.imported', { imported: csvResult.imported, skipped: csvResult.skipped })}</p>}
                        {csvResult.errors?.length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                                {csvResult.errors.map((e, i) => (
                                    <li key={i} className="text-xs text-red-600">
                                        • {typeof e === 'string' ? e : t(`studentManagement.csvErrors.${e.key}`, { name: e.name, message: e.message })}
                                    </li>
                                ))}
                            </ul>
                        )}
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
                    placeholder={t('studentManagement.searchPlaceholder')}
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
                        <button onClick={() => setShowForm(false)} className="absolute top-4 start-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={18} /></button>
                        <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">{t('studentManagement.addStudentTitle')}</h3>
                        <p className="text-xs text-gray-400 text-center mb-6">{t('studentManagement.addStudentHint')}</p>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">{t('studentManagement.studentNameLabel')}</label>
                                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="خالد محمد العتيبي" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">{t('studentManagement.nationalId')}</label>
                                    <input type="text" required value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left" dir="ltr" placeholder="10xxxxxxxx" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">{t('studentManagement.dob')}</label>
                                    <input type="date" required value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
                                </div>
                            </div>
                            <button type="submit" disabled={formLoading}
                                className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 ${formLoading ? 'opacity-70' : 'hover:bg-primary-600 shadow-primary-500/30'}`}>
                                {formLoading && <Loader2 size={20} className="animate-spin" />}
                                {formLoading ? t('studentManagement.adding') : t('studentManagement.add')}
                            </button>
                            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl"><p className="text-sm text-red-700 flex items-center gap-2"><AlertCircle size={16} className="text-red-500 shrink-0" /><span className="font-semibold">{error}</span></p></div>}
                            {success && <div className="p-3 bg-green-50 border border-green-100 rounded-xl"><p className="text-sm text-green-700 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500 shrink-0" /><span className="font-semibold">{success}</span></p></div>}
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {editStudent && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditStudent(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setEditStudent(null)} className="absolute top-4 start-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                            <X size={18} />
                        </button>
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mb-3">
                                <Pencil size={24} className="text-primary-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 text-center">{t('studentManagement.editStudentTitle')}</h3>
                            <p className="text-gray-400 text-sm mt-1 font-mono">{editStudent.studentId}</p>
                        </div>
                        <form onSubmit={handleEditStudent} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1 text-start">{t('studentManagement.studentNameLabel')}</label>
                                <input
                                    type="text" required autoFocus
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2 px-1">
                                    <label className="block text-gray-700 font-bold text-sm text-start">{t('studentManagement.nationalId')}</label>
                                    {editStudent.parentLinked && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                            <Lock size={11} />
                                            {t('studentManagement.nationalIdLockedBadge')}
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type="text" 
                                        value={editForm.nationalId}
                                        onChange={e => setEditForm({ ...editForm, nationalId: e.target.value })}
                                        placeholder="10xxxxxxxx"
                                        disabled={editStudent.parentLinked}
                                        readOnly={editStudent.parentLinked}
                                        aria-describedby="edit-nationalid-hint"
                                        title={editStudent.parentLinked ? t('studentManagement.nationalIdLockedHint') : undefined}
                                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all text-start ${editStudent.parentLinked
                                            ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed pe-10'
                                            : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
                                        }`}
                                    />
                                    {editStudent.parentLinked && (
                                        <Lock
                                            size={14}
                                            className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 pointer-events-none"
                                        />
                                    )}
                                </div>
                                <p
                                    id="edit-nationalid-hint"
                                    className={`text-xs px-1 text-start ${editStudent.parentLinked ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}
                                >
                                    {editStudent.parentLinked
                                        ? t('studentManagement.nationalIdLockedHint')
                                        : t('studentManagement.editNationalIdHint')}
                                </p>
                            </div>
                            <button type="submit" disabled={editLoading}
                                className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 ${editLoading ? 'opacity-70' : 'hover:bg-primary-600 shadow-primary-500/30'}`}>
                                {editLoading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                                {editLoading ? t('common.saving') : t('common.save')}
                            </button>

                            {/* Unlink Parent — appears only when the student is linked. */}
                            {editStudent.parentLinked && (
                                <div className="pt-2 border-t border-dashed border-gray-200">
                                    <div className="flex items-center justify-between gap-3 mb-2 px-1">
                                        <span className="text-xs font-bold text-gray-500 text-start">{t('studentManagement.linkedParentLabel')}</span>
                                        {editStudent.parentName && (
                                            <span className="text-xs font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200 truncate text-end">
                                                {editStudent.parentName}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setUnlinkTarget(editStudent)}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 rounded-xl font-bold text-sm transition-colors"
                                    >
                                        <Unlink size={16} />
                                        {t('studentManagement.unlinkParent')}
                                    </button>
                                </div>
                            )}

                            {/* Relink Parent — appears when student was unlinked by admin (has previousParentId) */}
                            {!editStudent.parentLinked && editStudent.previousParentId && (
                                <div className="pt-2 border-t border-dashed border-gray-200">
                                    <div className="flex items-center justify-between gap-3 mb-2 px-1">
                                        <span className="text-xs font-bold text-gray-500 text-start">{t('studentManagement.unlinkedParentLabel')}</span>
                                        {editStudent.previousParentName && (
                                            <span className="text-xs font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200 truncate text-end">
                                                {editStudent.previousParentName}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setRelinkTarget(editStudent)}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-100 rounded-xl font-bold text-sm transition-colors"
                                    >
                                        <Link2 size={16} />
                                        {t('studentManagement.relinkParent')}
                                    </button>
                                </div>
                            )}
                            {editError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-sm text-red-700 flex items-start gap-2">
                                        <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                        <span className="font-semibold">{editError}</span>
                                    </p>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* Unlink Parent Confirmation Modal */}
            {unlinkTarget && (
                <UnlinkParentModal
                    student={unlinkTarget}
                    onClose={() => setUnlinkTarget(null)}
                    onSuccess={() => {
                        setUnlinkTarget(null);
                        setEditStudent(null);
                        fetchStudents();
                    }}
                />
            )}

            {/* Relink Parent Confirmation Modal */}
            {relinkTarget && (
                <RelinkParentModal
                    student={relinkTarget}
                    onClose={() => setRelinkTarget(null)}
                    onSuccess={() => {
                        setRelinkTarget(null);
                        setEditStudent(null);
                        fetchStudents();
                    }}
                />
            )}

            {/* Table */}
            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
            ) : students.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                    <Users size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-lg">{t('studentManagement.noStudents')}</p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                    <Search size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-lg">{t('studentManagement.noResults')}</p>
                    <p className="text-sm mt-1">{t('studentManagement.tryOtherWords')}</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-bold">{t('studentManagement.total', { count: filteredStudents.length })}</span>
                    </div>

                    {/* ── Mobile: Card List (< md) ───────────────── */}
                    <div className="md:hidden flex flex-col p-3 gap-3 bg-gray-50/30">
                        {filteredStudents.map(s => (
                            <div key={s.id} className={`bg-white border rounded-xl p-4 shadow-sm ${!s.isActive ? 'border-red-100 opacity-70' : 'border-gray-100'}`}>
                                <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-800 text-sm truncate">{s.name}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[11px] font-mono shrink-0" dir="ltr">
                                                {s.studentId}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                                                {s.isActive ? t('common.active') : t('common.inactive')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        {s.parentLinked ? (
                                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {t('studentManagement.linked')}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> {t('studentManagement.notLinked')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                                    <div>
                                        <span className="text-[10px] text-gray-400 block mb-0.5">{t('studentManagement.nationalId')}:</span>
                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-200 font-mono" dir="ltr">
                                            {s.nationalId}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditStudent(s)}
                                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 transition-all"
                                        >
                                            <Pencil size={12} /> {t('common.edit')}
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(s)}
                                            disabled={togglingId === s.id}
                                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${s.isActive
                                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                                        >
                                            {togglingId === s.id ? <Loader2 size={12} className="animate-spin" /> : s.isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                                            {s.isActive ? t('studentManagement.disable') : t('studentManagement.enable')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Desktop: Table (>= md) ─────────────────── */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/50">
                                <tr className="text-gray-500 font-bold">
                                    <th className="px-6 py-3 text-start">{t('studentManagement.studentCol')}</th>
                                    <th className="px-6 py-3 text-start">{t('studentManagement.studentIdCol')}</th>
                                    <th className="px-6 py-3 text-center">{t('common.status')}</th>
                                    <th className="px-6 py-3 text-center">{t('studentManagement.nationalIdCol')}</th>
                                    <th className="px-6 py-3 text-center">{t('studentManagement.parentCol')}</th>
                                    <th className="px-6 py-3 text-center">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map(s => (
                                    <tr key={s.id} className={`hover:bg-gray-50/50 transition-colors ${!s.isActive ? 'opacity-60 bg-gray-50/30' : ''}`}>
                                        <td className="px-6 py-4 font-bold text-gray-800 text-start">{s.name}</td>
                                        <td className="px-6 py-4 text-start"><span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-mono" dir="ltr">{s.studentId}</span></td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                                                <span className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-red-400'}`}></span>
                                                {s.isActive ? t('common.active') : t('common.inactive')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-200 font-mono" dir="ltr">{s.nationalId}</span>
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
                                                    {t('studentManagement.notLinked')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    onClick={() => openEditStudent(s)}
                                                    className="p-2 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-colors"
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(s)}
                                                    disabled={togglingId === s.id}
                                                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${s.isActive
                                                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                                                >
                                                    {togglingId === s.id ? <Loader2 size={12} className="animate-spin" /> : s.isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                                                    {s.isActive ? t('studentManagement.disable') : t('studentManagement.enable')}
                                                </button>
                                            </div>
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
