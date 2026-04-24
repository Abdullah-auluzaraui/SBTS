import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Check, X, Loader2, Navigation, School } from 'lucide-react';
import api from '../../services/apiService';
import { useTranslation } from 'react-i18next';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const schoolMarkerIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const ClickMarker = ({ position, setPosition }) => {
    useMapEvents({
        click(e) { setPosition(e.latlng); }
    });
    return position ? (
        <Marker
            position={position}
            icon={schoolMarkerIcon}
            draggable
            eventHandlers={{ dragend: (e) => setPosition(e.target.getLatLng()) }}
        />
    ) : null;
};

const FlyTo = ({ center }) => {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, 15); }, [center, map]);
    return null;
};

// Props:
//   schoolName  – display name
//   existingLocation – { coordinates: [lng, lat] } or null
//   onClose()
//   onSaved(position)
const SchoolLocationPicker = ({ schoolName, existingLocation, onClose, onSaved }) => {
    const { t } = useTranslation();
    const [position, setPosition] = useState(null);
    const [flyTarget, setFlyTarget] = useState(null);
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (existingLocation?.coordinates?.[0] !== 0) {
            const [lng, lat] = existingLocation.coordinates;
            const pos = { lat, lng };
            setPosition(pos);
            setFlyTarget([lat, lng]);
        }
    }, [existingLocation]);

    const handleMyLocation = () => {
        setGeoLoading(true);
        setError('');

        if (!navigator.geolocation) {
            setError(t('schoolLocationPicker.errors.noSupport'));
            setGeoLoading(false);
            return;
        }

        // First attempt: low accuracy (fast — uses WiFi/cell triangulation)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setPosition(coords);
                setFlyTarget([coords.lat, coords.lng]);
                setGeoLoading(false);
            },
            () => {
                // Fallback: high accuracy with extended timeout
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        setPosition(coords);
                        setFlyTarget([coords.lat, coords.lng]);
                        setGeoLoading(false);
                    },
                    (err) => {
                        setGeoLoading(false);
                        if (err.code === err.PERMISSION_DENIED) {
                            setError(t('schoolLocationPicker.errors.permissionDenied'));
                        } else if (err.code === err.TIMEOUT) {
                            setError(t('schoolLocationPicker.errors.timeout'));
                        } else {
                            setError(t('schoolLocationPicker.errors.genericGeoError'));
                        }
                    },
                    { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
                );
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
        );
    };

    const handleSave = async () => {
        if (!position) { setError(t('schoolLocationPicker.errors.selectLocation')); return; }
        setLoading(true);
        setError('');
        try {
            await api.put('/admin/school/location', { lat: position.lat, lng: position.lng });
            onSaved(position);
        } catch (err) {
            setError(err.response?.data?.message || t('schoolLocationPicker.errors.saveFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                            <School size={20} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{t('schoolLocationPicker.title')}</h3>
                            <p className="text-sm text-gray-500">{schoolName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
                    <button
                        onClick={handleMyLocation}
                        disabled={geoLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold text-sm border border-blue-200 transition-colors disabled:opacity-60"
                    >
                        {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                        {t('schoolLocationPicker.useMyLocation')}
                    </button>
                    <span className="text-xs text-gray-400">{t('schoolLocationPicker.mapHint')}</span>
                </div>

                {/* Map */}
                <div className="w-full z-0" style={{ height: '420px' }}>
                    <MapContainer center={[24.7136, 46.6753]} zoom={12} style={{ height: '100%', width: '100%' }} className="z-0">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                        <ClickMarker position={position} setPosition={setPosition} />
                        {flyTarget && <FlyTo center={flyTarget} />}
                    </MapContainer>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
                    <div>
                        {position && (
                            <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                                <MapPin size={12} className="text-red-400" />
                                {position.lat?.toFixed(5)}, {position.lng?.toFixed(5)}
                            </p>
                        )}
                        {error && <p className="text-xs text-red-600 font-bold mt-1">{error}</p>}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm">
                            {t('schoolLocationPicker.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || !position}
                            className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl transition-all shadow text-sm text-white
                                ${loading || !position ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-red-500 hover:bg-red-600 shadow-red-500/25'}`}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {t('schoolLocationPicker.saveLocation')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SchoolLocationPicker;
