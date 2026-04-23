import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/apiService';
import { LayoutDashboard, Bus, MapPin, GraduationCap, ClipboardList, UserCog, Loader2, School, CheckCircle2, AlertTriangle, Plus, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import SchoolLocationPicker from '../components/maps/SchoolLocationPicker';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({ buses: 0, routes: 0, students: 0, attendance: 0, drivers: 0 });
    const [loading, setLoading] = useState(true);
    const [schoolInfo, setSchoolInfo] = useState(null);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [emergencyContacts, setEmergencyContacts] = useState([]);
    const [savingContacts, setSavingContacts] = useState(false);
    const [showEmergency, setShowEmergency] = useState(false);

    const fetchSchoolInfo = async () => {
        try {
            const { data } = await api.get('/admin/school');
            setSchoolInfo(data.school);
            if (data.school && data.school.emergencyContacts) {
                setEmergencyContacts(data.school.emergencyContacts);
            }
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

    const handleAddContact = () => {
        setEmergencyContacts([...emergencyContacts, { name: '', phone: '' }]);
    };

    const handleRemoveContact = (index) => {
        const newContacts = [...emergencyContacts];
        newContacts.splice(index, 1);
        setEmergencyContacts(newContacts);
    };

    const handleContactChange = (index, field, value) => {
        const newContacts = [...emergencyContacts];
        newContacts[index][field] = value;
        setEmergencyContacts(newContacts);
    };

    const handleSaveContacts = async () => {
        setSavingContacts(true);
        try {
            const validContacts = emergencyContacts.filter(c => c.name.trim() && c.phone.trim());
            const { data } = await api.put('/admin/school/emergency-contacts', { contacts: validContacts });
            setEmergencyContacts(data.emergencyContacts);
            alert('تم حفظ أرقام الطوارئ بنجاح!');
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء حفظ أرقام الطوارئ. يرجى المحاولة مرة أخرى.');
        } finally {
            setSavingContacts(false);
        }
    };

    const cards = [
        { title: 'الحافلات', count: stats.buses, icon: Bus, color: 'blue', link: '/admin/buses' },
        { title: 'المسارات', count: stats.routes, icon: MapPin, color: 'emerald', link: '/admin/routes' },
        { title: 'الطلاب', count: stats.students, icon: GraduationCap, color: 'purple', link: '/admin/students' },
        { title: 'السائقون', count: stats.drivers, icon: UserCog, color: 'teal', link: '/admin/drivers' },
        { title: 'سجلات الحضور', count: stats.attendance, icon: ClipboardList, color: 'amber', link: '/admin/attendance' },
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

                {/* Emergency Contacts Toggle Button */}
                {!loading && (
                    <div className="mb-6">
                        <button
                            onClick={() => setShowEmergency(!showEmergency)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100 shadow-sm text-sm"
                        >
                            <AlertTriangle size={18} />
                            إدارة أرقام الطوارئ ({emergencyContacts.length})
                            {showEmergency ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                    </div>
                )}

                {/* Emergency Contacts Expanded Section */}
                {!loading && showEmergency && (
                    <div className="mb-6 bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">أرقام الطوارئ</h3>
                                    <p className="text-sm text-gray-500">أرقام التواصل في حالات الطوارئ (ستظهر لسائقي الحافلات)</p>
                                </div>
                            </div>
                            <button
                                onClick={handleAddContact}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm border border-gray-200"
                            >
                                <Plus size={16} /> إضافة رقم
                            </button>
                        </div>

                        <div className="space-y-4">
                            {emergencyContacts.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                    <p className="text-gray-500 text-sm font-medium">لم يتم إضافة أي أرقام طوارئ بعد</p>
                                </div>
                            ) : (
                                emergencyContacts.map((contact, idx) => (
                                    <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <input
                                            type="text"
                                            placeholder="اسم المسؤول"
                                            value={contact.name}
                                            onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                                            className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-colors"
                                        />
                                        <input
                                            type="text"
                                            placeholder="رقم الجوال"
                                            value={contact.phone}
                                            onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                                            dir="ltr"
                                            className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-colors text-left font-medium text-gray-700"
                                        />
                                        <button
                                            onClick={() => handleRemoveContact(idx)}
                                            className="w-10 h-10 flex shrink-0 items-center justify-center bg-white border border-gray-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                            title="حذف الرقم"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleSaveContacts}
                                disabled={savingContacts}
                                className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/25 disabled:opacity-60 text-sm"
                            >
                                {savingContacts ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {savingContacts ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                            </button>
                        </div>
                    </div>
                )}

                {/* School Location Banner */}
                <div className={`mb-6 flex items-center justify-between px-5 py-4 rounded-2xl border ${schoolHasLocation ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${schoolHasLocation ? 'bg-green-100' : 'bg-amber-100'}`}>
                            {schoolHasLocation ? <CheckCircle2 size={18} className="text-green-600" /> : <AlertTriangle size={18} className="text-amber-600" />}
                        </div>
                        <div>
                            <p className={`font-bold text-sm ${schoolHasLocation ? 'text-green-700' : 'text-amber-700'}`}>
                                {schoolHasLocation ? 'موقع المدرسة محدد على الخريطة ✅' : 'لم يتم تحديد موقع المدرسة بعد'}
                            </p>
                            <p className={`text-xs ${schoolHasLocation ? 'text-green-600' : 'text-amber-600'}`}>
                                {schoolHasLocation ? 'سيُستخدم في حساب مسارات الحافلات تلقائياً' : 'يُرجى تحديده لتفعيل المسارات الذكية'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowLocationPicker(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border transition-all ${schoolHasLocation ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-amber-500 text-white border-transparent hover:bg-amber-600 shadow-md shadow-amber-500/25'}`}
                    >
                        <MapPin size={14} />
                        {schoolHasLocation ? 'تحديث الموقع' : 'تحديد الموقع'}
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

            {/* School Location Picker Modal */}
            {showLocationPicker && (
                <SchoolLocationPicker
                    schoolName={schoolInfo?.name || user?.name}
                    existingLocation={schoolInfo?.location}
                    onClose={() => setShowLocationPicker(false)}
                    onSaved={() => { setShowLocationPicker(false); fetchSchoolInfo(); }}
                />
            )}
        </>
    );
};

export default AdminDashboard;
