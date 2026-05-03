import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Zap, Radio } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { haversineMeters, pointToSegmentMeters } from '../utils/haversine';
import api from '../services/apiService';

const APPROACH_THRESHOLD = 400; // metres — pulsing amber ring, sim continues
const BOARDING_THRESHOLD = 80;  // metres — NFC fire, sim pauses 1.5 s
const TICK_MS            = 300; // interval cadence (ms)

// Fixed advance steps per speed setting (indices per tick)
const SPEED_STEPS = { 1: 1, 5: 3, 10: 6 };

const TripSimulator = ({
    routePath,         // [[lat, lng]] — already swapped by DriverDashboard from OSRM
    students,          // ALL currently unboarded students [{_id, name, location:{coordinates:[lng,lat]}}]
    activeStudent,     // kept for backward compat — NOT used for proximity
    busId,
    tripType,          // 'to_school' | 'to_home'
    onBusMove,         // fn({ lat, lng })
    onApproach,        // fn(studentId | null)
    onNfcBoard,        // fn(studentId)
    onDropOff,         // fn(student, event)
    onCurrentStudent,  // fn(student | null) — null initially, set when bus enters 50 m radius
}) => {
    const { t } = useTranslation();
    const [isRunning, setIsRunning]         = useState(false);
    const [simSpeed, setSimSpeed]           = useState(1);
    const [simProgress, setSimProgress]     = useState(0);
    const [nfcFlashStudent, setNfcFlashStudent] = useState(null);

    // ── Mutable refs (avoid stale closures inside setInterval) ────────────────
    const isRunningRef         = useRef(false);
    const simIndexRef          = useRef(0);
    const intervalRef          = useRef(null);
    const boardingInProgressRef = useRef(false);
    const boardedRef           = useRef(new Set()); // guard: prevent double-firing same student
    const tickCountRef         = useRef(0);
    const lastApproachingRef   = useRef(null);
    const mountedRef           = useRef(true);
    const tickRef              = useRef(null); // holds the latest tick fn, set every render
    const lastCurrentStudentRef = useRef(null); // tracks last student passed to onCurrentStudent
    const returnBoardingSignatureRef = useRef(null);
    const returnBoardingTimeoutsRef  = useRef([]);

    // Prop mirrors — always-fresh inside the perpetual interval
    const studentsRef          = useRef(students ?? []);
    const onCurrentStudentRef  = useRef(onCurrentStudent);
    const onBusMoveRef  = useRef(onBusMove);
    const onApproachRef = useRef(onApproach);
    const onNfcBoardRef = useRef(onNfcBoard);
    const onDropOffRef  = useRef(onDropOff);
    const simSpeedRef   = useRef(simSpeed);
    const tripTypeRef   = useRef(tripType);

    useEffect(() => { studentsRef.current         = students ?? [];   }, [students]);
    useEffect(() => { onCurrentStudentRef.current  = onCurrentStudent; }, [onCurrentStudent]);
    useEffect(() => { onBusMoveRef.current  = onBusMove;      }, [onBusMove]);
    useEffect(() => { onApproachRef.current = onApproach;     }, [onApproach]);
    useEffect(() => { onNfcBoardRef.current = onNfcBoard;     }, [onNfcBoard]);
    useEffect(() => { onDropOffRef.current  = onDropOff;      }, [onDropOff]);
    useEffect(() => { simSpeedRef.current   = simSpeed;       }, [simSpeed]);
    useEffect(() => { tripTypeRef.current   = tripType;       }, [tripType]);

    useEffect(() => () => {
        mountedRef.current = false;
        returnBoardingTimeoutsRef.current.forEach(clearTimeout);
        returnBoardingTimeoutsRef.current = [];
    }, []);

    useEffect(() => {
        if (tripType !== 'to_home' || routePath.length === 0 || !Array.isArray(students) || students.length === 0) return;

        const eligible = students.filter(s => s?._id && s.location?.coordinates);
        const signature = `${routePath.length}:${eligible.map(s => String(s._id)).join('|')}`;
        if (returnBoardingSignatureRef.current === signature) return;
        returnBoardingSignatureRef.current = signature;

        returnBoardingTimeoutsRef.current.forEach(clearTimeout);
        returnBoardingTimeoutsRef.current = [];

        eligible.forEach((student, index) => {
            const sid = String(student._id);
            const scanTimer = setTimeout(() => {
                if (!mountedRef.current) return;
                setNfcFlashStudent(student);
                onNfcBoardRef.current?.(sid);

                const clearTimer = setTimeout(() => {
                    if (!mountedRef.current) return;
                    setNfcFlashStudent(current => String(current?._id || '') === sid ? null : current);
                }, 550);
                returnBoardingTimeoutsRef.current.push(clearTimer);
            }, index * 700);
            returnBoardingTimeoutsRef.current.push(scanTimer);
        });
    }, [tripType, routePath, students]);


    // ── On routePath arrival: snap bus to start of route ─────────────────────
    useEffect(() => {
        if (routePath.length > 0) {
            const [lat, lng] = routePath[0];
            onBusMoveRef.current({ lat, lng });
            simIndexRef.current = 0;
            setSimProgress(0);
            setIsRunning(false);
            isRunningRef.current = false;
            boardingInProgressRef.current = false;
            boardedRef.current.clear();
        }
    }, [routePath]);

    // ── tickRef: updated every render — always has fresh prop closures ──────────
    tickRef.current = () => {
        if (!isRunningRef.current) return;

        const total = routePath.length;
        if (total === 0) return;

        const advance  = SPEED_STEPS[simSpeedRef.current] ?? 1;
        const prevIdx  = simIndexRef.current;                                        // segment start A
        simIndexRef.current = Math.min(simIndexRef.current + advance, total - 1);

        const idx          = simIndexRef.current;                                    // segment end B
        const [lat,  lng]  = routePath[idx];
        const [aLat, aLng] = routePath[prevIdx]; // previous position — forms A→B segment

        // 1. Move bus marker
        onBusMoveRef.current({ lat, lng });
        setSimProgress(Math.round((idx / (total - 1)) * 100));

        // 2. Debounced backend write every 5 ticks
        tickCountRef.current += 1;
        if (tickCountRef.current % 5 === 0) {
            api.patch('/driver/trip/location', { lat, lng }).catch(() => {});
        }

        // 3. Global spatial scan — check EVERY unboarded student, not just the route-order one
        const unboarded = studentsRef.current.filter(
            s => s.location?.coordinates && !boardedRef.current.has(String(s._id))
        );

        // 3a. Boarding check: segment A→B sweep catches students even when nodes are sparse
        const boardingTarget = unboarded.find(s => {
            const [sLng, sLat] = s.location.coordinates;
            return pointToSegmentMeters(sLat, sLng, aLat, aLng, lat, lng) <= BOARDING_THRESHOLD;
        });

        if (boardingTarget) {
            const sid = String(boardingTarget._id);
            boardedRef.current.add(sid); // guard: prevent double-fire, applied before any async

            if (lastApproachingRef.current !== null) {
                lastApproachingRef.current = null;
                onApproachRef.current(null);
            }

            // Fire-and-forget — interval is NEVER paused or stopped here
            lastCurrentStudentRef.current = boardingTarget;
            setNfcFlashStudent(boardingTarget);
            onCurrentStudentRef.current?.(boardingTarget);
            if (tripTypeRef.current === 'to_school') {
                onNfcBoardRef.current(sid);
            } else {
                onDropOffRef.current(boardingTarget, 'arrived_home');
            }

            // Clear the UI flash after 1.5 s — does NOT affect interval control
            setTimeout(() => {
                if (!mountedRef.current) return;
                lastCurrentStudentRef.current = null;
                setNfcFlashStudent(null);
                onCurrentStudentRef.current?.(null);
            }, 1500);
            // NO return — bus continues advancing along the route
        }

        // Staleness guard: if bus has moved > BOARDING_THRESHOLD from the last current student,
        // clear the parent's currentStudent state immediately (don't wait for the 1.5 s timeout)
        if (lastCurrentStudentRef.current?.location?.coordinates) {
            const [csLng, csLat] = lastCurrentStudentRef.current.location.coordinates;
            if (haversineMeters(lat, lng, csLat, csLng) > BOARDING_THRESHOLD) {
                lastCurrentStudentRef.current = null;
                onCurrentStudentRef.current?.(null);
            }
        }

        // 3b. Approach ring: nearest unboarded student within APPROACH_THRESHOLD.
        // Recompute after potential boarding so just-boarded student is excluded.
        const afterBoarding = studentsRef.current.filter(
            s => s.location?.coordinates && !boardedRef.current.has(String(s._id))
        );
        let nearestStudent = null;
        let nearestDist    = Infinity;
        for (const s of afterBoarding) {
            const [sLng, sLat] = s.location.coordinates;
            const d = haversineMeters(lat, lng, sLat, sLng);
            if (d < nearestDist) { nearestDist = d; nearestStudent = s; }
        }

        if (nearestStudent && nearestDist < APPROACH_THRESHOLD) {
            const sid = String(nearestStudent._id);
            if (lastApproachingRef.current !== sid) {
                lastApproachingRef.current = sid;
                onApproachRef.current(nearestStudent._id);
            }
        } else if (lastApproachingRef.current !== null) {
            lastApproachingRef.current = null;
            onApproachRef.current(null);
        }

        // 4. End of route
        if (idx >= total - 1) {
            isRunningRef.current = false;
            setIsRunning(false);
        }
    };

    // ── Perpetual interval — created ONCE on mount, NEVER recreated ───────────
    // React state changes cannot kill this interval. isRunningRef controls execution.
    useEffect(() => {
        const id = setInterval(() => tickRef.current?.(), TICK_MS);
        return () => clearInterval(id);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const isComplete = simProgress >= 100;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-4">
            {/* NFC Flash Banner */}
            {nfcFlashStudent && (
                <div className="mb-3 flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm animate-pulse">
                    <Radio size={16} />
                    <span>📡 {t('simulator.card_scanned')} {nfcFlashStudent.name}</span>
                </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
                {/* Play / Pause */}
                <button
                    onClick={() => {
                        const next = !isRunning;
                        isRunningRef.current = next;
                        setIsRunning(next);
                    }}
                    disabled={routePath.length === 0 || isComplete}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-primary-500/20"
                >
                    {isRunning ? <Pause size={14} /> : <Play size={14} />}
                    {isComplete ? t('simulator.trip_completed') : isRunning ? t('simulator.pause') : t('simulator.start')}
                </button>

                {/* Speed selector */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                    {[1, 5, 10].map(s => (
                        <button
                            key={s}
                            onClick={() => setSimSpeed(s)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${simSpeed === s ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {s}x
                        </button>
                    ))}
                </div>

                {/* Sim mode badge */}
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                    <Zap size={11} />
                    {t('simulator.mode')}
                </span>

                {/* Progress label */}
                <span className="ms-auto text-xs text-gray-500 font-mono">{simProgress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary-400 rounded-full transition-all duration-100"
                    style={{ width: `${simProgress}%` }}
                />
            </div>
        </div>
    );
};

export default TripSimulator;
