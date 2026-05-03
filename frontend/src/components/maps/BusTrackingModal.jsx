import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Navigation2, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import api from '../../services/apiService';
import SharedBusMap from './SharedBusMap';
import { useTranslation } from 'react-i18next';
import io from 'socket.io-client';

const getSocketUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    return import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;
};

/**
 * BusTrackingModal — نافذة تتبع الحافلة لولي الأمر
 *
 * تجلب بيانات الرحلة من /api/parents/bus/:busId/live
 * وتُمرِّرها للمكون المشترك SharedBusMap.
 * عند تفعيل Socket.io لاحقاً: يُستبدل الـ Polling بـ socket.on
 *
 * Props:
 *   busId   : String — معرف الحافلة
 *   busName : String — رقم الحافلة للعرض
 *   onClose : Function
 */
const BusTrackingModal = ({ busId, busName, onClose }) => {
    const { t } = useTranslation();
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');
    const [liveBusLocation, setLiveBusLocation] = useState(null);
    const socketRef = useRef(null);

    const fetchLiveData = useCallback(async () => {
        try {
            const { data } = await api.get(`/parents/bus/${busId}/live`);
            setLiveData(data);
            setError('');
        } catch (err) {
            const msg = err.response?.data?.message || t('busTracking.loadingData');
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [busId]);

    useEffect(() => {
        fetchLiveData();
    }, [fetchLiveData]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !busId) return;

        const socket = io(getSocketUrl(), { auth: { token } });
        socketRef.current = socket;

        socket.on('bus:location', (payload) => {
            if (String(payload.busId) === String(busId)) {
                setLiveBusLocation({ lat: payload.lat, lng: payload.lng });
            }
        });

        return () => {
            socket.off('bus:location');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [busId]);

    // منع تمرير الصفحة خلف الـ Modal
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* رأس الـ Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                            <Navigation2 size={20} className="text-primary-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">{t('busTracking.title')}</h3>
                            <p className="text-sm text-gray-500">{busName || busId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* شريط الحالة */}
                {!loading && liveData && (
                    <div className={`px-6 py-2.5 shrink-0 flex items-center gap-2 text-sm font-bold ${
                        liveData.tripActive
                            ? 'bg-green-50 text-green-700 border-b border-green-100'
                            : 'bg-amber-50 text-amber-700 border-b border-amber-100'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${liveData.tripActive ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
                        {liveData.tripActive ? t('busTracking.tripActive') : t('busTracking.noActiveTrip')}
                    </div>
                )}

                {/* محتوى الـ Modal */}
                <div className="flex-1 min-h-0">
                    {/* حالة التحميل الأولي */}
                    {loading && (
                        <div className="h-80 flex flex-col items-center justify-center gap-3">
                            <Loader2 size={36} className="text-primary-500 animate-spin" />
                            <p className="text-gray-500 font-medium">{t('busTracking.loadingData')}</p>
                        </div>
                    )}

                    {/* حالة الخطأ */}
                    {!loading && error && (
                        <div className="h-80 flex flex-col items-center justify-center gap-3 px-6">
                            <AlertTriangle size={36} className="text-red-400" />
                            <p className="text-red-600 font-bold text-center">{error}</p>
                            <button
                                onClick={fetchLiveData}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors"
                            >
                                {t('busTracking.retry')}
                            </button>
                        </div>
                    )}

                    {/* الخريطة */}
                    {!loading && !error && liveData && (
                        <div className="h-[420px]">
                            {!liveData.tripActive && liveData.routePath.length === 0 ? (
                                /* لا توجد رحلة نشطة */
                                <div className="h-full flex flex-col items-center justify-center gap-3 px-6 bg-gray-50">
                                    <MapPin size={40} className="text-gray-300" />
                                    <p className="text-gray-500 font-bold text-center">
                                        {t('busTracking.tripNotStarted')}
                                    </p>
                                    <p className="text-gray-400 text-sm text-center">
                                        {t('busTracking.tripWillShow')}
                                    </p>
                                </div>
                            ) : (
                                <SharedBusMap
                                    routePath={liveData.routePath}
                                    school={liveData.school}
                                    students={liveData.myStudents}
                                    busLocation={liveBusLocation ?? liveData.lastLocation}
                                    routeLoading={false}
                                    showRouteLine={false}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* ذيل الـ Modal — معلومات إضافية */}
                {!loading && !error && liveData && liveData.myStudents?.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
                        <p className="text-xs text-gray-500 font-medium mb-2">{t('busTracking.myStudents')}</p>
                        <div className="flex flex-wrap gap-2">
                            {liveData.myStudents.map((s, i) => (
                                <span
                                    key={s._id || i}
                                    className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700"
                                >
                                    {s.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BusTrackingModal;
