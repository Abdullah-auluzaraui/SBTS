import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ── Fix default Leaflet icons ─────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── أيقونات الخريطة ───────────────────────────────────────────────────────────
const schoolIcon = new L.Icon({
    iconUrl:   'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const studentIcon = new L.Icon({
    iconUrl:   'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33]
});

const busIcon = L.divIcon({
    html: '<div style="font-size:30px;line-height:1;">🚌</div>',
    className: '',
    iconAnchor: [15, 15]
});

// ── Map camera controller ─────────────────────────────────────────────────────
// Pre-trip  : fitBounds to show the full route.
// Navigation: auto-center ONCE on the first live location, then hands-off so
//             the user can pan freely while the marker continues to move.
const MapController = ({ busLocation, leafletPath }) => {
    const map = useMap();
    const centeredOnBus = useRef(false);
    useEffect(() => {
        if (busLocation?.lat && busLocation?.lng) {
            if (!centeredOnBus.current) {
                centeredOnBus.current = true;
                map.setView([busLocation.lat, busLocation.lng], 17, { animate: true, duration: 0.5 });
            }
        } else if (!centeredOnBus.current && leafletPath.length > 1) {
            map.fitBounds(L.latLngBounds(leafletPath), { padding: [50, 50] });
        }
    }, [busLocation, leafletPath, map]);
    return null;
};

const DEFAULT_CENTER = [24.7136, 46.6753];

/**
 * SharedBusMap — مكون عرض موحد للخريطة
 *
 * Props:
 *   routePath    : [{lat, lng}]          — مسار الرحلة (من الـ Backend أو OSRM)
 *   school       : { name, location: {coordinates:[lng,lat]} }
 *   students     : [{ name, location: {coordinates:[lng,lat]} }]  — مُفلتَرة حسب الدور
 *   busLocation  : { lat, lng } | null   — موقع الحافلة الحي (Socket.io لاحقاً)
 *   routeLoading : Boolean
 */
const SharedBusMap = ({ routePath = [], school, students = [], busLocation = null, routeLoading = false, showRouteLine = true }) => {
    const { t } = useTranslation();
    // تحويل المسار من {lat,lng} إلى [lat,lng] المتوافق مع Leaflet
    const leafletPath = routePath.map(p => [p.lat, p.lng]);

    return (
        <div className="w-full h-full relative">
            {/* طبقة التحميل */}
            {routeLoading && (
                <div className="absolute inset-0 z-[1000] bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                    <Loader2 size={40} className="text-primary-500 animate-spin mb-3" />
                    <p className="font-bold text-gray-700">{t('fleetMap.calculating')}</p>
                </div>
            )}

            <MapContainer
                center={DEFAULT_CENTER}
                zoom={12}
                className="w-full h-full z-0"
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                />

                {/* مسار الرحلة — مخفي في عرض ولي الأمر */}
                {showRouteLine && leafletPath.length > 0 && (
                    <>
                        <Polyline positions={leafletPath} color="#0EA5E9" weight={5} opacity={0.6} />
                        <Polyline positions={leafletPath} color="#0369A1" weight={2} opacity={0.9} dashArray="5, 10" />
                    </>
                )}

                <MapController busLocation={busLocation} leafletPath={leafletPath} />

                {/* علامة المدرسة */}
                {school?.location?.coordinates && (
                    <Marker
                        position={[school.location.coordinates[1], school.location.coordinates[0]]}
                        icon={schoolIcon}
                    >
                        <Tooltip direction="top" offset={[0, -30]} opacity={1} permanent>
                            <div className="font-bold text-gray-800 p-1 text-center">
                                {t('fleetMap.school')}: {school.name}
                            </div>
                        </Tooltip>
                    </Marker>
                )}

                {/* علامات الطلاب — يُعرض فقط ما تم تمريره (السائق: الكل، ولي الأمر: أبناؤه فقط) */}
                {students.map((student, idx) => {
                    const coords = student.location?.coordinates;
                    if (!coords || coords[0] === 0) return null;
                    return (
                        <Marker
                            key={student._id || idx}
                            position={[coords[1], coords[0]]}
                            icon={studentIcon}
                        >
                            <Tooltip direction="top" offset={[0, -20]}>
                                <div className="font-bold">{student.name}</div>
                                <div className="text-xs text-gray-500">{t('parent.homeLocation')}</div>
                            </Tooltip>
                        </Marker>
                    );
                })}

                {/* علامة الحافلة الحية — جاهز للـ Socket.io (busLocation يأتي من الـ Socket لاحقاً) */}
                {busLocation?.lat && busLocation?.lng && (
                    <Marker
                        position={[busLocation.lat, busLocation.lng]}
                        icon={busIcon}
                    >
                        <Tooltip direction="top" offset={[0, -30]} opacity={1} permanent>
                            <div className="font-bold text-blue-700 p-1">🚌 {t('busTracking.title')}</div>
                        </Tooltip>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
};

export default SharedBusMap;
