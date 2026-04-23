import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/apiService';
import { Bus, Plus, X, Loader2, AlertCircle, Pencil, Ban, CircleCheck, Users, Check, UserCheck, Eye, EyeOff, MapPin, AlertTriangle, Navigation2, Network } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const schoolIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const BUS_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const BusManagement = () => {
    const [buses, setBuses] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Bus form state
    const [showForm, setShowForm] = useState(false);
    const [editingBus, setEditingBus] = useState(null);
    const [form, setForm] = useState({ busId: '', capacity: '', driver: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    // Student assignment state
    const [assigningBus, setAssigningBus] = useState(null); // The bus object
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignMsg, setAssignMsg] = useState('');
    const [studentSearch, setStudentSearch] = useState('');

    const [showAll, setShowAll] = useState(false);

    // Auto-assign state
    const [showAutoAssign, setShowAutoAssign] = useState(false);
    const [autoLoading, setAutoLoading] = useState(false);
    const [autoPreview, setAutoPreview] = useState(null);
    const [autoError, setAutoError] = useState('');
    const [autoConfirming, setAutoConfirming] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [busRes, driverRes, studentsRes] = await Promise.all([
                api.get(showAll ? '/buses?all=true' : '/buses'),
                api.get('/buses/drivers'),
                api.get('/students')
            ]);
            setBuses(busRes.data.buses);
            setDrivers(driverRes.data.drivers);
            setAllStudents(studentsRes.data.students);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [showAll]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ─── Bus Form ─────────────────────────────────────────────────────
    const resetForm = () => {
        setForm({ busId: '', capacity: '', driver: '' });
        setEditingBus(null);
        setShowForm(false);
        setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);
        try {
            const payload = {
                capacity: parseInt(form.capacity),
                driver: form.driver || null
            };
            if (editingBus) {
                await api.put(`/buses/${editingBus}`, payload);
            } else {
                await api.post('/buses', { busId: form.busId, ...payload });
            }
            resetForm();
            fetchAll();
        } catch (err) {
            setFormError(err.response?.data?.message || 'حدث خطأ');
        } finally { setFormLoading(false); }
    };

    const handleToggleStatus = async (bus) => {
        const action = bus.isActive ? 'تعطيل' : 'تفعيل';
        if (!window.confirm(`هل تريد ${action} الحافلة "${bus.busId}"?`)) return;
        try {
            await api.patch(`/buses/${bus._id}/status`);
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const startEdit = (bus) => {
        setEditingBus(bus._id);
        setForm({ busId: bus.busId, capacity: bus.capacity.toString(), driver: bus.driver?._id || '' });
        setShowForm(true);
        setFormError('');
    };

    // ─── Student Assignment ────────────────────────────────────────────
    const openAssignModal = (bus) => {
        setAssigningBus(bus);
        setAssignMsg('');
        setStudentSearch('');
        // Pre-select students already assigned to this bus
        const alreadyAssigned = new Set(
            allStudents.filter(s => s.assignedBus === bus.busId).map(s => s.id)
        );
        setSelectedStudents(alreadyAssigned);
    };

    const toggleStudent = (id) => {
        setSelectedStudents(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleAssignSave = async () => {
        setAssignLoading(true);
        setAssignMsg('');
        try {
            const { data } = await api.put(`/buses/${assigningBus._id}/assign-students`, {
                studentIds: Array.from(selectedStudents)
            });
            // Show success — may include partial blocks
            if (data.blocked && data.blocked.length > 0) {
                setAssignMsg({ type: 'partial', text: data.message, blocked: data.blocked });
            } else {
                setAssignMsg({ type: 'success', text: data.message });
                setTimeout(() => setAssigningBus(null), 1400);
            }
            fetchAll();
        } catch (err) {
            const errData = err.response?.data;
            if (errData?.blocked) {
                setAssignMsg({ type: 'error', text: errData.message, blocked: errData.blocked });
            } else {
                setAssignMsg({ type: 'error', text: errData?.message || 'حدث خطأ أثناء حفظ التعيينات' });
            }
        } finally { setAssignLoading(false); }
    };

    const filteredStudents = allStudents.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(studentSearch.toLowerCase())
    );

    // ─── Auto-assign handlers ──────────────────────────────────────────
    const handleAutoPreview = async () => {
        setShowAutoAssign(true);
        setAutoLoading(true);
        setAutoPreview(null);
        setAutoError('');
        try {
            const { data } = await api.post('/buses/auto-assign', { confirm: false });
            setAutoPreview(data);
        } catch (err) {
            setAutoError(err.response?.data?.message || 'حدث خطأ أثناء حساب التوزيع');
        } finally {
            setAutoLoading(false);
        }
    };

    const handleAutoConfirm = async () => {
        setAutoConfirming(true);
        setAutoError('');
        try {
            await api.post('/buses/auto-assign', { confirm: true });
            setShowAutoAssign(false);
            setAutoPreview(null);
            fetchAll();
        } catch (err) {
            setAutoError(err.response?.data?.message || 'حدث خطأ أثناء تطبيق التوزيع');
        } finally {
            setAutoConfirming(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <Bus size={24} className="text-primary-500" />
                    إدارة الحافلات
                </h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAll(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${showAll
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                    >
                        {showAll ? <Eye size={16} /> : <EyeOff size={16} />}
                        {showAll ? 'عرض النشطة فقط' : 'عرض الكل'}
                    </button>
                    <button
                        onClick={handleAutoPreview}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25"
                    >
                        توزيع تلقائي
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25"
                    >
                        <Plus size={18} /> إضافة حافلة
                    </button>
                </div>
            </div>

            {/* ── Add/Edit Bus Modal ────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={resetForm} className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                            <X size={18} />
                        </button>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
                            {editingBus ? 'تعديل الحافلة' : 'إضافة حافلة جديدة'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Bus ID */}
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">رقم الحافلة</label>
                                <input
                                    type="text" required
                                    value={form.busId}
                                    onChange={e => setForm({ ...form, busId: e.target.value })}
                                    disabled={!!editingBus}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left disabled:opacity-50"
                                    dir="ltr" placeholder="BUS-001"
                                />
                            </div>

                            {/* Capacity */}
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">السعة</label>
                                <input
                                    type="number" required min="1" max="100"
                                    value={form.capacity}
                                    onChange={e => setForm({ ...form, capacity: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left"
                                    dir="ltr" placeholder="40"
                                />
                            </div>

                            {/* Driver Dropdown */}
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">السائق (اختياري)</label>
                                <select
                                    value={form.driver}
                                    onChange={e => setForm({ ...form, driver: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                >
                                    <option value="" >بدون سائق </option>
                                    {drivers.map(d => (
                                        <option key={d._id} value={d._id}>{d.name} ({d.username})</option>
                                    ))}
                                </select>
                                {drivers.length === 0 && (
                                    <p className="text-xs text-amber-500 px-1">لا يوجد سائقون نشطون في النظام حالياً.</p>
                                )}
                            </div>

                            <button
                                type="submit" disabled={formLoading}
                                className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 ${formLoading ? 'opacity-70' : 'hover:bg-primary-600 shadow-primary-500/30'}`}
                            >
                                {formLoading && <Loader2 size={20} className="animate-spin" />}
                                {formLoading ? 'جاري الحفظ...' : editingBus ? 'تحديث' : 'إضافة'}
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

            {/* ── Assign Students Modal ─────────────────────────── */}
            {assigningBus && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAssigningBus(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Users size={20} className="text-primary-500" />
                                    ربط طلاب بـ {assigningBus.busId}
                                </h3>
                            </div>
                            <button onClick={() => setAssigningBus(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-4 border-b border-gray-50 shrink-0">
                            <input
                                type="text"
                                placeholder="ابحث باسم الطالب أو رقمه..."
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 transition-all"
                            />
                        </div>

                        {/* Student List */}
                        <div className="overflow-y-auto flex-grow p-4 space-y-2">
                            {filteredStudents.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">لا يوجد طلاب مطابقون</div>
                            ) : filteredStudents.map(student => {
                                const isSelected = selectedStudents.has(student.id);
                                const isOnOtherBus = student.assignedBus && student.assignedBus !== assigningBus.busId;
                                const noParent = !student.parentLinked;
                                const noLocation = !student.location || student.location.coordinates?.[0] === 0;
                                const isBlocked = noParent || noLocation;
                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => !isBlocked && toggleStudent(student.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none
                                            ${isBlocked ? 'bg-red-50/50 border-red-100 cursor-not-allowed opacity-70' :
                                                isSelected ? 'bg-primary-50 border-primary-200 cursor-pointer' : 'border-gray-100 hover:bg-gray-50 cursor-pointer'}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className={`font-bold text-sm truncate ${isBlocked ? 'text-gray-500' : isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                                                {student.name}
                                            </p>
                                            <p className="text-xs text-gray-400">{student.studentId}</p>
                                            {isOnOtherBus && !isSelected && (
                                                <p className="text-xs text-amber-500 mt-0.5">مخصص لحافلة: {student.assignedBus}</p>
                                            )}
                                            {noParent && <p className="text-[10px] text-red-500 font-bold mt-0.5">⚠️ لم يرتبط بولي أمر</p>}
                                            {!noParent && noLocation && <p className="text-[10px] text-amber-600 font-bold mt-0.5">⚠️ لم يتم تحديد موقع المنزل</p>}
                                        </div>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 mr-3
                                            ${isBlocked ? 'border-gray-200 bg-gray-100' : isSelected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                                            {isSelected && !isBlocked && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 shrink-0">
                            {assignMsg?.type === 'success' && (
                                <p className="text-green-600 text-sm font-bold text-center mb-3 flex items-center justify-center gap-1.5">
                                    <Check size={16} /> {assignMsg.text}
                                </p>
                            )}
                            {assignMsg?.type === 'partial' && (
                                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <p className="text-amber-700 text-sm font-bold mb-1.5">{assignMsg.text}</p>
                                    <ul className="space-y-0.5">
                                        {assignMsg.blocked.map((b, i) => <li key={i} className="text-xs text-amber-600">• {b}</li>)}
                                    </ul>
                                </div>
                            )}
                            {assignMsg?.type === 'error' && (
                                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-red-600 text-sm font-bold mb-1.5">{assignMsg.text}</p>
                                    {assignMsg.blocked && (
                                        <ul className="space-y-0.5">
                                            {assignMsg.blocked.map((b, i) => <li key={i} className="text-xs text-red-500">• {b}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={() => setAssigningBus(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm transition">
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleAssignSave}
                                    disabled={assignLoading}
                                    className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition flex justify-center items-center gap-2 disabled:opacity-60"
                                >
                                    {assignLoading ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                    حفظ ({selectedStudents.size} طالب)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Auto-Assign Preview Modal ─────────────────────── */}
            {showAutoAssign && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !autoConfirming && setShowAutoAssign(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-emerald-50/60">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <Network size={20} className="text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">التوزيع التلقائي للطلاب</h3>
                                    <p className="text-xs text-gray-500">توزيع ذكي حسب القرب الجغرافي واتجاه المسار نحو المدرسة</p>
                                </div>
                            </div>
                            <button onClick={() => !autoConfirming && setShowAutoAssign(false)} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 min-h-0 overflow-y-auto">

                            {/* Loading */}
                            {autoLoading && (
                                <div className="h-80 flex flex-col items-center justify-center gap-4">
                                    <Loader2 size={40} className="text-emerald-500 animate-spin" />
                                    <div className="text-center">
                                        <p className="font-bold text-gray-700">جاري حساب التوزيع الأمثل...</p>
                                        <p className="text-sm text-gray-400 mt-1">يتم الاستعلام عن مسارات OSRM لكل حافلة</p>
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {!autoLoading && autoError && (
                                <div className="h-80 flex flex-col items-center justify-center gap-3 px-8">
                                    <AlertTriangle size={40} className="text-red-400" />
                                    <p className="text-red-600 font-bold text-center">{autoError}</p>
                                </div>
                            )}

                            {/* Preview */}
                            {!autoLoading && autoPreview && (
                                <div className="flex flex-col lg:flex-row gap-0 min-h-0">

                                    {/* Left: Summary list */}
                                    <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-l border-gray-100 flex flex-col overflow-y-auto" style={{ maxHeight: '520px' }}>

                                        {/* Stats bar */}
                                        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
                                            <div className="flex items-center justify-between text-sm mb-2">
                                                <span className="text-gray-500">إجمالي الطلاب المؤهلين</span>
                                                <span className="font-bold text-gray-800">{autoPreview.totalEligible}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm mb-2">
                                                <span className="text-gray-500">سيتم توزيعهم</span>
                                                <span className="font-bold text-emerald-600">{autoPreview.assignedCount}</span>
                                            </div>
                                            {autoPreview.unassigned.length > 0 && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">لا تتسعهم الحافلات</span>
                                                    <span className="font-bold text-amber-600">{autoPreview.unassigned.length}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bus assignments */}
                                        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 p-3 space-y-2">
                                            {autoPreview.assignments.map((a, i) => (
                                                <div key={a.bus._id} className="p-3 rounded-xl border border-gray-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: BUS_COLORS[i % BUS_COLORS.length] }} />
                                                        <span className="font-bold text-gray-800 text-sm">{a.bus.busId}</span>
                                                        <span className="mr-auto text-xs text-gray-400">{a.students.length} / {a.bus.capacity}</span>
                                                    </div>
                                                    {a.route && (
                                                        <div className="flex gap-3 text-xs text-gray-500 mb-2 px-1">
                                                            <span className="flex items-center gap-1"><Navigation2 size={10} className="text-blue-400" />{a.route.duration} دقيقة</span>
                                                            <span>{a.route.distance} كم</span>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-1">
                                                        {a.students.slice(0, 5).map(s => (
                                                            <span key={s._id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">{s.name}</span>
                                                        ))}
                                                        {a.students.length > 5 && (
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[10px]">+{a.students.length - 5} آخرون</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Unassigned students */}
                                            {autoPreview.unassigned.length > 0 && (
                                                <div className="p-3 rounded-xl border border-amber-100 bg-amber-50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <AlertCircle size={14} className="text-amber-500 shrink-0" />
                                                        <span className="font-bold text-amber-700 text-sm">طلاب لم تتسعهم الحافلات</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {autoPreview.unassigned.map(s => (
                                                            <span key={s._id} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-medium">{s.name}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Map */}
                                    <div className="flex-1 min-w-0" style={{ height: '520px' }}>
                                        <MapContainer
                                            center={
                                                autoPreview.school
                                                    ? [autoPreview.school.lat, autoPreview.school.lng]
                                                    : [24.7136, 46.6753]
                                            }
                                            zoom={12}
                                            style={{ height: '100%', width: '100%' }}
                                            className="z-0"
                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution="&copy; OpenStreetMap"
                                            />

                                            {/* School marker */}
                                            {autoPreview.school && (
                                                <Marker
                                                    position={[autoPreview.school.lat, autoPreview.school.lng]}
                                                    icon={schoolIcon}
                                                >
                                                    <Tooltip direction="top" permanent opacity={0.95} className="font-sans font-bold text-xs">
                                                        🏫 {autoPreview.school.name || 'المدرسة'}
                                                    </Tooltip>
                                                </Marker>
                                            )}

                                            {/* Bus routes and student markers */}
                                            {autoPreview.assignments.map((a, i) => {
                                                const color = BUS_COLORS[i % BUS_COLORS.length];
                                                const dotIcon = new L.DivIcon({
                                                    html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
                                                    className: '',
                                                    iconSize: [10, 10],
                                                    iconAnchor: [5, 5]
                                                });
                                                return (
                                                    <React.Fragment key={a.bus._id}>
                                                        {a.route?.polyline && (
                                                            <Polyline
                                                                positions={a.route.polyline}
                                                                color={color}
                                                                weight={4}
                                                                opacity={0.8}
                                                            />
                                                        )}
                                                        {a.students.map(s => {
                                                            const [lng, lat] = s.location.coordinates;
                                                            return (
                                                                <Marker key={s._id} position={[lat, lng]} icon={dotIcon}>
                                                                    <Tooltip direction="top" opacity={0.95} className="font-sans text-xs">
                                                                        {s.name} — {a.bus.busId}
                                                                    </Tooltip>
                                                                </Marker>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </MapContainer>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {!autoLoading && autoPreview && (
                            <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between gap-4 bg-gray-50/50">
                                <p className="text-xs text-gray-400">
                                    سيتم إلغاء جميع التعيينات الحالية وإعادة توزيع الطلاب وفق هذا المقترح
                                </p>
                                <div className="flex gap-3 shrink-0">
                                    <button
                                        onClick={() => setShowAutoAssign(false)}
                                        disabled={autoConfirming}
                                        className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        onClick={handleAutoConfirm}
                                        disabled={autoConfirming}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow shadow-emerald-500/25 text-sm disabled:opacity-60"
                                    >
                                        {autoConfirming ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        {autoConfirming ? 'جاري التطبيق...' : 'تأكيد التوزيع'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Buses Table ────────────────────────────────────── */}
            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
            ) : buses.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                    <Bus size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-lg">لا توجد حافلات</p>
                </div>
            ) : (
                <>
                    {/* ── Mobile: Card List (visible on < md) ───────── */}
                    <div className="md:hidden flex flex-col gap-3">
                        {buses.map(bus => {
                            const studentCount = allStudents.filter(s => s.assignedBus === bus.busId).length;
                            return (
                                <div
                                    key={bus._id}
                                    className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${!bus.isActive ? 'opacity-60 border-gray-100' : 'border-gray-100'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        {/* Avatar + Bus ID */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                                                <Bus size={18} className="text-primary-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                                    {bus.busId}
                                                    {!bus.isActive && (
                                                        <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded-full">معطّلة</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">سعة: {bus.capacity} مقعد</p>
                                            </div>
                                        </div>
                                        {/* Assign Students Button */}
                                        <button
                                            onClick={() => openAssignModal(bus)}
                                            className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-100 transition shrink-0"
                                        >
                                            <Users size={12} />
                                            {studentCount} طالب
                                        </button>
                                    </div>

                                    {/* Driver info & Actions */}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                        <div className="text-xs">
                                            {bus.driver ? (
                                                <span className="flex items-center gap-1.5 text-gray-700 font-medium bg-gray-50 px-2 py-1 rounded-lg">
                                                    <span className="text-blue-500">👤</span> {bus.driver.name}
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">بدون سائق</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {bus.isActive && (
                                                <button onClick={() => startEdit(bus)} className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 transition-colors" title="تعديل">
                                                    <Pencil size={14} />
                                                </button>
                                            )}
                                            {bus.isActive ? (
                                                <button onClick={() => handleToggleStatus(bus)} className="p-1.5 rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors" title="تعطيل الحافلة">
                                                    <Ban size={14} />
                                                </button>
                                            ) : (
                                                <button onClick={() => handleToggleStatus(bus)} className="p-1.5 rounded-lg bg-green-50 text-green-600 border border-green-100 hover:bg-green-100 transition-colors" title="إعادة تفعيل الحافلة">
                                                    <CircleCheck size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Desktop: Table (visible on >= md) ─────────── */}
                    <div className="hidden md:block bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr className="text-gray-500 font-bold text-right">
                                    <th className="px-6 py-4">رقم الحافلة</th>
                                    <th className="px-6 py-4 text-center">السعة</th>
                                    <th className="px-6 py-4">السائق</th>
                                    <th className="px-6 py-4 text-center">الطلاب المربوطين</th>
                                    <th className="px-6 py-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {buses.map(bus => {
                                    const studentCount = allStudents.filter(s => s.assignedBus === bus.busId).length;
                                    return (
                                        <tr key={bus._id} className={`hover:bg-gray-50/50 transition-colors group ${!bus.isActive ? 'opacity-60' : ''}`}>
                                            <td className="px-6 py-4 font-bold text-gray-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                                                        <Bus size={16} className="text-primary-500" />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {bus.busId}
                                                        {!bus.isActive && (
                                                            <span className="text-[10px] font-bold bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full">معطّلة</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-bold">{bus.capacity}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {bus.driver ? (
                                                    <span className="flex items-center gap-1.5 text-gray-700 font-medium text-sm">
                                                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">👤</span>
                                                        {bus.driver.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 inline-block">غير معين</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => openAssignModal(bus)}
                                                    className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-100 transition"
                                                >
                                                    <Users size={14} />
                                                    {studentCount} طالب
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {bus.isActive && (
                                                        <button onClick={() => startEdit(bus)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors" title="تعديل">
                                                            <Pencil size={16} />
                                                        </button>
                                                    )}
                                                    {bus.isActive ? (
                                                        <button onClick={() => handleToggleStatus(bus)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="تعطيل الحافلة">
                                                            <Ban size={16} />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleToggleStatus(bus)} className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-500 transition-colors" title="إعادة تفعيل الحافلة">
                                                            <CircleCheck size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default BusManagement;
