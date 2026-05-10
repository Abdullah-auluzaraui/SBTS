import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import { useTranslation } from 'react-i18next';
import { Bus, Play, Users, AlertTriangle, Loader2, Navigation2, CheckCircle, XCircle, PhoneCall, Phone, UserX, Home, School, AlertOctagon, ChevronDown, ChevronUp, CheckCircle2, Sparkles, X } from 'lucide-react';
import api from '../services/apiService';
import axios from 'axios';
import SharedBusMap from '../components/maps/SharedBusMap';
import TripSimulator from '../components/TripSimulator';
import DriverContactsModal from '../components/DriverContactsModal';
import TripTypeModal from '../components/TripTypeModal';
import NoReceiverModal from '../components/NoReceiverModal';




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

    // ─── Today's server-side trip status (source of truth for locking) ──
    // { to_school: {status, tripId, routePath} | null, to_home: ... }
    const [todayTripStatus, setTodayTripStatus] = useState({ to_school: null, to_home: null });
    const [todayStatusLoading, setTodayStatusLoading] = useState(true);
    
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

    // ─── Return trip two-phase state machine ─────────────────────────────
    // returnPhase: null (no trip selected) | 'checkin' (school gate boarding) | 'route' (drop-offs)
    const [returnPhase, setReturnPhase] = useState(null);

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

    // ─── No Receiver Modal state ─────────────────────────────────────────
    const [noReceiverTarget, setNoReceiverTarget] = useState(null); // student object
    const [noReceiverAcknowledged, setNoReceiverAcknowledged] = useState(false);

    // ─── Boarding Confirmation Modal state ────────────────────────────────
    const [boardingConfirmOpen, setBoardingConfirmOpen] = useState(false);
    const [boardingConfirmStudent, setBoardingConfirmStudent] = useState(null);

    // ─── Simulator state ───────────────────────────────────────────────────
    const [busLocation, setBusLocation]     = useState(null);  // { lat, lng } live bus pos
    const [approachingId, setApproachingId] = useState(null);  // student._id within 400 m ring
    const [currentStudent, setCurrentStudent] = useState(null); // student within 50 m (NFC zone)

    // ─── Success toast state ──────────────────────────────────────────────
    const [successMsg, setSuccessMsg] = useState('');
    useEffect(() => {
        if (!successMsg) return;
        const timer = setTimeout(() => setSuccessMsg(''), 3000);
        return () => clearTimeout(timer);
    }, [successMsg]);

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
        // Skip real GPS when simulation is already active — bus position is controlled by simulator
        if (busLocation !== null) return resolve(fallbackLngLat);
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
    // Accepts optional phase parameter for two-phase return trip workflow.
    //
    // The response now includes `todayEvents` — every attendance row for
    // this bus today — so we can rebuild the resolved-student state for
    // the active direction (used by the Completed section + active pin).
    const fetchDashboardData = async (selectedTripType = null, selectedPhase = null) => {
        try {
            const params = new URLSearchParams();
            if (selectedTripType === 'to_home') params.append('tripType', 'to_home');
            if (selectedTripType === 'to_school') params.append('tripType', 'to_school');
            if (selectedPhase === 'checkin') params.append('phase', 'checkin');
            if (selectedPhase === 'route') params.append('phase', 'route');

            const url = params.toString() ? `/driver/me?${params.toString()}` : '/driver/me';
            const { data } = await api.get(url);
            setDashboardData(data.data);
            hydrateFromTodayEvents(data.data?.todayEvents, selectedTripType, selectedPhase);
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
    //
    // For return trips with Phase 2 auto-restore: if all students have
    // to_home events (boarding or no_board), auto-set returnPhase='route'.
    const hydrateFromTodayEvents = (todayEvents, selectedTripType, selectedPhase) => {
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
                    // Legacy 'absent' events still hydrate for backward compat.
                    absent.add(sid);
                    statuses.set(sid, 'absent');
                    break;
                case 'no_board':
                    // Morning 'no_board' is treated as absent for filtering.
                    if (e.tripType === 'to_school') {
                        absent.add(sid);
                    }
                    statuses.set(sid, 'no_board');
                    break;
                case 'arrived_home':
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

        // Phase 2 auto-restore for return trips: if all students have to_home
        // events (boarding or no_board), skip to route phase.
        if (selectedTripType === 'to_home' && selectedPhase !== 'route') {
            const allStudentIds = new Set((dashboardData?.students || []).map(s => String(s._id)));
            const allResolved = allStudentIds.size > 0 && [...allStudentIds].every(id => statuses.has(id));
            if (allResolved) {
                setReturnPhase('route');
            } else if (selectedPhase === null) {
                setReturnPhase('checkin');
            }
        }
    };

    useEffect(() => {
        // Fetch today's server-side trip status to restore lock/resume state
        api.get('/driver/trip/today-status')
            .then(async ({ data }) => {
                if (data.success) {
                    setTodayTripStatus({ to_school: data.to_school, to_home: data.to_home });
                    // Auto-resume: if a trip is active, restore UI state
                    if (data.to_school?.status === 'active') {
                        setTripType('to_school');
                        setTripStarted(true);
                        if (data.to_school.routePath?.length > 0) {
                            setRoutePath(data.to_school.routePath.map(p => [p.lat, p.lng]));
                        }
                        // Hydrate with morning data so student statuses are restored
                        await fetchDashboardData('to_school', null);
                    } else if (data.to_home?.status === 'active') {
                        setTripType('to_home');
                        setTripStarted(true);
                        if (data.to_home.routePath?.length > 0) {
                            setRoutePath(data.to_home.routePath.map(p => [p.lat, p.lng]));
                        }
                        // Critical fix: re-fetch with to_home+route so studentStatuses
                        // gets populated BEFORE returnPhase='route' filters the list.
                        await fetchDashboardData('to_home', 'route');
                        setReturnPhase('route');
                    } else {
                        // No active trip — just fetch the default dashboard
                        await fetchDashboardData();
                    }
                } else {
                    await fetchDashboardData();
                }
            })
            .catch(async err => {
                console.warn('Could not fetch today trip status:', err);
                await fetchDashboardData();
            })
            .finally(() => setTodayStatusLoading(false));
    }, []);

    // Open the trip-type chooser modal. The actual OSRM/start-trip flow runs
    // only after the driver picks a direction in handleSelectTripType().
    const handleOpenTripTypeChooser = () => {
        if (!dashboardData?.bus || !dashboardData?.students?.length || !dashboardData?.school?.location) {
            return setError(t('driver.errors.missingData'));
        }
        setError('');
        setShowTripTypeModal(true);
    };

    // Driver picked a direction. We close the modal, persist the choice, and
    // (for return trips) enter Phase 1 (checkin) without OSRM yet.
    // Morning trips use the existing flow with immediate OSRM.
    const handleSelectTripType = async (selected) => {
        setShowTripTypeModal(false);
        setTripType(selected);
        setRouteOrder(new Map());
        setShowCompleted(false);
        setCurrentStudent(null);

        if (selected === 'to_home') {
            // Return trip: enter Phase 1 (checkin) — fetch all students
            setReturnPhase('checkin');
            setTripStarted(true); // Trip is "started" but in checkin mode
            await fetchDashboardData('to_home', 'checkin');
        } else {
            // Morning trip: use existing flow with immediate OSRM
            setReturnPhase(null);
            await fetchDashboardData(selected);
            await handleStartTrip();
        }
    };

    // Helper: did this student miss the morning trip?
    const hasMorningAbsence = (studentId) => {
        return (dashboardData?.todayEvents || []).some(
            e => e.event === 'no_board' && e.tripType === 'to_school' && String(e.student) === String(studentId)
        );
    };

    // Phase 1 → Phase 2 transition: start the route with boarded students only
    const handleStartRoute = async () => {
        if (!dashboardData?.bus || !dashboardData?.students?.length || !dashboardData?.school?.location) {
            return setError(t('driver.errors.missingData'));
        }

        setRouteLoading(true);

        try {
            // ─── Auto-resolve: bulk-mark unresolved morning-absent students as no_board ───
            const allStudents = dashboardData.students || [];
            const isResolved = (id) => studentStatuses.has(id);
            const pendingMorningAbsentees = allStudents.filter(
                s => !isResolved(s._id) && hasMorningAbsence(s._id)
            );

            if (pendingMorningAbsentees.length > 0) {
                const busId = dashboardData.bus._id;
                const results = await Promise.allSettled(
                    pendingMorningAbsentees.map(s =>
                        api.post('/driver/attendance/manual', {
                            studentId: s._id,
                            busId,
                            event: 'no_board',
                            tripType: 'to_home'
                        })
                    )
                );
                // Update local state for those that succeeded
                setStudentStatuses(prev => {
                    const next = new Map(prev);
                    pendingMorningAbsentees.forEach((s, i) => {
                        if (results[i].status === 'fulfilled') {
                            next.set(s._id, 'no_board');
                        }
                    });
                    return next;
                });
                setAbsentStudents(prev => {
                    const next = new Set(prev);
                    pendingMorningAbsentees.forEach((s, i) => {
                        if (results[i].status === 'fulfilled') next.add(s._id);
                    });
                    return next;
                });
            }

            setReturnPhase('route');

            // Filter to only boarded students for OSRM
            const boardedIds = [...studentStatuses.entries()]
                .filter(([_, status]) => status === 'boarded')
                .map(([id]) => id);
            const boardedStudents = (dashboardData.students || []).filter(s => boardedIds.includes(String(s._id)));

            if (boardedStudents.length === 0) {
                setError(t('driver.errors.noBoardedStudents'));
                setRouteLoading(false);
                setReturnPhase('checkin');
                return;
            }

            // Only consider boarded students with valid coordinates
            const validStudents = boardedStudents.filter(s => s.location?.coordinates?.[0] !== 0 && s.location?.coordinates?.[1] !== 0);

            if (validStudents.length === 0) {
                setError(t('driver.errors.noStudentsLocation'));
                setRouteLoading(false);
                setReturnPhase('checkin');
                return;
            }

            // ─── Build OSRM coordinate array for return trip ─────────
            // to_home: [school, ...studentHomes] (last student = destination)
            const fmt = ([lng, lat]) => `${lng},${lat}`;
            const school = dashboardData.school;
            const schoolLngLat  = school.location.coordinates;        // [lng, lat]
            const studentLngLat = validStudents.map(s => s.location.coordinates);

            const orderedCoords = [schoolLngLat, ...studentLngLat];
            const studentIndexOffset = 1; // students start at coord index 1
            const coordsString = orderedCoords.map(fmt).join(';');
            const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=false&source=first&destination=last&geometries=geojson&overview=full`;

            const { data: osrmData } = await axios.get(osrmUrl);

            if (osrmData.code === 'Ok' && osrmData.trips.length > 0) {
                const trip = osrmData.trips[0];
                const pathForMap    = trip.geometry.coordinates.map(c => [c[1], c[0]]);
                const pathForBackend = trip.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));

                setRoutePath(pathForMap);
                // Fix 4: anchor bus marker at route origin immediately — no GPS override
                setBusLocation({ lat: pathForMap[0][0], lng: pathForMap[0][1] });
                setOsrmMeta({
                    duration: Math.ceil(trip.duration / 60),
                    distance: (trip.distance / 1000).toFixed(1)
                });

                const orderMap = new Map();
                if (Array.isArray(osrmData.waypoints)) {
                    validStudents.forEach((s, i) => {
                        const wp = osrmData.waypoints[i + studentIndexOffset];
                        if (wp && typeof wp.waypoint_index === 'number') {
                            orderMap.set(String(s._id), wp.waypoint_index);
                        }
                    });
                }
                setRouteOrder(orderMap);

                try {
                    const result = await api.post('/driver/trip/start', { routePath: pathForBackend, tripType: 'to_home' });
                    if (result.data?.tripId && !result.data?.resumed) {
                        setTodayTripStatus(prev => ({ ...prev, to_home: { status: 'active', tripId: result.data.tripId, routePath: pathForBackend } }));
                    }
                } catch (saveErr) {
                    if (saveErr.response?.data?.code === 'TRIP_ALREADY_COMPLETED') {
                        setError(t('driver.errors.returnTripCompleted'));
                        setReturnPhase('checkin');
                        return;
                    }
                    console.warn(t('driver.errors.saveRouteBackendFailed'), saveErr);
                }
            } else {
                setError(t('driver.errors.osrmRouteFailed'));
                setReturnPhase('checkin');
            }
        } catch (err) {
            console.error('OSRM Route Error:', err);
            setError(t('driver.errors.routeDrawError'));
            setReturnPhase('checkin');
        } finally {
            setRouteLoading(false);
        }
    };

    const handleStartTrip = async () => {
        if (!dashboardData?.bus || !dashboardData?.students?.length || !dashboardData?.school?.location) {
            return setError(t('driver.errors.missingData'));
        }

        setTripStarted(true);
        setRouteLoading(true);

        try {
            const { students, school } = dashboardData;

            // Only consider students with valid coordinates
            const validStudents = students.filter(s => s.location?.coordinates?.[0] !== 0 && s.location?.coordinates?.[1] !== 0);

            if (validStudents.length === 0) {
                setError(t('driver.errors.noStudentsLocation'));
                setRouteLoading(false);
                return;
            }

            // ─── Build OSRM coordinate array per trip direction ─────────
            const fmt = ([lng, lat]) => `${lng},${lat}`;
            const schoolLngLat  = school.location.coordinates;
            const studentLngLat = validStudents.map(s => s.location.coordinates);

            let orderedCoords;
            if (tripType === 'to_home') {
                orderedCoords = [schoolLngLat, ...studentLngLat];
            } else {
                const driverLngLat = await getDriverCoordinate(schoolLngLat);
                orderedCoords = [driverLngLat, ...studentLngLat, schoolLngLat];
            }

            const studentIndexOffset = 1;
            const coordsString = orderedCoords.map(fmt).join(';');
            const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=false&source=first&destination=last&geometries=geojson&overview=full`;

            const { data: osrmData } = await axios.get(osrmUrl);

            if (osrmData.code === 'Ok' && osrmData.trips.length > 0) {
                const trip = osrmData.trips[0];
                const pathForMap    = trip.geometry.coordinates.map(c => [c[1], c[0]]);
                const pathForBackend = trip.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));

                setRoutePath(pathForMap);
                // Fix 4: anchor bus marker at route origin immediately — no GPS override
                setBusLocation({ lat: pathForMap[0][0], lng: pathForMap[0][1] });
                setOsrmMeta({
                    duration: Math.ceil(trip.duration / 60),
                    distance: (trip.distance / 1000).toFixed(1)
                });

                const orderMap = new Map();
                if (Array.isArray(osrmData.waypoints)) {
                    validStudents.forEach((s, i) => {
                        const wp = osrmData.waypoints[i + studentIndexOffset];
                        if (wp && typeof wp.waypoint_index === 'number') {
                            orderMap.set(String(s._id), wp.waypoint_index);
                        }
                    });
                }
                setRouteOrder(orderMap);

                try {
                    const result = await api.post('/driver/trip/start', { routePath: pathForBackend, tripType: tripType || 'to_school' });
                    if (result.data?.tripId && !result.data?.resumed) {
                        setTodayTripStatus(prev => ({ ...prev, [tripType || 'to_school']: { status: 'active', tripId: result.data.tripId, routePath: pathForBackend } }));
                    }
                } catch (saveErr) {
                    if (saveErr.response?.data?.code === 'TRIP_ALREADY_COMPLETED') {
                        setError(t('driver.errors.tripAlreadyCompleted'));
                        setTripStarted(false);
                        return;
                    }
                    console.warn(t('driver.errors.saveRouteBackendFailed'), saveErr);
                }
            } else {
                setError(t('driver.errors.osrmRouteFailed'));
            }
        } catch (err) {
            console.error('OSRM Route Error:', err);
            setError(t('driver.errors.routeDrawError'));
        } finally {
            setRouteLoading(false);
        }
    };

    const handleManualBoarding = async (studentId, recordedBy = 'manual') => {
        if (!dashboardData?.bus?._id) return;

        // Optimistic update BEFORE the API call so activeStudent shifts to the next
        // student immediately (critical for the simulator's stale-ref guard).
        setBoardedStudents(prev => { const s = new Set(prev); s.add(studentId); return s; });
        setStudentStatuses(prev => { const m = new Map(prev); m.set(studentId, 'boarded'); return m; });

        setMarkingAttendance(studentId);
        try {
            await api.post('/driver/attendance/manual', {
                studentId,
                busId: dashboardData.bus._id,
                event: 'boarding',
                tripType: tripType || 'to_school',
                recordedBy
            });
        } catch (err) {
            console.error('Manual boarding error:', err);
            setError(t('driver.errors.manualAttendanceFailed'));
            // Revert optimistic update on failure
            setBoardedStudents(prev => { const s = new Set(prev); s.delete(studentId); return s; });
            setStudentStatuses(prev => { const m = new Map(prev); m.delete(studentId); return m; });
        } finally {
            setMarkingAttendance(null);
        }
    };

    // Mark a student as "did not board" (morning trip only). Persists via the
    // attendance endpoint as 'no_board' so the return-trip refetch can filter
    // them out. Replaces the old 'absent' event for to_school trips.
    const handleMarkNoBoard = async (student) => {
        if (!dashboardData?.bus?._id || !student?._id) return;
        const studentId = student._id;

        setMarkingAttendance(studentId);
        try {
            await api.post('/driver/attendance/manual', {
                studentId,
                busId: dashboardData.bus._id,
                event: 'no_board',
                tripType: tripType || 'to_school'
            });
            setAbsentStudents(prev => {
                const next = new Set(prev);
                next.add(studentId);
                return next;
            });
            setStudentStatuses(prev => {
                const next = new Map(prev);
                next.set(studentId, 'no_board');
                return next;
            });
            // Notification side-effect (stub).
            notifyAbsent(student);
        } catch (err) {
            console.error('Mark no-board error:', err);
            setError(t('driver.errors.markNoBoardFailed'));
        } finally {
            setMarkingAttendance(null);
        }
    };

    // Undo a morning "did not board" status — deletes the no_board record
    // from the DB and removes the student from local resolved state so the
    // card returns to the pending list.
    const handleUndoNoBoard = async (student) => {
        if (!dashboardData?.bus?._id || !student?._id) return;
        const studentId = student._id;

        setMarkingAttendance(studentId);
        try {
            await api.delete('/driver/attendance/manual', {
                data: {
                    studentId,
                    busId: dashboardData.bus._id,
                    tripType: tripType || 'to_school'
                }
            });
            setAbsentStudents(prev => {
                const next = new Set(prev);
                next.delete(studentId);
                return next;
            });
            setStudentStatuses(prev => {
                const next = new Map(prev);
                next.delete(studentId);
                return next;
            });
        } catch (err) {
            console.error('Undo no-board error:', err);
            setError(t('driver.errors.undoNoBoardFailed'));
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
        const sid = String(student._id); // String Force

        // Optimistic update — activeStudent must shift BEFORE the API resolves
        // so the simulator's next tick sees the correct next student.
        setStudentStatuses(prev => { const m = new Map(prev); m.set(sid, event); return m; });

        setMarkingAttendance(sid);
        try {
            await api.post('/driver/attendance/manual', {
                studentId: sid,
                busId: dashboardData.bus._id,
                event,
                tripType: tripType || 'to_home'
            });
            if (event === 'no_receiver') notifyNoReceiver(student);
        } catch (err) {
            console.error('Return status error:', err);
            setError(t('driver.errors.statusUpdateFailed'));
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
    const { pendingList, completedList } = useMemo(() => {
        const allStudents = dashboardData?.students || [];

        // Phase-aware "resolved" check:
        //  - Phase 2 (route/drop-off): a `boarded` student is NOT resolved — they
        //    still need a drop-off action. Only arrived_home / no_receiver / no_board
        //    count as completed.
        //  - Phase 1 (checkin) and morning trip: any status counts as resolved.
        const isResolved = (rawId) => {
            const sid = String(rawId);
            const status = studentStatuses.get(sid);
            if (returnPhase === 'route') {
                return status === 'arrived_home' || status === 'no_receiver' || status === 'no_board';
            }
            return studentStatuses.has(sid) || boardedStudents.has(sid) || absentStudents.has(sid);
        };

        // Phase 2: hide students who never boarded — they don't appear in the
        // drop-off view at all (neither pending nor completed columns).
        const list = returnPhase === 'route'
            ? allStudents.filter(s => {
                const st = studentStatuses.get(String(s._id));
                return st === 'boarded' || st === 'arrived_home' || st === 'no_receiver';
            })
            : allStudents;

        const pending = list.filter(s => !isResolved(s._id));
        const completed = list.filter(s => isResolved(s._id));

        // Sort pending by OSRM waypoint_index — String keys guarantee reference-independent lookup.
        pending.sort((a, b) => {
            const ai = routeOrder.get(String(a._id)) ?? Number.POSITIVE_INFINITY;
            const bi = routeOrder.get(String(b._id)) ?? Number.POSITIVE_INFINITY;
            return ai - bi;
        });

        // pendingList contains ALL pending students sorted by routeOrder.
        // "Current student" is driven purely by 50 m proximity (currentStudent state),
        // not by route order, so activeStudent is not derived here.
        return { pendingList: pending, completedList: completed };
    }, [dashboardData, studentStatuses, boardedStudents, absentStudents, routeOrder, returnPhase]);

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

        // Check for morning no_board for warning badge in Phase 1
        const hasMorningNoBoard = (dashboardData?.todayEvents || []).some(
            e => e.event === 'no_board' && e.tripType === 'to_school' && String(e.student) === id
        );

        // In Phase 1 (checkin), suppress the "Active" highlight — all cards look the same.
        const suppressActive = returnPhase === 'checkin';

        // Simulator approach state
        const isApproaching = !isCompleted && String(id) === String(approachingId);

        // Container styling per mode
        const containerCls = isApproaching
            ? 'border-2 border-amber-400 bg-amber-50/60 shadow-md ring-2 ring-amber-200 ring-offset-1 animate-pulse'
            : isActive && !suppressActive
                ? 'border-2 border-primary-400 bg-primary-50/60 shadow-md ring-2 ring-primary-200 ring-offset-1'
                : isCompleted
                    ? 'border border-gray-100 bg-white opacity-60'
                    : 'border border-gray-100 bg-white shadow-sm';

        const indexBadgeCls = isApproaching
            ? 'bg-amber-500 text-white'
            : isActive && !suppressActive
                ? 'bg-primary-500 text-white'
                : isCompleted
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-blue-50 text-blue-600';

        return (
            <div key={id} className={`rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${containerCls}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold ${indexBadgeCls}`}>
                        {isCompleted
                            ? <CheckCircle2 size={18} />
                            : indexLabel}
                    </div>
                    <div className="min-w-0 text-start">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-800 truncate">{student.name}</p>
                            {isApproaching && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                    <Navigation2 size={10} />
                                    {t('parent.busApproaching')}
                                </span>
                            )}
                            {isActive && !suppressActive && !isApproaching && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-700 bg-white border border-primary-200 rounded-full px-2 py-0.5">
                                    <Sparkles size={10} />
                                    {t('driver.activeStudent')}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                            {student.grade && `${t('driver.grade', { grade: student.grade })} - `}{student.studentId}
                        </p>
                        {hasMorningNoBoard && returnPhase === 'checkin' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-800 bg-yellow-100 rounded-md px-2 py-0.5 mt-1">
                                <AlertTriangle size={11} />
                                {t('driver.morningAbsentBadge')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                    {isCompleted && pill && (
                        <span className={`text-xs px-3 py-1.5 rounded-lg font-bold ${pill.cls}`}>{pill.label}</span>
                    )}

                    {/* Undo no_board for morning trip */}
                    {isCompleted && tripType === 'to_school' && status === 'no_board' && tripStarted && (
                        <button
                            type="button"
                            onClick={() => handleUndoNoBoard(student)}
                            disabled={isMarking}
                            className="text-xs bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 px-2 py-1 rounded-lg font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50 border border-gray-200"
                        >
                            {isMarking ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                            {t('driver.undoNoBoard')}
                        </button>
                    )}

                    {/* Undo no_board for Phase 1 return trip */}
                    {isCompleted && returnPhase === 'checkin' && status === 'no_board' && tripStarted && (
                        <button
                            type="button"
                            onClick={() => handleUndoNoBoard(student)}
                            disabled={isMarking}
                            className="text-xs bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 px-2 py-1 rounded-lg font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50 border border-gray-200"
                        >
                            {isMarking ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                            {t('driver.undoNoBoard')}
                        </button>
                    )}

                    {/* Morning trip actions */}
                    {tripStarted && !isCompleted && tripType === 'to_school' && (
                        <>
                            <button
                                type="button"
                                onClick={() => handleManualBoarding(id)}
                                disabled={isMarking}
                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-gray-200"
                            >
                                {isMarking ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                {t('driver.markBoarding')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMarkNoBoard(student)}
                                disabled={isMarking}
                                className="text-xs bg-gray-50 hover:bg-amber-50 hover:text-amber-700 text-gray-700 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-gray-200"
                            >
                                <UserX size={12} />
                                {t('driver.markNoBoard')}
                            </button>
                        </>
                    )}

                    {/* Phase 1 return trip actions (checkin) */}
                    {tripStarted && !isCompleted && returnPhase === 'checkin' && tripType === 'to_home' && (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    // If the student missed the morning trip, ask for explicit confirmation via modal.
                                    if (hasMorningNoBoard) {
                                        setBoardingConfirmStudent(student);
                                        setBoardingConfirmOpen(true);
                                    } else {
                                        handleManualBoarding(id);
                                    }
                                }}
                                disabled={isMarking}
                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-gray-200"
                            >
                                {isMarking ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                {t('driver.markBoarding')}
                            </button>
                            {/* Hide [Did Not Board] for morning absentees — they're auto-resolved on phase transition */}
                            {!hasMorningNoBoard && (
                                <button
                                    type="button"
                                    onClick={() => handleMarkNoBoard(student)}
                                    disabled={isMarking}
                                    className="text-xs bg-gray-50 hover:bg-amber-50 hover:text-amber-700 text-gray-700 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-gray-200"
                                >
                                    <UserX size={12} />
                                    {t('driver.markNoBoard')}
                                </button>
                            )}
                        </>
                    )}

                    {/* Phase 2 return trip actions (route) */}
                    {tripStarted && !isCompleted && returnPhase === 'route' && tripType === 'to_home' && (
                        <>
                            <button
                                type="button"
                                onClick={() => handleReturnStatus(student, 'arrived_home')}
                                disabled={isMarking}
                                className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 border border-green-100"
                            >
                                <Home size={12} />
                                {t('driver.markDroppedOff')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setNoReceiverTarget(student); setNoReceiverAcknowledged(false); }}
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
                    {(() => {
                        if (tripType === 'to_home') {
                            const dropped = [...studentStatuses.values()].filter(
                                v => v === 'arrived_home' || v === 'no_receiver'
                            ).length;
                            const total = pendingList.length + dropped;
                            return t('driver.dropOffCount', { dropped, total });
                        }
                        return t('driver.studentCount', { boarded: boardedStudents.size, total: students?.length || 0 });
                    })()}
                </span>
            </div>

            {students?.length > 0 ? (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pb-4">
                    {/* Current student — only rendered when bus is within 50 m (NFC zone) */}
                    {currentStudent && renderStudentCard(currentStudent, 'active', 1)}

                    {/* All pending students in route order (current student filtered out to avoid duplicate) */}
                    {pendingList
                        .filter(s => !currentStudent || String(s._id) !== String(currentStudent._id))
                        .map((s, i) => renderStudentCard(s, 'pending', i + 2))}

                    {/* Empty pending state when everything is resolved */}
                    {!currentStudent && pendingList.length === 0 && completedList.length > 0 && (
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
            <div className={`max-w-3xl mx-auto bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-10 overflow-hidden relative ${!tripType ? 'h-fit' : 'pb-28'}`}>

                {/* Background accent */}
                <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-primary-50/50 to-transparent"></div>

                {/* Header — hidden in Zero State to reduce clutter */}
                {tripType && (
                    <div className="mb-8 border-b border-gray-100 pb-6 relative z-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                            <Bus size={28} strokeWidth={1.75} className="text-primary-500 sm:w-8 sm:h-8" />
                        </div>
                        <div className="text-center sm:text-start">
                            <h2 className="text-xl md:text-2xl text-gray-800 font-bold">{t('driver.dashboardTitleShort')}</h2>
                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-bold border border-gray-200">
                                <span className={`w-2 h-2 rounded-full ${bus ? 'bg-green-500' : 'bg-amber-400'}`}></span>
                                {bus ? t('driver.busNumber', { id: bus.busId }) : t('driver.noBus')}
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl font-bold flex items-center gap-2">
                        <AlertTriangle size={20} />
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl font-bold flex items-center gap-2 border border-green-100">
                        <CheckCircle size={20} />
                        {successMsg}
                    </div>
                )}

                {!tripType ? (
                    /* ─── Zero State: direct trip type selection ─── */
                    <div className="max-w-sm w-full mx-auto py-10 relative z-10 flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center gap-3 mb-6">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-gray-800 mb-1">{t('driver.welcomeTitle', { name: user?.name || '' })}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{t('driver.welcomeSubtitle')}</p>
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold border border-gray-200">
                                <span className={`w-2 h-2 rounded-full ${bus ? 'bg-green-500' : 'bg-amber-400'}`}></span>
                                {bus ? t('driver.busNumber', { id: bus.busId }) : t('driver.noBus')}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {/* Trip to School */}
                            {(() => {
                                const s = todayTripStatus.to_school;
                                const isCompleted = s?.status === 'completed';
                                const isActive    = s?.status === 'active';
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isCompleted) return;
                                            if (!dashboardData?.bus || !dashboardData?.students?.length || !dashboardData?.school?.location) {
                                                return setError(t('driver.errors.missingData'));
                                            }
                                            setError('');
                                            if (isActive) {
                                                // Resume: restore state without re-calling API
                                                setTripType('to_school');
                                                setTripStarted(true);
                                                if (s.routePath?.length > 0) setRoutePath(s.routePath.map(p => [p.lat, p.lng]));
                                            } else {
                                                handleSelectTripType('to_school');
                                            }
                                        }}
                                        disabled={!bus || !students?.length || isCompleted || todayStatusLoading}
                                        className={`w-full flex items-center justify-center gap-4 p-4 border-2 rounded-xl font-bold text-lg transition-all
                                            ${isCompleted
                                                ? 'bg-gray-100 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed'
                                                : isActive
                                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-400 hover:shadow-md cursor-pointer'
                                                    : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 hover:border-blue-400 hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                                            }`}
                                    >
                                        {isCompleted ? null : isActive ? <Play size={22} className="animate-pulse" /> : <School size={22} />}
                                        {isCompleted ? `✅ ${t('driver.tripToSchool')} (${t('driver.completedStatus')})` : isActive ? `🔄 ${t('driver.resumeTripToSchool')}` : t('driver.tripToSchool')}
                                    </button>
                                );
                            })()}

                            {/* Trip Back Home */}
                            {(() => {
                                const s = todayTripStatus.to_home;
                                const isCompleted = s?.status === 'completed';
                                const isActive    = s?.status === 'active';
                                const morningDone = todayTripStatus.to_school?.status === 'completed';
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isCompleted) return;
                                            if (!dashboardData?.bus || !dashboardData?.students?.length || !dashboardData?.school?.location) {
                                                return setError(t('driver.errors.missingData'));
                                            }
                                            setError('');
                                            if (isActive) {
                                                setTripType('to_home');
                                                setTripStarted(true);
                                                setReturnPhase('route');
                                                if (s.routePath?.length > 0) setRoutePath(s.routePath.map(p => [p.lat, p.lng]));
                                            } else {
                                                handleSelectTripType('to_home');
                                            }
                                        }}
                                        disabled={!bus || !students?.length || isCompleted || todayStatusLoading}
                                        className={`w-full flex items-center justify-center gap-4 p-4 border-2 rounded-xl font-bold text-lg transition-all
                                            ${isCompleted
                                                ? 'bg-gray-100 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed'
                                                : isActive
                                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-400 hover:shadow-md cursor-pointer'
                                                    : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400 hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                                            }`}
                                    >
                                        {isCompleted ? null : isActive ? <Play size={22} className="animate-pulse" /> : <Home size={22} />}
                                        {isCompleted ? `✅ ${t('driver.tripToHome')} (${t('driver.completedStatus')})` : isActive ? `🔄 ${t('driver.resumeTripToHome')}` : t('driver.tripToHome')}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col relative z-10 mt-8">
                        {/* Phase 1: Check-in Header (return trip only) */}
                        {returnPhase === 'checkin' && (
                            <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center">
                                        <Users size={24} strokeWidth={1.75} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{t('driver.phaseCheckin')}</h3>
                                        <p className="text-sm text-gray-500">{t('driver.phaseCheckinSubtitle')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                    <div className="text-sm text-gray-600">
                                        {t('driver.phaseSummary', {
                                            boarded: [...studentStatuses.values()].filter(s => s === 'boarded').length,
                                            didNotBoard: [...studentStatuses.values()].filter(s => s === 'no_board').length
                                        })}
                                    </div>
                                    <button
                                        onClick={handleStartRoute}
                                        disabled={routeLoading || (
                                            // Block only when there are unresolved students who are NOT
                                            // morning-absentees (those auto-resolve on transition).
                                            (students || []).some(s => !studentStatuses.has(s._id) && !hasMorningAbsence(s._id))
                                        )}
                                        className="px-6 py-3 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-500/20 flex items-center gap-2"
                                    >
                                        {routeLoading ? <Loader2 size={16} className="animate-spin" /> : <Navigation2 size={16} />}
                                        {t('driver.startRoute')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Phase 2: Route Header (return trip) or Morning Trip Header */}
                        {(returnPhase === 'route' || returnPhase === null) && (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center shrink-0">
                                        <Navigation2 size={20} className={returnPhase === 'route' ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-lg">{t('driver.tripActive')}</p>
                                        <p className="text-sm text-gray-500 mt-1 whitespace-nowrap">
                                            {osrmMeta ? t('driver.remainingTime', { duration: osrmMeta.duration, distance: osrmMeta.distance }) : t('driver.calculatingRoute')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        const currentTripType = tripType; // capture before reset
                                        try {
                                            const { data: endTripResult } = await api.post('/driver/trip/end', { tripType: currentTripType });
                                            if (endTripResult?.success === false) throw new Error(endTripResult?.message || 'End trip failed');
                                            if (currentTripType === 'to_school') {
                                                const atSchoolIds = new Set(
                                                    (dashboardData?.students || [])
                                                        .map(s => String(s._id))
                                                        .filter(sid => boardedStudents.has(sid))
                                                );
                                                setStudentStatuses(prev => {
                                                    const m = new Map(prev);
                                                    atSchoolIds.forEach(sid => m.set(sid, 'exit'));
                                                    return m;
                                                });
                                                setDashboardData(prev => prev ? ({
                                                    ...prev,
                                                    students: (prev.students || []).map(s =>
                                                        atSchoolIds.has(String(s._id))
                                                            ? { ...s, latestEvent: 'exit', status: 'at_school' }
                                                            : s
                                                    )
                                                }) : prev);
                                            }
                                        } catch (e) {
                                            console.warn(t('driver.errors.endTripBackendFailed'), e);
                                            setError(e?.response?.data?.message || e?.message || t('driver.errors.endTripFailed'));
                                            return;
                                        }
                                        // Update today status cache immediately so Zero State shows completed
                                        if (currentTripType) {
                                            setTodayTripStatus(prev => ({
                                                ...prev,
                                                [currentTripType]: { ...prev[currentTripType], status: 'completed' }
                                            }));
                                        }
                                        setTripType(null);
                                        setTripStarted(false);
                                        setReturnPhase(null);
                                        setRoutePath([]);
                                        setStudentStatuses(new Map());
                                        setRouteOrder(new Map());
                                        setOsrmMeta(null);
                                        setBoardedStudents(new Set());
                                        setAbsentStudents(new Set());
                                        setShowCompleted(false);
                                        setBusLocation(null);
                                        setApproachingId(null);
                                        setCurrentStudent(null);
                                        setSuccessMsg(t('driver.tripEndedSuccess'));
                                    }}
                                    disabled={completedList.length < (returnPhase === 'route' ? pendingList.length + completedList.length : students?.length || 0)}
                                    className="w-full sm:w-auto px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold transition-colors border border-red-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('driver.endTrip')}
                                    {completedList.length < (returnPhase === 'route' ? pendingList.length + completedList.length : students?.length || 0) && (
                                        <span className="ms-2 text-[10px] text-red-400 font-bold">
                                            {(returnPhase === 'route' ? pendingList.length : (students?.length || 0) - completedList.length)} {t('driver.unresolved')}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Map Container - hidden in Phase 1 checkin */}
                        {returnPhase !== 'checkin' && (
                            <div className="h-[420px] rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative mb-6">
                                <SharedBusMap
                                    routePath={routePath.map(([lat, lng]) => ({ lat, lng }))}
                                    school={dashboardData?.school}
                                    students={pendingList}
                                    busLocation={busLocation}
                                    routeLoading={routeLoading}
                                />
                            </div>
                        )}

                        {tripStarted && routePath.length > 0 && returnPhase !== 'checkin' && (
                            <TripSimulator
                                routePath={routePath}
                                students={pendingList}
                                activeStudent={currentStudent}
                                busId={dashboardData?.bus?._id}
                                tripType={tripType}
                                onBusMove={setBusLocation}
                                onApproach={setApproachingId}
                                onCurrentStudent={setCurrentStudent}
                                onNfcBoard={(studentId) => handleManualBoarding(studentId, 'NFC')}
                                onDropOff={(student, event) => handleReturnStatus(student, event)}
                            />
                        )}

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

            {/* No Receiver Modal */}
            {noReceiverTarget && (
                <NoReceiverModal
                    student={noReceiverTarget}
                    parentPhone={noReceiverTarget.parentId?.phone || null}
                    parentName={noReceiverTarget.parentId?.name || null}
                    schoolContacts={dashboardData?.school?.emergencyContacts || []}
                    onConfirm={() => {
                        handleReturnStatus(noReceiverTarget, 'no_receiver');
                        setNoReceiverTarget(null);
                    }}
                    onClose={() => setNoReceiverTarget(null)}
                />
            )}

            {/* Boarding Confirmation Modal for Morning-Absent Students */}
            {boardingConfirmOpen && boardingConfirmStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setBoardingConfirmOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                                <AlertTriangle size={24} strokeWidth={1.75} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 text-lg">{t('driver.confirmBoardingMorningAbsent')}</h3>
                                <p className="text-sm text-gray-500 mt-1">{boardingConfirmStudent.name} — {boardingConfirmStudent.studentId}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setBoardingConfirmOpen(false);
                                    setBoardingConfirmStudent(null);
                                }}
                                className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleManualBoarding(boardingConfirmStudent._id);
                                    setBoardingConfirmOpen(false);
                                    setBoardingConfirmStudent(null);
                                }}
                                className="px-5 py-2.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-colors text-sm shadow-md shadow-primary-500/20"
                            >
                                {t('common.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fixed Emergency Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-200 px-4 py-3 z-50 flex justify-center gap-4">
                <div className="max-w-md w-full flex gap-3 mx-auto">
                    {/* Contact School — calm / trustworthy blue */}
                    <button
                        type="button"
                        onClick={() => setShowContacts(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all font-bold rounded-lg border border-blue-100 text-sm"
                    >
                        <Phone size={18} strokeWidth={2} />
                        <span>{t('driver.contactSchool')}</span>
                        {(dashboardData?.school?.emergencyContacts?.length || 0) > 0 && (
                            <span className="ms-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] font-bold bg-white text-blue-600 rounded-full border border-blue-200 group-hover:bg-blue-100">
                                {dashboardData.school.emergencyContacts.length}
                            </span>
                        )}
                    </button>

                    {/* 911 — high-danger red, visually distinct */}
                    <a
                        href="tel:911"
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all font-bold rounded-lg border border-red-100 text-sm"
                    >
                        <PhoneCall size={18} strokeWidth={2} />
                        <span>{t('driver.callEmergency')}</span>
                    </a>
                </div>
            </div>

        </MainLayout>
    );
};

export default DriverDashboard;
