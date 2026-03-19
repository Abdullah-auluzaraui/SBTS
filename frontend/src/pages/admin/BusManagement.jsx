import React, { useState, useEffect } from 'react';
import api from '../../services/apiService';
import { Bus, Plus, X, Loader2, AlertCircle, Pencil, Trash2 } from 'lucide-react';

const BusManagement = () => {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBus, setEditingBus] = useState(null);
    const [form, setForm] = useState({ busId: '', capacity: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchBuses = async () => {
        try {
            const { data } = await api.get('/buses');
            setBuses(data.buses);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchBuses(); }, []);

    const resetForm = () => { setForm({ busId: '', capacity: '' }); setEditingBus(null); setShowForm(false); setError(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFormLoading(true);
        try {
            if (editingBus) {
                await api.put(`/buses/${editingBus}`, { capacity: parseInt(form.capacity) });
            } else {
                await api.post('/buses', { busId: form.busId, capacity: parseInt(form.capacity) });
            }
            resetForm();
            fetchBuses();
        } catch (err) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally { setFormLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل تريد تعطيل هذه الحافلة؟')) return;
        try {
            await api.delete(`/buses/${id}`);
            fetchBuses();
        } catch (err) { console.error(err); }
    };

    const startEdit = (bus) => {
        setEditingBus(bus._id);
        setForm({ busId: bus.busId, capacity: bus.capacity.toString() });
        setShowForm(true);
        setError('');
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <Bus size={24} className="text-primary-500" />
                    إدارة الحافلات
                </h2>
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25">
                    <Plus size={18} /> إضافة حافلة
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={resetForm} className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={18} /></button>
                        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">{editingBus ? 'تعديل الحافلة' : 'إضافة حافلة جديدة'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">رقم الحافلة</label>
                                <input type="text" required value={form.busId} onChange={e => setForm({ ...form, busId: e.target.value })} disabled={!!editingBus}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left disabled:opacity-50" dir="ltr" placeholder="BUS-001" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">السعة</label>
                                <input type="number" required min="1" max="100" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left" dir="ltr" placeholder="40" />
                            </div>
                            <button type="submit" disabled={formLoading}
                                className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 ${formLoading ? 'opacity-70' : 'hover:bg-primary-600 shadow-primary-500/30'}`}>
                                {formLoading && <Loader2 size={20} className="animate-spin" />}
                                {formLoading ? 'جاري الحفظ...' : editingBus ? 'تحديث' : 'إضافة'}
                            </button>
                            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl"><p className="text-sm text-red-700 flex items-start gap-2"><AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" /><span className="font-semibold">{error}</span></p></div>}
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
            ) : buses.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                    <Bus size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-lg">لا توجد حافلات</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr className="text-gray-500 font-bold">
                                <th className="px-6 py-3 text-right">رقم الحافلة</th>
                                <th className="px-6 py-3 text-center">السعة</th>
                                <th className="px-6 py-3 text-right">المسار</th>
                                <th className="px-6 py-3 text-right">السائق</th>
                                <th className="px-6 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {buses.map(bus => (
                                <tr key={bus._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-800">{bus.busId}</td>
                                    <td className="px-6 py-4 text-center">{bus.capacity}</td>
                                    <td className="px-6 py-4 text-gray-600">{bus.route?.name || '—'}</td>
                                    <td className="px-6 py-4 text-gray-600">{bus.driver?.name || '—'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => startEdit(bus)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"><Pencil size={16} /></button>
                                            <button onClick={() => handleDelete(bus._id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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

export default BusManagement;
