import React, { useState, useEffect, useRef } from 'react';
import {
    MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Bus, MapPin, Navigation2, Loader2, AlertCircle,
    User, Users, Clock, Link
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/apiService';
import axios from 'axios';
import io from 'socket.io-client';

const getSocketUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    return import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;
};

// ── Fix default Leaflet icons ─────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const studentIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33]
});

const busIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const liveBusMarkerIcon = L.divIcon({
    html: '<div style="font-size:30px;line-height:1;">🚌</div>',
    className: '',
    iconAnchor: [15, 15]
});

// Auto-fit bounds when route path changes
const FitBounds = ({ path }) => {
    const map = useMap();
    useEffect(() => {
        if (path && path.length > 1) {
            map.fitBounds(L.latLngBounds(path), { padding: [50, 50] });
        }
    }, [path, map]);
    return null;
};

// Auto-center ONCE on first live location — then hands-off so admin can pan freely
const LiveBusController = ({ liveBusLocation }) => {
    const map = useMap();
    const centeredRef = useRef(false);
    useEffect(() => {
        if (liveBusLocation?.lat && liveBusLocation?.lng && !centeredRef.current) {
            centeredRef.current = true;
            map.setView([liveBusLocation.lat, liveBusLocation.lng], 15, { animate: true, duration: 0.5 });
        }
    }, [liveBusLocation, map]);
    return null;
};

// Default fallback center (Riyadh)
const DEFAULT_CENTER = [24.7136, 46.6753];

