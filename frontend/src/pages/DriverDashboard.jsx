import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import { useTranslation } from 'react-i18next';
import { Bus, Play, Users, AlertTriangle, Loader2, Navigation2, CheckCircle, XCircle, PhoneCall, Phone, UserX, Home, AlertOctagon, ChevronDown, ChevronUp, CheckCircle2, Sparkles } from 'lucide-react';
import api from '../services/apiService';
import axios from 'axios';
import SharedBusMap from '../components/maps/SharedBusMap';
import DriverContactsModal from '../components/DriverContactsModal';
import TripTypeModal from '../components/TripTypeModal';




const DriverDashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
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

    // School contacts modal
    const [showContacts, setShowContacts] = useState(false);

    // ─── Trip-type & per-student status state ─────────────────────────────
    // tripType drives which action buttons appear on each card and is sent
    // to the backend (/driver/me?tripType=return) to filter absent students
    // out of the return list.
    const [tripType, setTripType] = useState(null); // 'to_school' | 'to_home' | null
    const [showTripTypeModal, setShowTripTypeModal] = useState(false);

    // Session-local mirror of server-side absent records (also written to DB).
    const [absentStudents, setAbsentStudents] = useState(new Set());
    // studentStatuses maps student._id -> the latest action taken on the card
    // ('boarded' | 'absent' | 'arrived_home' | 'no_board' | 'no_receiver').
    // When present, the card is considered "resolved" and moves to Completed.
    const [studentStatuses, setStudentStatuses] = useState(new Map());

    // OSRM-derived route order: student._id -> waypoint_index. The smaller the
    // index, the earlier that student is on the route. We pin the smallest
    // unresolved waypoint as the "Active Student".
    const [routeOrder, setRouteOrder] = useState(new Map());

    // Completed section is collapsed by default to keep the screen calm.
    const [showCompleted, setShowCompleted] = useState(false);

    // ─── Notification stubs (no API calls yet) ───────────────────────────
    // Real notification delivery isn't built yet — these stubs keep the
    // call-sites in place so they can be swapped out without touching the UI.
    const notifyAbsent = (student) => {
        console.log('[NOTIFY] Absent:', student?.name, student?._id);
    };
    const notifyNoReceiver = (student) => {
        console.log('[NOTIFY] No Receiver:', student?.name, student?._id);
    };

    // ─── Driver GPS helper ────────────────────────────────────────────────
    // Resolves to a [lng, lat] tuple in OSRM-friendly order. If the browser
    // doesn't expose geolocation, the user denies the permission, or the
    // request times out, we transparently fall back to `fallbackLngLat` so
    // the routing call always succeeds.
    const getDriverCoordinate = (fallbackLngLat) => new Promise(resolve => {
        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
            return resolve(fallbackLngLat);
        }
        navigator.geolocation.getCurrentPosition(
            pos => resolve([pos.coords.longitude, pos.coords.latitude]),
            err => {
                console.warn('Geolocation unavailable, falling back to school as origin:', err?.message);
                resolve(fallbackLngLat);
            },
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 60_000 }
        );
    });

    // Centralized fetcher so we can refresh with a different tripType later
    // (e.g., when the driver selects "Trip Back Home", we re-fetch with
    // ?tripType=to_home so absent students are stripped out server-side).
    //
    // The response now includes `todayEvents` — every attendance row for
    // this bus today — so we can rebuild the resolved-student state for
    // the active direction (used by the Completed section + active pin).
    const fetchDashboardData = async (selectedTripType = null) => {
        try {
            const url = selectedTripType === 'to_home'
                ? '/driver/me?tripType=to_home'
                : selectedTripType === 'to_school'
                    ? '/driver/me?tripType=to_school'
                    : '/driver/me';
            const { data } = await api.get(url);
            setDashboardData(data.data);
            hydrateFromTodayEvents(data.data?.todayEvents, selectedTripType);
        } catch (err) {
            console.error(err);
            setError(t('common.loading'));
        } finally {
            setLoading(false);
        }
    };

    // Rebuild boardedStudents / absentStudents / studentStatuses from the
    // server's todayEvents payload so a page refresh keeps the Completed
    // section in sync. We only consider events tagged with the current
    // direction (or untagged legacy rows when in the morning) and pick
    // the latest one per student by timestamp.
    const hydrateFromTodayEvents = (todayEvents, selectedTripType) => {
        const directionForHydration = selectedTripType || 'to_school';

        const boarded = new Set();
        const absent  = new Set();
        const statuses = new Map();

        if (!Array.isArray(todayEvents) || todayEvents.length === 0) {
            setBoardedStudents(boarded);
            setAbsentStudents(absent);
            setStudentStatuses(statuses);
            return;
        }

        // Filter to current direction. Legacy rows with no tripType are
        // accepted as morning events so old data still hydrates.
        const relevant = todayEvents.filter(e => {
            if (e.tripType === directionForHydration) return true;
            if (!e.tripType && directionForHydration === 'to_school') return true;
            return false;
        });

        // Pick the latest event per student.
        const latestByStudent = new Map();
        relevant.forEach(e => {
            const key = String(e.student);
            const prev = latestByStudent.get(key);
            const tsCurr = new Date(e.timestamp).getTime();
            const tsPrev = prev ? new Date(prev.timestamp).getTime() : -Infinity;
            if (tsCurr >= tsPrev) latestByStudent.set(key, e);
        });

        latestByStudent.forEach((e, sid) => {
            switch (e.event) {
                case 'boarding':
                    boarded.add(sid);
                    statuses.set(sid, 'boarded');
                    break;
                case 'absent':
                    absent.add(sid);
                    statuses.set(sid, 'absent');
                    break;
                case 'arrived_home':
                case 'no_board':
                case 'no_receiver':
                    statuses.set(sid, e.event);
                    break;
                default:
                    // 'exit' and any future enum values are intentionally not
                    // surfaced as a per-card resolution at the moment.
                    break;
            }
        });

        setBoardedStudents(boarded);
        setAbsentStudents(absent);
        setStudentStatuses(statuses);
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Open the trip-type chooser modal. The actual OSRM/start-trip flow runs
    // only after the driver picks a direction in handleSelectTripType().
    const handleOpenTripTypeChooser = () => {
        if (!dashboardData?.bus || !dashboardData?.students?.length || !dashboardData?.school?.location) {
            return setError('بيانات الحافلة أو الطلاب أو المدرسة غير مكتملة لبدء الرحلة.');
        }
        setError('');
        setShowTripTypeModal(true);
    };

    // Driver picked a direction. We close the modal, persist the choice, and
    // (for return trips) re-fetch the dashboard with ?tripType=return so the
    // server strips today's absent students. After the data is settled we kick
    // off the existing OSRM/start-trip flow.
    const handleSelectTripType = async (selected) => {
        setShowTripTypeModal(false);
        setTripType(selected);

        // Route order is OSRM-specific and must be recomputed for the new
        // trip; everything else (boarded/absent/statuses) is rehydrated
        // from `todayEvents` inside fetchDashboardData() below.
        setRouteOrder(new Map());
        setShowCompleted(false);

        // Always re-fetch so the server can apply the absent filter for
        // return trips and so todayEvents is scoped to the chosen direction.
        await fetchDashboardData(selected);

        await handleStartTrip();
    };

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

            // ─── Build OSRM coordinate array per trip direction ─────────
            // OSRM expects "lng,lat" pairs joined by ';'. We always pass
            //   source=first & destination=last
            // so OSRM treats the FIRST and LAST coordinates as fixed
            // geographical anchors and only optimises the middle stops.
            //
            //   to_school : [driverGPS, ...studentHomes, school]
            //   to_home   : [school,    ...studentHomes]   (last student = destination)
            //
            // In both layouts students live at indices 1..N, so the offset
            // used later when mapping waypoint_index -> student is the same.
            const fmt = ([lng, lat]) => `${lng},${lat}`;
            const schoolLngLat  = school.location.coordinates;        // [lng, lat]
            const studentLngLat = validStudents.map(s => s.location.coordinates);

            let orderedCoords;
            if (tripType === 'to_home') {
                orderedCoords = [schoolLngLat, ...studentLngLat];
            } else {
                // 'to_school' or null (pre-trip default behaves as morning).
                // The driver's live GPS is the origin; if the browser denies
                // geolocation we transparently fall back to the school so a
                // route can still be drawn.
                const driverLngLat = await getDriverCoordinate(schoolLngLat);
                orderedCoords = [driverLngLat, ...studentLngLat, schoolLngLat];
            }

            const studentIndexOffset = 1; // students start at coord index 1 in both layouts
            const coordsString = orderedCoords.map(fmt).join(';');
            const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=false&source=first&destination=last&geometries=geojson`;

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

                // OSRM /trip preserves input order in `waypoints[i]` and assigns
                // each one a `waypoint_index` reflecting its visit order in the
                // optimized trip. We use that to pin the next-stop student.
                const orderMap = new Map();
                if (Array.isArray(osrmData.waypoints)) {
                    validStudents.forEach((s, i) => {
                        // Students live at coord indices 1..N because index 0
                        // is the driver (morning) or the school (return).
                        const wp = osrmData.waypoints[i + studentIndexOffset];
                        if (wp && typeof wp.waypoint_index === 'number') {
                            orderMap.set(s._id, wp.waypoint_index);
                        }
                    });
                }
                setRouteOrder(orderMap);

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
                event: 'boarding',
                tripType: tripType || 'to_school'
            });
            // Mark as boarded locally
            setBoardedStudents(prev => {
                const newSet = new Set(prev);
                newSet.add(studentId);
                return newSet;
            });
            // Also write into studentStatuses so the unified "resolved" check
            // (used for active-student pinning + Completed grouping) sees it.
            setStudentStatuses(prev => {
                const next = new Map(prev);
                next.set(studentId, 'boarded');
                return next;
            });
        } catch (err) {
            console.error('Manual boarding error:', err);
            setError('تعذر تسجيل حضور الطالب يدوياً.');
        } finally {
            setMarkingAttendance(null);
        }
    };

    // Mark a student as absent (morning trip only). Persists via the existing
    // attendance endpoint so the return-trip refetch can filter them out.
    const handleMarkAbsent = async (student) => {
        if (!dashboardData?.bus?._id || !student?._id) return;
        const studentId = student._id;

        setMarkingAttendance(studentId);
        try {
            await api.post('/driver/attendance/manual', {
                studentId,
                busId: dashboardData.bus._id,
                event: 'absent',
                tripType: tripType || 'to_school'
            });
            setAbsentStudents(prev => {
                const next = new Set(prev);
                next.add(studentId);
                return next;
            });
            setStudentStatuses(prev => {
                const next = new Map(prev);
                next.set(studentId, 'absent');
                return next;
            });
            // Notification side-effect (stub).
            notifyAbsent(student);
        } catch (err) {
            console.error('Mark absent error:', err);
            setError('تعذر تسجيل غياب الطالب.');
        } finally {
            setMarkingAttendance(null);
        }
    };

    // Shared handler for the three return-trip status buttons. Persists each
    // event via /driver/attendance/manual with the new enum value, then folds
    // the student into the Completed list. 'no_receiver' also fires the
    // notification stub.
    const handleReturnStatus = async (student, event) => {
        if (!dashboardData?.bus?._id || !student?._id) return;
        const studentId = student._id;

        setMarkingAttendance(studentId);
        try {
            await api.post('/driver/attendance/manual', {
                studentId,
                busId: dashboardData.bus._id,
                event,
                tripType: tripType || 'to_home'
            });
            setStudentStatuses(prev => {
                const next = new Map(prev);
                next.set(studentId, event);
                return next;
            });
            if (event === 'no_receiver') notifyNoReceiver(student);
        } catch (err) {
            console.error('Return status error:', err);
            setError('تعذر تحديث حالة الطالب.');
        } finally {
            setMarkingAttendance(null);
        }
    };

    // ─── Derived: active student + pending + completed ─────────────────
    // A student is "resolved" if any per-card action has been taken on them.
    // The active student is the smallest-route-order unresolved student
    // (falls back to the first one in list order before OSRM has run).
    // Hook is declared BEFORE the early loading return to keep call order
    // stable across renders (Rules of Hooks).
    const { activeStudent, pendingList, completedList } = useMemo(() => {
        const list = dashboardData?.students || [];
        const isResolved = (id) => studentStatuses.has(id) || boardedStudents.has(id) || absentStudents.has(id);

        const pending = list.filter(s => !isResolved(s._id));
        const completed = list.filter(s => isResolved(s._id));

        // Sort pending by routeOrder when available, else stable list order.
        pending.sort((a, b) => {
            const ai = routeOrder.has(a._id) ? routeOrder.get(a._id) : Number.POSITIVE_INFINITY;
            const bi = routeOrder.has(b._id) ? routeOrder.get(b._id) : Number.POSITIVE_INFINITY;
            return ai - bi;
        });

        const [active, ...rest] = pending;
        return { activeStudent: active || null, pendingList: rest, completedList: completed };
    }, [dashboardData, studentStatuses, boardedStudents, absentStudents, routeOrder]);

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

    // ─── Shared card renderer ──────────────────────────────────────────
    // Renders a single student card. `mode` is one of:
    //   'active'    — pinned at top with a primary ring + Active badge
    //   'pending'   — standard pending card (still actionable)
    //   'completed' — dimmed read-only card showing the resolved status pill
    const STATUS_PILL = {
        boarded:      { label: t('driver.boarded'),            cls: 'bg-green-100 text-green-700' },
        absent:       { label: t('driver.statusAbsent'),       cls: 'bg-gray-200 text-gray-700' },
        arrived_home: { label: t('driver.statusArrivedHome'),  cls: 'bg-green-100 text-green-700' },
        no_board:     { label: t('driver.statusNoBoard'),      cls: 'bg-amber-100 text-amber-700' },
        no_receiver:  { label: t('driver.statusNoReceiver'),   cls: 'bg-red-100 text-red-700' }
    };

    const renderStudentCard = (student, mode, indexLabel) => {
        if (!student) return null;
        const id = student._id;
        const isMarking = markingAttendance === id;
        const isActive = mode === 'active';
        const isCompleted = mode === 'completed';
        const status = studentStatuses.get(id);
        const pill = status ? STATUS_PILL[status] : null;

        // Container styling per mode. Active gets a primary ring + soft tint
        // so the driver can pick out the next stop at a glance. Completed
        // cards are dimmed so the eye skips over them.
        const containerCls = isActive
            ? 'border-2 border-primary-400 bg-primary-50/60 shadow-md ring-2 ring-primary-200 ring-offset-1'
            : isCompleted
                ? 'border border-gray-100 bg-white opacity-60'
                : 'border border-gray-100 bg-white shadow-sm';

        const indexBadgeCls = isActive
            ? 'bg-primary-500 text-white'
            : isCompleted
                ? 'bg-gray-100 text-gray-400'
                : 'bg-blue-50 text-blue-600';

        return (
            <div key={id} className={`rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${containerCls}`}>
                {/* Identity block — basic structure preserved */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold ${indexBadgeCls}`}>
                        {isCompleted
                            ? <CheckCircle2 size={18} />
                            : indexLabel}
                    </div>
                    <div className="min-w-0 text-start">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-800 truncate">{student.name}</p>
                            {isActive && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-700 bg-white border border-primary-200 rounded-full px-2 py-0.5">
                                    <Sparkles size={10} />
                                    {t('driver.activeStudent')}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                            {student.grade && `${t('driver.grade', { grade: student.grade })} - `}{student.studentId}
                        </p>
                    </div>
                </div>

                {/* Action area */}
                <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                    {isCompleted && pill && (
                        <span className={`text-xs px-3 py-1.5 rounded-lg font-bold ${pill.cls}`}>{pill.label}</span>
                    )}

                    {!isCompleted && tripType !== 'to_home' && (
                        <>
                            {/* Manual Boarding (morning + pre-trip default) */}
                            <button
                                type="button"
                                onClick={() => handleManualBoarding(id)}
                                disabled={isMarking}
                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-gray-200"
                            >
                                {isMarking ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                {t('driver.markBoarding')}
                            </button>

                            {/* Absent — only meaningful once a trip-type is chosen */}
                            {tripType === 'to_school' && (
                                <button
                                    type="button"
                                    onClick={() => handleMarkAbsent(student)}
                                    disabled={isMarking}
                                    className="text-xs bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-700 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-gray-200"
                                >
                                    <UserX size={12} />
                                    {t('driver.markAbsent')}
                                </button>
                            )}
                        </>
                    )}

                    {!isCompleted && tripType === 'to_home' && (
                        <>
                            <button
                                type="button"
                                onClick={() => handleReturnStatus(student, 'arrived_home')}
                                disabled={isMarking}
                                className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-green-100"
                            >
                                <Home size={12} />
                                {t('driver.markArrivedHome')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleReturnStatus(student, 'no_board')}
                                disabled={isMarking}
                                className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-amber-100"
                            >
                                <XCircle size={12} />
                                {t('driver.markNoBoard')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleReturnStatus(student, 'no_receiver')}
                                disabled={isMarking}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-red-100"
                            >
                                <AlertOctagon size={12} />
                                {t('driver.markNoReceiver')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // The full student-list section (used in both pre-trip and in-trip views
    // so the driver can keep marking statuses while the map is open).
    const studentListSection = (
        <div className="mb-10 relative z-10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl text-gray-800 text-start">
                    {t('driver.studentList')}
                </h3>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg font-bold">
                    {t('driver.studentCount', { boarded: boardedStudents.size, total: students?.length || 0 })}
                </span>
            </div>

            {students?.length > 0 ? (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
                    {/* Active student — pinned to the top */}
                    {activeStudent && renderStudentCard(activeStudent, 'active', 1)}

                    {/* Remaining pending */}
                    {pendingList.map((s, i) => renderStudentCard(s, 'pending', i + 2))}

                    {/* Empty pending state when everything is resolved */}
                    {!activeStudent && pendingList.length === 0 && completedList.length > 0 && (
                        <div className="text-center text-gray-400 text-sm py-2 font-bold">
                            {t('driver.completed')} ✓
                        </div>
                    )}

                    {/* Completed (collapsible) */}
                    {completedList.length > 0 && (
                        <div className="mt-2 border-t border-dashed border-gray-200 pt-3">
                            <button
                                type="button"
                                onClick={() => setShowCompleted(v => !v)}
                                className="w-full flex items-center justify-between gap-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors px-1"
                            >
                                <span className="inline-flex items-center gap-2 text-start">
                                    <CheckCircle2 size={14} className="text-gray-400" />
                                    {t('driver.completedCount', { count: completedList.length })}
                                </span>
                                {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {showCompleted && (
                                <div className="mt-3 flex flex-col gap-2">
                                    {completedList.map((s, i) => renderStudentCard(s, 'completed', i + 1))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-100 dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                    <Users size={40} strokeWidth={1.5} className="mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium text-lg">{t('driver.noStudents')}</p>
                </div>
            )}
        </div>
    );

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
                                        <h2 className="text-3xl text-gray-800 font-bold">{t('driver.dashboardTitle', { name: user?.name })}</h2>
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-bold border border-gray-200">
                            <span className={`w-2 h-2 rounded-full ${bus ? 'bg-green-500' : 'bg-amber-400'}`}></span>
                            {bus ? t('driver.busNumber', { id: bus.busId }) : t('driver.noBus')}
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
                                onClick={handleOpenTripTypeChooser}
                                disabled={!bus || !students?.length}
                                className="w-full px-8 py-4 bg-primary-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary-500/30 hover:bg-primary-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                                <Play size={22} strokeWidth={2} className="text-white" />
                                {t('driver.startTrip')}
                            </button>
                        </div>

                {/* Student list (active pin + pending + collapsible Completed) */}
                {studentListSection}

                {/* Emergency & School Contact Buttons */}
                <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Contact School — calm / trustworthy blue */}
                    <button
                        type="button"
                        onClick={() => setShowContacts(true)}
                        className="flex items-center justify-center gap-2 px-4 py-4 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all font-bold rounded-xl border border-blue-100 text-base w-full"
                    >
                        <Phone size={20} strokeWidth={2} />
                        <span>{t('driver.contactSchool')}</span>
                        {(dashboardData?.school?.emergencyContacts?.length || 0) > 0 && (
                            <span className="ms-1 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-bold bg-white text-blue-600 rounded-full border border-blue-200 group-hover:bg-blue-100">
                                {dashboardData.school.emergencyContacts.length}
                            </span>
                        )}
                    </button>

                    {/* 911 — high-danger red, visually distinct */}
                    <a
                        href="tel:911"
                        className="flex items-center justify-center gap-2 px-4 py-4 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all font-bold rounded-xl border border-red-100 text-base w-full"
                    >
                        <PhoneCall size={20} strokeWidth={2} />
                        <span>{t('driver.callEmergency')}</span>
                    </a>
                </div>
                </>
                ) : (
                    <div className="flex flex-col relative z-10 mt-8">
                        {/* In-Trip Header */}
                        <div className="flex items-center justify-between mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center">
                                    <Navigation2 size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-lg">{t('driver.tripActive')}</p>
                                    <p className="text-sm text-gray-500">
                                        {osrmMeta ? t('driver.remainingTime', { duration: osrmMeta.duration, distance: osrmMeta.distance }) : t('driver.calculatingRoute')}
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
                                {t('driver.endTrip')}
                            </button>
                        </div>

                        {/* Map Container */}
                        <div className="h-[420px] rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative mb-6">
                            <SharedBusMap
                                routePath={routePath.map(([lat, lng]) => ({ lat, lng }))}
                                school={dashboardData?.school}
                                students={students || []}
                                busLocation={null}
                                routeLoading={routeLoading}
                            />
                        </div>

                        {/* Student list during the trip — driver keeps marking
                            statuses while the map is open. */}
                        {studentListSection}
                    </div>
                )}
            </div>

            {showContacts && (
                <DriverContactsModal
                    contacts={dashboardData?.school?.emergencyContacts || []}
                    onClose={() => setShowContacts(false)}
                />
            )}

            {/* Trip type chooser — opens from the big Start Trip button */}
            {showTripTypeModal && (
                <TripTypeModal
                    onClose={() => setShowTripTypeModal(false)}
                    onSelect={handleSelectTripType}
                />
            )}

        </MainLayout>
    );
};

export default DriverDashboard;
