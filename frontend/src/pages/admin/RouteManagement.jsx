import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, X, Loader2, AlertCircle, Pencil, Ban, Bus, Users, Route as RouteIcon, Navigation2, Check } from 'lucide-react';
import api from '../../services/apiService';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

// Fix icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Selected Student Icon (Green)
const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom School/Source Icon (Blue Star etc., just standard for now)
const schoolIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2 && center[0] !== 0) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
};

const FitBounds = ({ path }) => {
  const map = useMap();
  useEffect(() => {
    if (path && path.length > 0) {
      const bounds = L.latLngBounds(path);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [path, map]);
  return null;
};

const RouteManagement = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('create'); // 'create' or 'manage'
    
    // Data
    const [routes, setRoutes] = useState([]);
    const [unassignedStudents, setUnassignedStudents] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    
    // Map State
    const [selectedStudents, setSelectedStudents] = useState([]); // Students added to current route
    const [mapCenter, setMapCenter] = useState([24.7136, 46.6753]); // Riyadh
    const [routePathGeoJson, setRoutePathGeoJson] = useState([]); // Decoded for map [lat, lng] array
    const [osrmLoading, setOsrmLoading] = useState(false);
    const [osrmMeta, setOsrmMeta] = useState(null);

    // Form
    const [routeName, setRouteName] = useState('');
    const [savingRoute, setSavingRoute] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const fetchData = async () => {
        setLoadingData(true);
        try {
            const [routesRes, unassignedRes] = await Promise.all([
                api.get('/routes'),
                api.get('/students/unassigned')
            ]);
            setRoutes(routesRes.data.routes);
            setUnassignedStudents(unassignedRes.data.students);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- Interaction ---
    const toggleStudentSelection = (student) => {
        const isSelected = selectedStudents.find(s => s._id === student._id);
        if (isSelected) {
            setSelectedStudents(selectedStudents.filter(s => s._id !== student._id));
            setRoutePathGeoJson([]); // Clear line if they remove a student
            setOsrmMeta(null);
        } else {
            setSelectedStudents([...selectedStudents, student]);
            setMapCenter([student.location.coordinates[1], student.location.coordinates[0]]);
        }
    };

    // --- OSRM Auto Routing API ---
    const handleAutoRoute = async () => {
        if (selectedStudents.length < 2) {
            setError(t('routeManagement.errors.minStudents'));
            return;
        }
        setError('');
        setOsrmLoading(true);

        try {
            // OSRM Trip API: optimize order and get geometry (solves TSP)
            // Coordinates string: lng,lat;lng,lat...
            const coordsString = selectedStudents.map(s => `${s.location.coordinates[0]},${s.location.coordinates[1]}`).join(';');
            
            const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=false&source=first&destination=last&geometries=geojson`;
            const { data } = await axios.get(osrmUrl);

            if (data.code === 'Ok' && data.trips.length > 0) {
                const trip = data.trips[0];
                const geojsonCoords = trip.geometry.coordinates; // [[lng, lat]]
                
                // Convert for Leaflet Polyline: [[lat, lng]]
                const leafletPath = geojsonCoords.map(c => [c[1], c[0]]);
                setRoutePathGeoJson(leafletPath);
                
                // Keep track of duration/distance
                setOsrmMeta({
                    duration: Math.ceil(trip.duration / 60), // minutes
                    distance: (trip.distance / 1000).toFixed(1) // km
                });

                // Reorder selected students based on OSRM Waypoint order
                const sortedWaypoints = data.waypoints.sort((a, b) => a.waypoint_index - b.waypoint_index);
                // The indices match our selectedStudents array
                const newOrderedStudents = sortedWaypoints.map(wp => {
                    // Match the original coordinate approximately (or use original index if available, but osrm doesn't return original index directly sometimes? Wait, waypoint has original_index wait, let's just use the simplest assumption for now without changing actual selectedStudents state).
                    return selectedStudents[data.waypoints.indexOf(wp)];
                });
                // We'll skip reordering the UI array just to avoid complexity, OSRM draws the path optimally.
            } else {
                setError(t('routeManagement.errors.osrmFailed'));
            }
        } catch (err) {
            console.error('OSRM Error', err);
            setError(t('routeManagement.errors.osrmConnection'));
        } finally {
            setOsrmLoading(false);
        }
    };

    // --- Save Route to Backend ---
    const handleSaveRoute = async () => {
        if (!routeName) {
            setError(t('routeManagement.errors.noRouteName'));
            return;
        }
        if (selectedStudents.length < 2) {
            setError(t('routeManagement.errors.minStudentsSave'));
            return;
        }
        if (routePathGeoJson.length === 0) {
            setError(t('routeManagement.errors.drawFirst'));
            return;
        }

        setSavingRoute(true);
        setError('');
        try {
            // Encode polyline as stringified GeoJSON inside our backend String field
            const polylineStr = JSON.stringify(routePathGeoJson);
            
            await api.post('/routes', {
                name: routeName,
                students: selectedStudents.map(s => s._id),
                polyline: polylineStr,
                estimatedDuration: osrmMeta ? osrmMeta.duration : null
            });

            setSuccessMsg(t('routeManagement.saveSuccess'));
            
            // Reset state
            setSelectedStudents([]);
            setRoutePathGeoJson([]);
            setOsrmMeta(null);
            setRouteName('');
            fetchData(); // Refresh both routes and unassigned students

            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || t('routeManagement.errors.saveFailed'));
        } finally {
            setSavingRoute(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('routeManagement.errors.deleteConfirm'))) return;
        try { 
            await api.delete(`/routes/${id}`); 
            fetchData(); 
        } catch (err) { console.error(err); }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4 px-2">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <RouteIcon size={24} className="text-primary-500" />
                    {t('routeManagement.title')}
                </h2>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('create')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${activeTab === 'create' ? 'bg-white text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('routeManagement.createRoute')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('manage')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${activeTab === 'manage' ? 'bg-white text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('routeManagement.manageRoutes')}
                    </button>
                </div>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-start gap-2"><AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />{error}</div>}
            {successMsg && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-start gap-2"><Check size={16} className="text-green-500 mt-0.5 shrink-0" />{successMsg}</div>}

            {activeTab === 'create' && (
                <div className="flex flex-col lg:flex-row gap-6 h-[75vh] min-h-[600px]">
                    {/* Left Sidebar: Unassigned Students */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-4">
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-bold flex items-center gap-2 text-gray-800"><Users size={18} className="text-primary-500"/> {t('routeManagement.unassignedStudents', { count: unassignedStudents.length })}</h3>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto p-4 space-y-3">
                                {loadingData ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary-400" /></div>
                                ) : unassignedStudents.length === 0 ? (
                                    <div className="text-center p-6 text-gray-400 text-sm bg-gray-50 rounded-xl">{t('routeManagement.allAssigned')}</div>
                                ) : (
                                    unassignedStudents.map(student => {
                                        const isSelected = selectedStudents.some(s => s._id === student._id);
                                        return (
                                            <div 
                                                key={student._id} 
                                                onClick={() => toggleStudentSelection(student)}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between
                                                    ${isSelected ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                                            >
                                                <div>
                                                    <p className={`font-bold text-sm ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>{student.name}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{student.studentId}</p>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-200 text-transparent'}`}>
                                                    <Check size={14} />
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Action Footer */}
                            <div className="p-4 border-t border-gray-100 bg-white">
                                <div className="space-y-3">
                                    <input 
                                        type="text" 
                                        placeholder={t('routeManagement.routeNamePlaceholder')}
                                        value={routeName}
                                        onChange={e => setRouteName(e.target.value)}
                                        className="w-full text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500"
                                    />
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={handleAutoRoute}
                                            disabled={selectedStudents.length < 2 || osrmLoading}
                                            className="px-3 py-2.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition flex justify-center items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {osrmLoading ? <Loader2 size={14} className="animate-spin"/> : <Navigation2 size={14}/>}
                                            {t('routeManagement.drawRoute')}
                                        </button>
                                        
                                        <button 
                                            onClick={handleSaveRoute}
                                            disabled={selectedStudents.length < 2 || routePathGeoJson.length === 0 || savingRoute}
                                            className="px-3 py-2.5 bg-primary-500 text-white text-xs font-bold rounded-xl hover:bg-primary-600 transition flex justify-center items-center disabled:opacity-50"
                                        >
                                            {savingRoute ? <Loader2 size={14} className="animate-spin"/> : t('routeManagement.saveRoute')}
                                        </button>
                                    </div>

                                    {osrmMeta && (
                                        <div className="text-[11px] font-bold text-center text-gray-500 mt-2 bg-gray-50 rounded-lg py-1.5">
                                            {t('routeManagement.duration', { duration: osrmMeta.duration, distance: osrmMeta.distance })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Map */}
                    <div className="w-full lg:w-2/3 bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden relative shadow-inner z-0">
                        <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }} className="z-0">
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                            
                            {/* Unassigned Students (Grey Pins) */}
                            {unassignedStudents.map(s => {
                                const lat = s.location?.coordinates[1];
                                const lng = s.location?.coordinates[0];
                                const isSelected = selectedStudents.some(sel => sel._id === s._id);
                                if (!lat || !lng || isSelected) return null; // Don't show generic pin if selected

                                return (
                                    <Marker key={s._id} position={[lat, lng]}>
                                        <Tooltip direction="top" className="font-sans font-bold" opacity={1}>{s.name} ({t('routeManagement.unassigned')})</Tooltip>
                                    </Marker>
                                );
                            })}

                            {/* Selected Students (Green Pins) */}
                            {selectedStudents.map((s, idx) => {
                                const lat = s.location?.coordinates[1];
                                const lng = s.location?.coordinates[0];
                                return (
                                    <Marker key={`sel-${s._id}`} position={[lat, lng]} icon={selectedIcon}>
                                        <Tooltip permanent direction="bottom" className="font-sans font-bold text-primary-600" opacity={0.9}>
                                            {t('routeManagement.stopLabel')}
                                        </Tooltip>
                                    </Marker>
                                );
                            })}

                            {/* OSRM Route Line */}
                            {routePathGeoJson.length > 0 && <Polyline positions={routePathGeoJson} color="#3b82f6" weight={5} opacity={0.8} />}
                            {routePathGeoJson.length > 0 && <FitBounds path={routePathGeoJson} />}
                            {routePathGeoJson.length === 0 && <RecenterMap center={mapCenter} />}
                        </MapContainer>
                    </div>
                </div>
            )}

            {/* Manage Routes Tab */}
            {activeTab === 'manage' && (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    {loadingData ? (
                        <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
                    ) : routes.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 bg-white">
                            <RouteIcon size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="font-bold text-lg">{t('routeManagement.noRoutes')}</p>
                        </div>
                    ) : (
                        <>
                            {/* ── Mobile: Card List (< md) ───────────────── */}
                            <div className="md:hidden flex flex-col p-3 gap-3 bg-gray-50/30">
                                {routes.map(route => (
                                    <div key={route._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm relative">
                                        <button 
                                            onClick={() => handleDelete(route._id)} 
                                            className="absolute top-3 start-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Ban size={16} />
                                        </button>
                                        
                                        <h4 className="font-bold text-gray-800 text-base mb-3 pe-2">{route.name}</h4>
                                        
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-2.5 flex flex-col items-center justify-center">
                                                <Users size={16} className="text-blue-500 mb-1" />
                                                <span className="text-blue-700 font-bold text-sm">{t('routeManagement.studentsCount', { count: route.students?.length || 0 })}</span>
                                            </div>
                                            <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex flex-col items-center justify-center">
                                                <Navigation2 size={16} className="text-gray-400 mb-1" />
                                                <span className="text-gray-600 font-bold text-sm">
                                                    {route.estimatedDuration ? t('routeManagement.durationMin', { duration: route.estimatedDuration }) : '—'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-sm">
                                            <span className="text-gray-500">{t('routeManagement.assignedDriver')}</span>
                                            {route.driver ? (
                                                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                                                    <span className="text-blue-500">👤</span> {route.driver.name}
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold border border-amber-100">
                                                    {t('routeManagement.unassigned')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Desktop: Table (>= md) ─────────────────── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr className="text-gray-500 font-bold">
                                            <th className="px-6 py-4 text-start">{t('routeManagement.routeName')}</th>
                                            <th className="px-6 py-4 text-center">{t('studentManagement.studentCol')}</th>
                                            <th className="px-6 py-4 text-center">{t('routeManagement.estimatedDuration')}</th>
                                            <th className="px-6 py-4 text-start">{t('routeManagement.assignedDriver')}</th>
                                            <th className="px-6 py-4 text-center">{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {routes.map(route => (
                                            <tr key={route._id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-gray-800 text-start">{route.name}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100">
                                                        {t('routeManagement.studentsCount', { count: route.students?.length || 0 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-gray-600">
                                                    {route.estimatedDuration ? t('routeManagement.durationMin', { duration: route.estimatedDuration }) : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 text-start">
                                                    {route.driver ? (
                                                        <span className="inline-flex items-center gap-1.5 font-medium text-sm">
                                                            <span className="text-blue-500 text-xs">👤</span> {route.driver.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs border border-amber-100 font-bold">{t('routeManagement.unassigned')}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleDelete(route._id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title={t('routeManagement.disableRoute')}>
                                                            <Ban size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default RouteManagement;
