import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/apiService';
import { LayoutDashboard, Bus, MapPin, GraduationCap, ClipboardList, Loader2 } from 'lucide-react';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ buses: 0, routes: 0, students: 0, attendance: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [busRes, routeRes, studentRes, attendanceRes] = await Promise.all([
                    api.get('/buses'),
                    api.get('/routes'),
                    api.get('/students'),
                    api.get('/attendance?limit=1')
                ]);
                setStats({
                    buses: busRes.data.buses?.length || 0,
                    routes: routeRes.data.routes?.length || 0,
                    students: studentRes.data.students?.length || 0,
                    attendance: attendanceRes.data.pagination?.total || 0
                });
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchStats();
    }, []);

    const cards = [
        { title: 'الحافلات', count: stats.buses, icon: Bus, color: 'blue', link: '/admin/buses' },
        { title: 'المسارات', count: stats.routes, icon: MapPin, color: 'emerald', link: '/admin/routes' },
        { title: 'الطلاب', count: stats.students, icon: GraduationCap, color: 'purple', link: '/admin/students' },
        { title: 'سجلات الحضور', count: stats.attendance, icon: ClipboardList, color: 'amber', link: '/admin/attendance' },
    ];

    const colorMap = {
        blue: { bg: 'from-blue-50 to-white', border: 'border-blue-100', icon: 'bg-blue-100 text-blue-600', number: 'text-blue-600' },
        emerald: { bg: 'from-emerald-50 to-white', border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', number: 'text-emerald-600' },
        purple: { bg: 'from-purple-50 to-white', border: 'border-purple-100', icon: 'bg-purple-100 text-purple-600', number: 'text-purple-600' },
        amber: { bg: 'from-amber-50 to-white', border: 'border-amber-100', icon: 'bg-amber-100 text-amber-600', number: 'text-amber-600' },
    };

    return (
        <div>
            {/* Welcome */}
            <div className="mb-8 flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center shadow-sm">
                    <LayoutDashboard size={32} strokeWidth={1.75} className="text-primary-500" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">
                        أهلاً بك، <span className="bg-gradient-to-l from-primary-600 to-primary-400 bg-clip-text text-transparent">{user?.name}</span>
                    </h2>
                    <p className="text-gray-500 mt-1">مدير المدرسة</p>
                </div>
            </div>

            {/* Stats Cards */}
            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {cards.map(card => {
                        const c = colorMap[card.color];
                        return (
                            <Link key={card.title} to={card.link}
                                className={`bg-gradient-to-br ${c.bg} border ${c.border} p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all hover:-translate-y-0.5`}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.03] rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-gray-600 font-bold z-10 relative">{card.title}</div>
                                    <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center z-10`}>
                                        <card.icon size={20} strokeWidth={2} />
                                    </div>
                                </div>
                                <div className={`text-4xl font-black ${c.number} z-10 relative`}>{card.count}</div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