const FleetMap = () => {
    const { t } = useTranslation();
    const [buses, setBuses] = useState([]);
    const [schoolPos, setSchoolPos] = useState(null); // [lat, lng] from DB
    const [selectedBus, setSelectedBus] = useState(null);
    const [students, setStudents] = useState([]);
    const [routePath, setRoutePath] = useState([]);
    const [osrmMeta, setOsrmMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [routeLoading, setRouteLoading] = useState(false);
    const [error, setError] = useState('');
    const [liveBusLocation, setLiveBusLocation] = useState(null);
    const [studentStatusMap, setStudentStatusMap] = useState(new Map());
    const socketRef = useRef(null);

    // Events that mean the student is no longer at their home stop
    const HIDDEN_EVENTS = new Set(['boarding', 'exit', 'absent', 'no_board', 'arrived_home', 'no_receiver']);

    // ── Load buses + school location ─────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const [busRes, schoolRes] = await Promise.all([
                    api.get('/buses'),
                    api.get('/admin/school')
                ]);
                setBuses(busRes.data.buses);
                const loc = schoolRes.data.school?.location;
                if (loc?.coordinates?.[0] !== 0) {
                    setSchoolPos([loc.coordinates[1], loc.coordinates[0]]); // [lat, lng]
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // ── Socket.io: listen for real-time bus location updates ─────────────
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = io(getSocketUrl(), { auth: { token } });
        socketRef.current = socket;

        socket.on('bus:location', (payload) => {
            if (selectedBus && String(payload.busId) === String(selectedBus._id)) {
                setLiveBusLocation({ lat: payload.lat, lng: payload.lng });
            }
        });

        socket.on('student:status', (payload) => {
            if (selectedBus && String(payload.busId) === String(selectedBus._id)) {
                setStudentStatusMap(prev =>
                    new Map(prev).set(String(payload.studentId), payload.event)
                );
            }
        });

        return () => {
            socket.off('bus:location');
            socket.off('student:status');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [selectedBus]);

    // ── When a bus is selected, fetch its students and auto-route ─────────
    const handleSelectBus = async (bus) => {
        setSelectedBus(bus);
        setLiveBusLocation(null);
        setStudentStatusMap(new Map());
        setRoutePath([]);
        setOsrmMeta(null);
        setError('');
        setRouteLoading(true);

        if (!schoolPos) {
            setError(t('fleetMap.errors.noSchoolLocation'));
            setRouteLoading(false);
            return;
        }

        try {
            const [studentsRes, locationRes] = await Promise.all([
                api.get(`/students?busId=${bus._id}`),
                api.get(`/buses/${bus._id}/active-location`).catch(() => ({ data: { lastLocation: null } }))
            ]);

            const busStudents = (studentsRes.data.students || []).filter(
                s => s.location?.coordinates?.[0] !== 0 && s.location?.coordinates?.[1] !== 0
            );
            setStudents(busStudents);

            if (locationRes.data.lastLocation) {
                setLiveBusLocation(locationRes.data.lastLocation);
            }

            if (locationRes.data.studentEvents?.length > 0) {
                const statusMap = new Map();
                locationRes.data.studentEvents.forEach(({ studentId, event }) => {
                    statusMap.set(String(studentId), event);
                });
                setStudentStatusMap(statusMap);
            }

            if (busStudents.length === 0) {
                setError(t('fleetMap.errors.noStudentLocations'));
                setRouteLoading(false);
                return;
            }

            // Route: students’ homes → school (students are pickup stops, school is destination)
            const studentCoords = busStudents
                .map(s => `${s.location.coordinates[0]},${s.location.coordinates[1]}`)
                .join(';');
            // School is the last point [lng, lat]
            const schoolCoord = `${schoolPos[1]},${schoolPos[0]}`;
            const coordsString = `${studentCoords};${schoolCoord}`;

            const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=false&source=any&destination=last&geometries=geojson`;
            const { data: osrmData } = await axios.get(osrmUrl);

            if (osrmData.code === 'Ok' && osrmData.trips.length > 0) {
                const trip = osrmData.trips[0];
                const leafletPath = trip.geometry.coordinates.map(c => [c[1], c[0]]);
                setRoutePath(leafletPath);
                setOsrmMeta({
                    duration: Math.ceil(trip.duration / 60),
                    distance: (trip.distance / 1000).toFixed(1)
                });
            } else {
                setError(t('fleetMap.errors.osrmError'));
            }
        } catch (err) {
            console.error(err);
            setError(t('fleetMap.errors.fetchError'));
        } finally {
            setRouteLoading(false);
        }
    };

    // Mobile: which panel is visible ('list' | 'map')
    const [mobileView, setMobileView] = useState('list');

    // When a bus is selected on mobile, switch to map view automatically
    const handleSelectBusAndView = (bus) => {
        handleSelectBus(bus);
        setMobileView('map');
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <Bus size={22} className="text-primary-500" />
                    {t('fleetMap.title')}
                </h2>
                <p className="text-sm text-gray-500 hidden sm:block">{t('fleetMap.subtitle')}</p>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            )}

            {/* ── Mobile Tab Bar (only visible on small screens) ─────────── */}
            <div className="flex lg:hidden bg-gray-100 p-1 rounded-xl">
                <button
                    onClick={() => setMobileView('list')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mobileView === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
                >
                    {t('fleetMap.busList')}
                </button>
                <button
                    onClick={() => setMobileView('map')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mobileView === 'map' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
                >
                    {t('fleetMap.map')} {selectedBus ? `· ${selectedBus.busId}` : ''}
                </button>
            </div>

            {/* ── Route Info Bar (shown when bus selected) ──────────────── */}
            {selectedBus && (
                <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm text-sm">
                    <div className="flex items-center gap-2 font-bold text-gray-700">
                        <Bus size={15} className="text-primary-500" />
                        <span>{selectedBus.busId}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <Users size={14} />
                        <span>{t('fleetMap.studentCount', { count: students.length })}</span>
                    </div>
                    {osrmMeta && (
                        <>
                            <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                                <Clock size={13} />
                                <span>{t('fleetMap.durationMin', { duration: osrmMeta.duration })}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                                <Navigation2 size={13} />
                                <span>{t('fleetMap.distanceKm', { distance: osrmMeta.distance })}</span>
                            </div>
                        </>
                    )}
                    {routeLoading && (
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <Loader2 size={13} className="animate-spin" />
                            <span>{t('fleetMap.calculating')}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Main Content: Side-by-side on desktop, tabs on mobile ──── */}
            <div className="flex flex-col lg:flex-row gap-4">

                {/* Bus List — hidden on mobile when map tab is active */}
                <div className={`w-full lg:w-72 shrink-0 flex flex-col gap-3 ${mobileView === 'map' ? 'hidden lg:flex' : 'flex'}`}>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 size={28} className="animate-spin text-primary-400" />
                        </div>
                    ) : buses.length === 0 ? (
                        <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-sm">
                            {t('fleetMap.noBuses')}
                        </div>
                    ) : (
                        buses.map(bus => {
                            const isSelected = selectedBus?._id === bus._id;
                            return (
                                <button
                                    key={bus._id}
                                    onClick={() => handleSelectBusAndView(bus)}
                                    className={`w-full text-right p-4 rounded-2xl border transition-all ${
                                        isSelected
                                            ? 'bg-primary-50 border-primary-200 shadow-md shadow-primary-100'
                                            : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary-500' : 'bg-gray-100'}`}>
                                            <Bus size={16} className={isSelected ? 'text-white' : 'text-gray-500'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold text-sm ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                                                {bus.busId}
                                            </p>
                                            <p className="text-[11px] text-gray-400">{t('fleetMap.capacity', { count: bus.capacity })}</p>
                                        </div>
                                        {isSelected && (
                                            <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                                        )}
                                    </div>
                                    {bus.driver ? (
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-2 pr-12">
                                            <User size={11} />
                                            <span>{bus.driver.name}</span>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-amber-500 font-bold mt-2 pr-12">{t('fleetMap.noDriver')}</p>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Map — hidden on mobile when list tab is active */}
                <div className={`flex-1 min-w-0 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-inner z-0"
                        style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>

                        {/* Overlay when no bus selected */}
                        {!selectedBus && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 z-10 gap-4">
                                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center">
                                    <Bus size={32} className="text-primary-400" />
                                </div>
                                <p className="text-gray-500 font-bold text-sm text-center px-8">
                                    {t('fleetMap.selectBusHint')}
                                </p>
                            </div>
                        )}

                        <MapContainer
                            center={schoolPos || DEFAULT_CENTER}
                            zoom={12}
                            style={{ height: '100%', width: '100%' }}
                            className="z-0"
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap"
                            />

                            {schoolPos && (
                                <Marker position={schoolPos} icon={busIcon}>
                                    <Tooltip direction="top" permanent opacity={0.95} className="font-sans font-bold text-xs">
                                        🏫 المدرسة
                                    </Tooltip>
                                </Marker>
                            )}

                            {students
                                .filter(s => !HIDDEN_EVENTS.has(studentStatusMap.get(String(s._id))))
                                .map(s => {
                                    const lat = s.location.coordinates[1];
                                    const lng = s.location.coordinates[0];
                                    return (
                                        <Marker key={s._id} position={[lat, lng]} icon={studentIcon}>
                                            <Tooltip direction="top" opacity={0.95} className="font-sans font-bold text-xs">
                                                🏠 {s.name}
                                            </Tooltip>
                                        </Marker>
                                    );
                                })
                            }

                            {routePath.length > 0 && (
                                <>
                                    <Polyline positions={routePath} color="#3b82f6" weight={5} opacity={0.8} dashArray="8 4" />
                                    <FitBounds path={routePath} />
                                </>
                            )}

                            {liveBusLocation?.lat && liveBusLocation?.lng && (
                                <Marker
                                    position={[liveBusLocation.lat, liveBusLocation.lng]}
                                    icon={liveBusMarkerIcon}
                                >
                                    <Tooltip direction="top" offset={[0, -30]} opacity={1} permanent>
                                        <span className="font-bold text-blue-700">🚌 {selectedBus?.busId}</span>
                                    </Tooltip>
                                </Marker>
                            )}

                            <LiveBusController liveBusLocation={liveBusLocation} />
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FleetMap;
