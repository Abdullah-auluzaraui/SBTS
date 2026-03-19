import React, { useState, useEffect } from 'react';
import api from '../../services/apiService';
import { ClipboardList, Filter, Loader2, Calendar, Bus, Users } from 'lucide-react';

const AttendanceRecords = () => {
    const [records, setRecords] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', busId: '', studentId: '' });
    const [buses, setBuses] = useState([]);

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 25 });
            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);
            if (filters.busId) params.append('busId', filters.busId);
            if (filters.studentId) params.append('studentId', filters.studentId);

            const { data } = await api.get(`/attendance?${params}`);
            setRecords(data.attendance);
            setPagination(data.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchBuses = async () => {
        try { const { data } = await api.get('/buses'); setBuses(data.buses); } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); fetchBuses(); }, []);

    const handleFilter = (e) => {
        e.preventDefault();
        fetchData(1);
    };

    const eventLabel = { boarding: 'صعود', exit: 'نزول' };
    const eventClass = { boarding: 'bg-green-50 text-green-700 border-green-200', exit: 'bg-orange-50 text-orange-700 border-orange-200' };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6">
                <ClipboardList size={24} className="text-primary-500" />
                سجل الحضور
            </h2>

            {/* Filters */}
            <form onSubmit={handleFilter} className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[150px] space-y-1">
                    <label className="block text-gray-600 text-xs font-bold">من تاريخ</label>
                    <input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                    <label className="block text-gray-600 text-xs font-bold">إلى تاريخ</label>
                    <input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                    <label className="block text-gray-600 text-xs font-bold">الحافلة</label>
                    <select value={filters.busId} onChange={e => setFilters({ ...filters, busId: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                        <option value="">الكل</option>
                        {buses.map(b => <option key={b._id} value={b._id}>{b.busId}</option>)}
                    </select>
                </div>
                <button type="submit" className="px-5 py-2.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all flex items-center gap-2 shadow-sm">
                    <Filter size={16} /> بحث
                </button>
            </form>

            {/* Table */}
            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
            ) : records.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                    <ClipboardList size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-lg">لا توجد سجلات حضور</p>
                    <p className="text-sm mt-1">ستظهر السجلات عند تسجيل الحضور عبر NFC</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-bold">إجمالي: {pagination.total} سجل</span>
                        <span className="text-xs text-gray-400">صفحة {pagination.page} من {pagination.pages}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/50">
                                <tr className="text-gray-500 font-bold">
                                    <th className="px-6 py-3 text-right">الطالب</th>
                                    <th className="px-6 py-3 text-right">رقم الطالب</th>
                                    <th className="px-6 py-3 text-center">الحافلة</th>
                                    <th className="px-6 py-3 text-center">الحدث</th>
                                    <th className="px-6 py-3 text-center">الطريقة</th>
                                    <th className="px-6 py-3 text-center">التاريخ والوقت</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {records.map(r => (
                                    <tr key={r._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">{r.student?.name || '—'}</td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-500">{r.student?.studentId || '—'}</td>
                                        <td className="px-6 py-4 text-center"><span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-100">{r.bus?.busId || '—'}</span></td>
                                        <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${eventClass[r.event] || ''}`}>{eventLabel[r.event] || r.event}</span></td>
                                        <td className="px-6 py-4 text-center text-xs text-gray-500">{r.recordedBy}</td>
                                        <td className="px-6 py-4 text-center text-xs text-gray-600" dir="ltr">{new Date(r.timestamp).toLocaleString('ar-SA')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-center gap-2">
                            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => fetchData(p)}
                                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${p === pagination.page ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AttendanceRecords;
