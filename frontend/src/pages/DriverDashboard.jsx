import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import { Bus, Play, Map, Users, AlertTriangle, Loader2, Navigation2, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/apiService';
import axios from 'axios';
import SharedBusMap from '../components/maps/SharedBusMap';




const DriverDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [tripStarted, setTripStarted] = useState(false);
    const [routePath, setRoutePath] = useState([]);
    const [osrmMeta, setOsrmMeta] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    
    // Track boarded status locally for the session
    const [boardedStudents, setBoardedStudents] = useState(new Set());
    const [markingAttendance, setMarkingAttendance] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const { data } = await api.get('/driver/me');
                setDashboardData(data.data);
            } catch (err) {
                console.error(err);
                setError('تعذر تحميل بيانات لوحة التحكم');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleStartTrip = async () => {
        if (!dashboardData?.bus || !dashboardData?.students?.length || !dashboardData?.school?.location) {
            return setError('بيانات الحافلة أو الطلاب أو المدرسة غير مكتملة لبدء الرحلة.');
        }

        setTripStarted(true);
        setRouteLoading(true);

        try {
            const { students, school } = dashboardData;
            
            // Only consider students with valid coordinates
            const validStudents = students.filter(s => s.location?.coordinates?.[0] !== 0 && s.location?.coordinates?.[1] !== 0);
            
            if (validStudents.length === 0) {
                setError('لا يوجد طلاب بمواقع جغرافية محددة. يرجى توجيه أولياء الأمور لتحديد مواقعهم.');
                setRouteLoading(false);
                return;
            }

            // Waypoints: student homes
            const studentCoords = validStudents
                .map(s => `${s.location.coordinates[0]},${s.location.coordinates[1]}`)
                .join(';');
                
            // Destination: school
            const schoolCoord = `${school.location.coordinates[0]},${school.location.coordinates[1]}`;
            
            const coordsString = `${studentCoords};${schoolCoord}`;
            const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=false&source=any&destination=last&geometries=geojson`;
            
            const { data: osrmData } = await axios.get(osrmUrl);

            if (osrmData.code === 'Ok' && osrmData.trips.length > 0) {
                const trip = osrmData.trips[0];
                // GeoJSON [lng, lat] -> Leaflet/SharedBusMap {lat, lng}
                const pathForMap    = trip.geometry.coordinates.map(c => [c[1], c[0]]);
                const pathForBackend = trip.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));

                setRoutePath(pathForMap);
                setOsrmMeta({
                    duration: Math.ceil(trip.duration / 60),
                    distance: (trip.distance / 1000).toFixed(1)
                });

                // حفظ المسار في الباكند ليتمكن ولي الأمر من جلبه مشتركاً
                try {
                    await api.post('/driver/trip/start', { routePath: pathForBackend });
                } catch (saveErr) {
                    console.warn('تعذر حفظ المسار في الباكند — ستكمل الرحلة محلياً:', saveErr);
                }
            } else {
                setError('تعذّر حساب المسار من خدمة الخرائط.');
            }
        } catch (err) {
            console.error('OSRM Route Error:', err);
            setError('حدث خطأ أثناء رسم المسار الذكي.');
        } finally {
            setRouteLoading(false);
        }
    };

    const handleManualBoarding = async (studentId) => {
        if (!dashboardData?.bus?._id) return;
        
        setMarkingAttendance(studentId);
        try {
            await api.post('/driver/attendance/manual', {
                studentId,
                busId: dashboardData.bus._id,
                event: 'boarding'
            });
            // Mark as boarded locally
            setBoardedStudents(prev => {
                const newSet = new Set(prev);
                newSet.add(studentId);
                return newSet;
            });
        } catch (err) {
            console.error('Manual boarding error:', err);
            setError('تعذر تسجيل حضور الطالب يدوياً.');
        } finally {
            setMarkingAttendance(null);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex h-64 items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-primary-500" />
                </div>
            </MainLayout>
        );
    }

    const { bus, students } = dashboardData || {};

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-10 overflow-hidden relative">

                {/* Background accent */}
                <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-primary-50/50 to-transparent"></div>

                {/* Header */}
                <div className="mb-8 border-b border-gray-100 pb-6 relative z-10 flex items-center gap-4">
                    <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
                        <Bus size={32} strokeWidth={1.75} className="text-primary-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl text-gray-800 font-bold">لوحة تحكم السائق — {user?.name}</h2>
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-bold border border-gray-200">
                            <span className={`w-2 h-2 rounded-full ${bus ? 'bg-green-500' : 'bg-amber-400'}`}></span>
                            {bus ? `رقم الحافلة: ${bus.busId}` : 'لا توجد حافلة مخصصة'}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl font-bold flex items-center gap-2">
                        <AlertTriangle size={20} />
                        {error}
                    </div>
                )}

                {!tripStarted ? (
                    <>
                        {/* Start Trip Section */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 mb-8 border-b border-gray-100 relative z-10 w-full">
                            <button 
                                onClick={handleStartTrip}
                                disabled={!bus || !students?.length}
                                className="w-full px-8 py-4 bg-primary-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary-500/30 hover:bg-primary-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                                <Play size={22} strokeWidth={2} className="text-white" />
                                بدء الرحلة
                            </button>
                        </div>

                {/* Students on Board */}
                <div className="mb-10 relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl text-gray-800">
                            الطلاب على متن الحافلة
                        </h3>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg font-bold">
                            {boardedStudents.size} / {students?.length || 0} طالب
                        </span>
                    </div>
                    
                    {students?.length > 0 ? (
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
                            {students.map((student, idx) => {
                                const isBoarded = boardedStudents.has(student._id);
                                return (
                                    <div key={student._id || idx} className={`border border-gray-100 rounded-xl p-3 flex justify-between items-center shadow-sm transition-colors ${isBoarded ? 'bg-green-50' : 'bg-white'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isBoarded ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {isBoarded ? <CheckCircle size={20} /> : idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{student.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {student.grade && `الصف: ${student.grade} - `} {student.studentId}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isBoarded ? (
                                                <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1">
                                                    تم صعوده
                                                </span>
                                            ) : (
                                                <button 
                                                    onClick={() => handleManualBoarding(student._id)}
                                                    disabled={markingAttendance === student._id}
                                                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                                                >
                                                    {markingAttendance === student._id ? <Loader2 size={12} className="animate-spin" /> : 'تسجيل صعود'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-100 dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                            <Users size={40} strokeWidth={1.5} className="mb-3 text-gray-300" />
                            <p className="text-gray-500 font-medium text-lg">لم يتم تخصيص طلاب لهذه الحافلة حتى الآن.</p>
                        </div>
                    )}
                </div>

                {/* Emergency Alert */}
                <div className="relative z-10 mt-6">
                    <button className="flex items-center justify-center gap-3 px-6 py-4 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all font-bold rounded-xl w-full border border-red-100 text-lg group">
                        <AlertTriangle size={22} strokeWidth={2} className="text-red-600 group-hover:text-white" />
                        تنبيه حالة طوارئ
                    </button>
                </div>
                </>
                ) : (
                    <div className="flex flex-col h-[600px] relative z-10 mt-8">
                        {/* In-Trip Header */}
                        <div className="flex items-center justify-between mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center">
                                    <Navigation2 size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-lg">الرحلة جارية</p>
                                    <p className="text-sm text-gray-500">
                                        {osrmMeta ? `المدة المتبقية: ${osrmMeta.duration} دقيقة (${osrmMeta.distance} كم)` : 'جاري حساب المسار الذكي...'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={async () => {
                                    try { await api.post('/driver/trip/end'); } catch (e) { console.warn('فشل إنهاء الرحلة في الباكند:', e); }
                                    setTripStarted(false);
                                    setRoutePath([]);
                                }}
                                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold transition-colors border border-red-100 text-sm"
                            >
                                إنهاء الرحلة
                            </button>
                        </div>

                        {/* Map Container */}
                        <div className="flex-1 rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative mb-4">
                            <SharedBusMap
                                routePath={routePath.map(([lat, lng]) => ({ lat, lng }))}
                                school={dashboardData?.school}
                                students={students || []}
                                busLocation={null}
                                routeLoading={routeLoading}
                            />
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default DriverDashboard;
