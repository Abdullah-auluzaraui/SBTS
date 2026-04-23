import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Check, X, Loader2, Navigation } from 'lucide-react';
import api from '../../services/apiService';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Component to handle map clicks/drags
const LocationMarker = ({ position, setPosition }) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          setPosition(e.target.getLatLng());
        },
      }}
    />
  );
};

// Component to recenter map from external button
const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15);
    }
  }, [center, map]);
  return null;
};

const LocationPicker = ({ student, onClose, onSaved }) => {
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState([24.7136, 46.6753]); // Default: Riyadh
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    // If student already has a location, use it
    if (student?.location?.coordinates && student.location.coordinates[0] !== 0) {
      const [lng, lat] = student.location.coordinates;
      setPosition({ lat, lng });
      setMapCenter([lat, lng]);
    } else {
      // Try to get user's current location automatically as starting point
      handleCurrentLocation();
    }
  }, [student]);

  const handleCurrentLocation = () => {
    setGeoLoading(true);
    setError('');
    if (!navigator.geolocation) {
      setError('متصفحك لا يدعم تحديد الموقع.');
      setGeoLoading(false);
      return;
    }

    // First attempt: low accuracy (fast — uses WiFi/cell triangulation, < 2 seconds)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(coords);
        setMapCenter([coords.lat, coords.lng]);
        setGeoLoading(false);
        setError('');
      },
      () => {
        // Fallback: high accuracy with extended timeout
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setPosition(coords);
            setMapCenter([coords.lat, coords.lng]);
            setGeoLoading(false);
            setError('');
          },
          (err) => {
            setGeoLoading(false);
            if (err.code === err.PERMISSION_DENIED) {
              setError('تم رفض إذن الموقع. يرجى السماح للمتصفح باستخدام الموقع ثم المحاولة مجدداً.');
            } else if (err.code === err.TIMEOUT) {
              setError('انتهت مهلة تحديد الموقع. تأكد من تفعيل خدمة الموقع على جهازك وحاول مجدداً.');
            } else {
              setError('تعذّر تحديد موقعك. يمكنك تحديد الموقع يدوياً على الخريطة.');
            }
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    if (!position) {
      setError('يرجى تحديد موقع على الخريطة.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.put(`/parents/students/${student._id}/location`, {
        lat: position.lat,
        lng: position.lng
      });
      onSaved(position);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء حفظ الموقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <MapPin className="text-primary-500" />
              تحديد موقع الطالب: {student?.name}
            </h3>

          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between gap-4">
          <button
            onClick={handleCurrentLocation}
            disabled={geoLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold transition-colors text-sm border border-blue-200"
          >
            {geoLoading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            استخدام موقعي الحالي (GPS)
          </button>
        </div>

        {/* Map Container */}
        <div className="w-full relative bg-gray-100 z-0" style={{ height: '500px' }}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {position && <LocationMarker position={position} setPosition={setPosition} />}
            <RecenterMap center={mapCenter} />
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-center bg-white shrink-0">

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !position}
              className={`flex items-center gap-2 px-8 py-3 font-bold rounded-xl transition-all shadow-lg text-white
                ${loading || !position
                  ? 'bg-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/30 hover:-translate-y-0.5'
                }`}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              حفظ الموقع
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LocationPicker;
