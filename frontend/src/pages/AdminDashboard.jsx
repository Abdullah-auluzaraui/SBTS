import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/apiService';
import { LayoutDashboard, Bus, MapPin, GraduationCap, ClipboardList, UserCog, Loader2, School, CheckCircle2, AlertTriangle, Users, ChevronRight } from 'lucide-react';
import SchoolLocationPicker from '../components/maps/SchoolLocationPicker';
import SchoolContactsManager from '../components/SchoolContactsManager';

const AdminDashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [stats, setStats] = useState({ buses: 0, routes: 0, students: 0, attendance: 0, drivers: 0 });
    const [loading, setLoading] = useState(true);
    const [schoolInfo, setSchoolInfo] = useState(null);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [showContactsManager, setShowContactsManager] = useState(false);

    const fetchSchoolInfo = async () => {
        try {
            const { data } = await api.get('/admin/school');
            setSchoolInfo(data.school);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchSchoolInfo(); }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [busRes, routeRes, studentRes, attendanceRes, driverRes] = await Promise.all([
                    api.get('/buses'),
                    api.get('/routes'),
                    api.get('/students'),
                    api.get('/attendance?limit=1'),
                    api.get('/users/drivers')
                ]);
                setStats({
                    buses: busRes.data.buses?.length || 0,
                    routes: routeRes.data.routes?.length || 0,
                    students: studentRes.data.students?.length || 0,
                    attendance: attendanceRes.data.pagination?.total || 0,
                    drivers: driverRes.data.drivers?.length || 0
                });
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchStats();
    }, []);

    const schoolHasLocation = schoolInfo?.location?.coordinates?.[0] !== 0;
    const contactsCount = schoolInfo?.emergencyContacts?.length || 0;

    const cards = [
        { title: t('admin.statBuses'), count: stats.buses, icon: Bus, color: 'blue', link: '/admin/buses' },
        { title: t('admin.statRoutes'), count: stats.routes, icon: MapPin, color: 'emerald', link: '/admin/routes' },
        { title: t('admin.statStudents'), count: stats.students, icon: GraduationCap, color: 'purple', link: '/admin/students' },
        { title: t('admin.statDrivers'), count: stats.drivers, icon: UserCog, color: 'teal', link: '/admin/drivers' },
        { title: t('admin.statAttendance'), count: stats.attendance, icon: ClipboardList, color: 'amber', link: '/admin/attendance' },
    ];

    const colorMap = {
        blue: { bg: 'from-blue-50 to-white', border: 'border-blue-100', icon: 'bg-blue-100 text-blue-600', number: 'text-blue-600' },
        emerald: { bg: 'from-emerald-50 to-white', border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', number: 'text-emerald-600' },
        purple: { bg: 'from-purple-50 to-white', border: 'border-purple-100', icon: 'bg-purple-100 text-purple-600', number: 'text-purple-600' },
        amber: { bg: 'from-amber-50 to-white', border: 'border-amber-100', icon: 'bg-amber-100 text-amber-600', number: 'text-amber-600' },
        teal: { bg: 'from-teal-50 to-white', border: 'border-teal-100', icon: 'bg-teal-100 text-teal-600', number: 'text-teal-600' },
    };

    return (
        <>
            <div>
                {/* Welcome */}
                <div className="mb-8 flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center shadow-sm">
                        <School size={32} strokeWidth={1.75} className="text-primary-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">
                            <span className="bg-gradient-to-l from-primary-600 to-primary-400 bg-clip-text text-transparent">{user?.name}</span>
                        </h2>
                    </div>
                </div>

                {/* School Location Banner */}
                <div className={`mb-6 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border ${schoolHasLocation ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${schoolHasLocation ? 'bg-green-100' : 'bg-amber-100'}`}>
                            {schoolHasLocation ? <CheckCircle2 size={18} className="text-green-600" /> : <AlertTriangle size={18} className="text-amber-600" />}
                        </div>
                        <div className="min-w-0 text-start">
                            <p className={`font-bold text-sm ${schoolHasLocation ? 'text-green-700' : 'text-amber-700'}`}>
                                {schoolHasLocation ? t('admin.schoolLocationSet') : t('admin.schoolLocationNotSet')}
                            </p>
                            <p className={`text-xs ${schoolHasLocation ? 'text-green-600' : 'text-amber-600'}`}>
                                {schoolHasLocation ? t('admin.schoolLocationHint') : t('admin.schoolLocationSetHint')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowLocationPicker(true)}
                        className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border transition-all ${schoolHasLocation ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-amber-500 text-white border-transparent hover:bg-amber-600 shadow-md shadow-amber-500/25'}`}
                    >
                        <MapPin size={14} />
                        {schoolHasLocation ? t('admin.updateLocation') : t('admin.setLocation')}
                    </button>
                </div>

                {/* School Contacts Banner */}
                <div className="mb-6 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border bg-blue-50/60 border-blue-100">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Users size={18} className="text-blue-600" />
                        </div>
                        <div className="min-w-0 text-start">
                            <p className="font-bold text-sm text-blue-700">{t('admin.manageContacts')}</p>
                            <p className="text-xs text-blue-600/80">
                                {contactsCount > 0
                                    ? t('admin.contactCount', { count: contactsCount })
                                    : t('admin.noEmergency')}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowContactsManager(true)}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border bg-blue-600 text-white border-transparent hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
                    >
                        <ChevronRight size={14} className="rtl:rotate-180" />
                        {t('common.edit')}
                    </button>
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
                                    <div className="absolute top-0 end-0 w-24 h-24 bg-current opacity-[0.03] rounded-full -me-10 -mt-10 transition-transform group-hover:scale-150"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-gray-600 font-bold z-10 relative text-start">{card.title}</div>
                                        <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center z-10 shrink-0`}>
                                            <card.icon size={20} strokeWidth={2} />
                                        </div>
                                    </div>
                                    <div className={`text-4xl font-black ${c.number} z-10 relative text-start`}>{card.count}</div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* School Location Picker Modal */}
            {showLocationPicker && (
                <SchoolLocationPicker
                    schoolName={schoolInfo?.name || user?.name}
                    existingLocation={schoolInfo?.location}
                    onClose={() => setShowLocationPicker(false)}
                    onSaved={() => { setShowLocationPicker(false); fetchSchoolInfo(); }}
                />
            )}

            {/* School Contacts Manager Modal */}
            {showContactsManager && (
                <SchoolContactsManager
                    onClose={() => setShowContactsManager(false)}
                    onSaved={(contacts) => setSchoolInfo(prev => ({ ...(prev || {}), emergencyContacts: contacts }))}
                />
            )}
        </>
    );
};

export default AdminDashboard;
