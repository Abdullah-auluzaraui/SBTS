import React, { useState, useEffect } from 'react';
import api from '../../services/apiService';
import { MapPin, Plus, X, Loader2, AlertCircle, Pencil, Trash2 } from 'lucide-react';

const RouteManagement = () => {
    const [routes, setRoutes] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRoute, setEditingRoute] = useState(null);
    const [form, setForm] = useState({ name: '', estimatedDuration: '', driver: '', waypoints: [{ lat: '', lng: '', label: '' }, { lat: '', lng: '', label: '' }] });
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchRoutes = async () => {
        try {
            const { data } = await api.get('/routes');
            setRoutes(data.routes);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRoutes(); }, []);

    const resetForm = () => {
        setForm({ name: '', estimatedDuration: '', driver: '', waypoints: [{ lat: '', lng: '', label: '' }, { lat: '', lng: '', label: '' }] });
        setEditingRoute(null); setShowForm(false); setError('');
    };

    const addWaypoint = () => setForm({ ...form, waypoints: [...form.waypoints, { lat: '', lng: '', label: '' }] });
    const removeWaypoint = (i) => {
        if (form.waypoints.length <= 2) return;
        setForm({ ...form, waypoints: form.waypoints.filter((_, idx) => idx !== i) });
    };
    const updateWaypoint = (i, field, value) => {
        const wps = [...form.waypoints];
        wps[i] = { ...wps[i], [field]: value };
        setForm({ ...form, waypoints: wps });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const waypoints = form.waypoints.map(w => ({ lat: parseFloat(w.lat), lng: parseFloat(w.lng), label: w.label }));
        if (waypoints.some(w => isNaN(w.lat) || isNaN(w.lng))) {
            setError('يرجى إدخال إحداثيات صحيحة لجميع النقاط');
            return;
        }

        setFormLoading(true);
        try {
            const payload = {
                name: form.name,
                waypoints,
                estimatedDuration: form.estimatedDuration ? parseInt(form.estimatedDuration) : null,
                driver: form.driver || null
            };
            if (editingRoute) {
                await api.put(`/routes/${editingRoute}`, payload);
            } else {
                await api.post('/routes', payload);
            }
            resetForm();
            fetchRoutes();
        } catch (err) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally { setFormLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل تريد تعطيل هذا المسار؟')) return;
        try { await api.delete(`/routes/${id}`); fetchRoutes(); } catch (err) { console.error(err); }
    };

    const startEdit = (route) => {
        setEditingRoute(route._id);
        setForm({
            name: route.name,
            estimatedDuration: route.estimatedDuration?.toString() || '',
            driver: route.driver?._id || '',
            waypoints: route.waypoints.map(w => ({ lat: w.lat.toString(), lng: w.lng.toString(), label: w.label || '' }))
        });
        setShowForm(true); setError('');
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <MapPin size={24} className="text-primary-500" />
                    إدارة المسارات
                </h2>
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25">
                    <Plus size={18} /> إضافة مسار
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <button onClick={resetForm} className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={18} /></button>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">{editingRoute ? 'تعديل المسار' : 'إضافة مسار جديد'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">اسم المسار *</label>
                                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="مسار المنطقة الشمالية" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">المدة التقديرية (دقائق)</label>
                                <input type="number" min="1" value={form.estimatedDuration} onChange={e => setForm({ ...form, estimatedDuration: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left" dir="ltr" placeholder="35" />
                            </div>

                            {/* Waypoints */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="block text-gray-700 font-bold text-sm px-1">نقاط المسار (حد أدنى 2) *</label>
                                    <button type="button" onClick={addWaypoint} className="text-xs text-primary-600 font-bold hover:text-primary-700 flex items-center gap-1"><Plus size={14} /> إضافة نقطة</button>
                                </div>
                                {form.waypoints.map((wp, i) => (
                                    <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <span className="text-xs text-gray-400 font-bold mt-3 w-6 shrink-0">{i + 1}</span>
                                        <div className="flex-1 grid grid-cols-3 gap-2">
                                            <input type="text" placeholder="Lat" value={wp.lat} onChange={e => updateWaypoint(i, 'lat', e.target.value)} required
                                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-left focus:outline-none focus:ring-1 focus:ring-primary-500/30" dir="ltr" />
                                            <input type="text" placeholder="Lng" value={wp.lng} onChange={e => updateWaypoint(i, 'lng', e.target.value)} required
                                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-left focus:outline-none focus:ring-1 focus:ring-primary-500/30" dir="ltr" />
                                            <input type="text" placeholder="اسم" value={wp.label} onChange={e => updateWaypoint(i, 'label', e.target.value)}
                                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500/30" />
                                        </div>
                                        {form.waypoints.length > 2 && (
                                            <button type="button" onClick={() => removeWaypoint(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 mt-1.5"><X size={14} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button type="submit" disabled={formLoading}
                                className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 ${formLoading ? 'opacity-70' : 'hover:bg-primary-600 shadow-primary-500/30'}`}>
                                {formLoading && <Loader2 size={20} className="animate-spin" />}
                                {formLoading ? 'جاري الحفظ...' : editingRoute ? 'تحديث' : 'إضافة'}
                            </button>
                            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl"><p className="text-sm text-red-700 flex items-start gap-2"><AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" /><span className="font-semibold">{error}</span></p></div>}
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
            ) : routes.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                    <MapPin size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-lg">لا توجد مسارات</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr className="text-gray-500 font-bold">
                                <th className="px-6 py-3 text-right">المسار</th>
                                <th className="px-6 py-3 text-center">النقاط</th>
                                <th className="px-6 py-3 text-center">المدة</th>
                                <th className="px-6 py-3 text-right">السائق</th>
                                <th className="px-6 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {routes.map(route => (
                                <tr key={route._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-800">{route.name}</td>
                                    <td className="px-6 py-4 text-center"><span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-100">{route.waypoints?.length || 0}</span></td>
                                    <td className="px-6 py-4 text-center text-gray-600">{route.estimatedDuration ? `${route.estimatedDuration} د` : '—'}</td>
                                    <td className="px-6 py-4 text-gray-600">{route.driver?.name || '—'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => startEdit(route)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"><Pencil size={16} /></button>
                                            <button onClick={() => handleDelete(route._id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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

export default RouteManagement;
