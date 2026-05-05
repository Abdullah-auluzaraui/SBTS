import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import { useTranslation } from 'react-i18next';
import api from '../services/apiService';
import { User, Map, Bus, GraduationCap, Clock, Bell, Phone, X, UserPlus, Loader2, AlertCircle, CheckCircle2, MapPin, UserX, CalendarClock, Info, HelpCircle } from 'lucide-react';
import LocationPicker from '../components/maps/LocationPicker';
import BusTrackingModal from '../components/maps/BusTrackingModal';
import DriverContactsModal from '../components/DriverContactsModal';

const ParentDashboard = () => {
    const { user, updateUser } = useAuth();
    const { t, i18n } = useTranslation();


    // ─── FE-S1-9: Add Another Child Modal State ────────────────────────
    const [showAddChildModal, setShowAddChildModal] = useState(false);
    const [linkStep, setLinkStep] = useState(1);
    const [childForm, setChildForm] = useState({ nationalId: '', dob: '', phone: user?.phone || '', otp: '', studentId: null });
    const [childLoading, setChildLoading] = useState(false);
    const [childError, setChildError] = useState('');
    const [childSuccess, setChildSuccess] = useState('');

    // ─── Maps Feature State ──────────────────────────────────────────
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [pickingLocationFor, setPickingLocationFor] = useState(null);
    const [deletionScheduledAt, setDeletionScheduledAt] = useState(null);

    // tracking: { busId, busName } | null — يفتح Modal التتبع
    const [tracking, setTracking] = useState(null);

    // Auto-select first student after fetch
    useEffect(() => {
        if (students.length > 0) {
            setSelectedStudent(students[0]);
        } else {
            setSelectedStudent(null);
        }
    }, [students]);

    // ─── Contact-School state ──────────────────────────────────────────
    // Contacts modal receives the full contacts array of the clicked ghost's
    // school. We keep it as null when closed, an array when open.
    const [contactsModal, setContactsModal] = useState(null);

    const fetchStudents = async () => {
        try {
            const { data } = await api.get('/parents/students');
            setStudents(data.students);
            setDeletionScheduledAt(data.account?.deletionScheduledAt || null);
        } catch (err) {
            console.error('Failed to fetch students:', err);
        } finally {
            setStudentsLoading(false);
        }
    };

    // Days-until helper used by the deletion countdown banner.
    // Returns 0 for "today", negative when the deadline has already passed.
    const daysUntil = (isoDate) => {
        if (!isoDate) return null;
        const ms = new Date(isoDate).getTime() - Date.now();
        return Math.ceil(ms / (24 * 60 * 60 * 1000));
    };

    const deletionDaysLeft = deletionScheduledAt ? daysUntil(deletionScheduledAt) : null;
    const deletionDateFormatted = deletionScheduledAt
        ? new Date(deletionScheduledAt).toLocaleDateString(
            (i18n.language || 'en').startsWith('ar') ? 'ar' : 'en',
            { year: 'numeric', month: 'long', day: 'numeric' }
          )
        : '';

    useEffect(() => { fetchStudents(); }, []);


    // ─── FE-S1-9: Handle linking another child (Two-Step) ──────────────
    const handleRequestLinking = async (e) => {
        e.preventDefault();
        setChildError(''); setChildSuccess(''); setChildLoading(true);
        try {
            const { data } = await api.post('/parents/link-request', {
                nationalId: childForm.nationalId,
                dob: childForm.dob,
                phone: childForm.phone
            });
            setChildForm(prev => ({ ...prev, studentId: data.studentId }));
            setLinkStep(2);
        } catch (err) {
            setChildError(err.response?.data?.message || t('parent.errors.generic'));
        } finally {
            setChildLoading(false);
        }
    };

    const handleVerifyLinking = async (e) => {
        e.preventDefault();
        setChildError(''); setChildSuccess(''); setChildLoading(true);
        try {
            const { data } = await api.post('/parents/link-verify', {
                phone: childForm.phone,
                otp: childForm.otp,
                studentId: childForm.studentId
            });
            setChildSuccess(t('parent.linkedSuccess', { name: data.student.name }));
            fetchStudents();
            // Persist the phone in the local user session if it was just set for the first time
            if (data.phone && !user?.phone) updateUser({ phone: data.phone });
            setTimeout(() => {
                setShowAddChildModal(false);
                setLinkStep(1);
                setChildForm({ nationalId: '', dob: '', phone: user?.phone || '', otp: '', studentId: null });
                setChildSuccess('');
            }, 2000);
        } catch (err) {
            setChildError(err.response?.data?.message || t('parent.errors.wrongOtp'));
        } finally {
            setChildLoading(false);
        }
    };

    const handleLocationSaved = (position) => {
        setPickingLocationFor(null);
        fetchStudents(); // Refresh students to get new coordinates
    };

    const getStatusBadgeProps = (event, assignedBus) => {
        switch (event) {
            case 'boarding':
                return { text: t('status.on_bus'), bgClass: 'bg-green-50 text-green-700 border-green-200', dotClass: 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse' };
            case 'exit':
                return { text: t('status.arrived_school'), bgClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-500' };
            case 'arrived_home':
                return { text: t('status.at_home'), bgClass: 'bg-gray-100 text-gray-700 border-gray-200', dotClass: 'bg-gray-500' };
            case 'no_board':
                return { text: t('status.did_not_board'), bgClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-500' };
            case 'no_receiver':
                return { text: t('status.no_receiver'), bgClass: 'bg-red-50 text-red-700 border-red-200', dotClass: 'bg-red-500 animate-pulse' };
            default:
                return assignedBus 
                    ? { text: t('status.waiting_bus'), bgClass: 'bg-gray-50 text-gray-600 border-gray-200', dotClass: 'bg-gray-400' }
                    : { text: t('status.not_assigned'), bgClass: 'bg-gray-50 text-gray-500 border-gray-200', dotClass: 'bg-gray-300' };
        }
    };

    return (
        <MainLayout onRefreshRequired={fetchStudents}>
            <div className="max-w-4xl mx-auto bg-white border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-10 overflow-hidden relative min-h-[85vh] lg:min-h-0">

                <div className="absolute top-0 right-0 w-full h-40 bg-gradient-to-b from-primary-50/70 to-transparent pointer-events-none"></div>

                {/* Welcome Message */}
                <div className="mb-8 border-b border-gray-100 pb-6 relative z-10 flex items-center gap-4">
                    <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
                        <User size={32} strokeWidth={1.75} className="text-primary-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl text-gray-800 font-bold">
                            {t('parent.welcome', { name: user?.name })}
                        </h2>
                        <p className="text-gray-500 mt-1">{t('parent.subtitle')}</p>
                    </div>
                </div>

                {/* Account Deletion Countdown Banner */}
                {deletionScheduledAt && deletionDaysLeft !== null && (
                    <div className="mb-6 relative z-10 p-5 rounded-2xl border bg-red-50 border-red-100 flex items-start gap-4">
                        <div className="w-11 h-11 shrink-0 rounded-xl bg-red-100 flex items-center justify-center">
                            <CalendarClock size={22} className="text-red-600" />
                        </div>
                        <div className="min-w-0 flex-1 text-start">
                            <p className="font-bold text-red-800 text-sm">{t('parent.deletionScheduledTitle')}</p>
                            <p className="text-sm text-red-700 mt-1">
                                {deletionDaysLeft <= 0
                                    ? t('parent.deletionScheduledToday', { date: deletionDateFormatted })
                                    : t('parent.deletionScheduledMessage', { count: deletionDaysLeft, days: deletionDaysLeft, date: deletionDateFormatted })}
                            </p>
                            <p className="text-xs text-red-600/80 mt-2 flex items-start gap-1.5">
                                <Info size={12} className="mt-0.5 shrink-0" />
                                <span>{t('parent.deletionCancelHint')}</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Student Selector Tabs */}
                <div className="w-full flex items-center overflow-x-auto hide-scrollbar gap-3 pb-4 mb-6 border-b border-gray-100">
                    {studentsLoading ? (
                        <div className="flex items-center justify-center p-4 w-full text-primary-500">
                            <Loader2 size={20} className="animate-spin" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center p-4 w-full text-gray-500 text-sm">
                            {t('parent.noStudentsLinked')}
                        </div>
                    ) : (
                        students.map(student => {
                            const isGhost = student.linkStatus === 'UNLINKED';
                            const isActive = selectedStudent?._id === student._id;
                            const onBus = student.assignedBus;
                            return (
                                <button
                                    key={student._id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all border ${
                                        isActive
                                            ? 'bg-primary-500 text-white border-primary-600 shadow-md shadow-primary-500/20'
                                            : isGhost
                                                ? 'bg-gray-100 text-gray-500 border-gray-200'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${onBus ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                                    {student.name}
                                </button>
                            );
                        })
                    )}

                    {/* Add Student Button (compact circular) */}
                    <button
                        onClick={() => {
                            setShowAddChildModal(true);
                            setLinkStep(1);
                            setChildForm(prev => ({ ...prev, phone: user?.phone || '' }));
                            setChildError('');
                            setChildSuccess('');
                        }}
                        className="w-10 h-10 shrink-0 rounded-full bg-primary-50 text-primary-600 border-2 border-primary-100 border-dashed flex items-center justify-center hover:bg-primary-100 transition-colors"
                    >
                        <UserPlus size={18} strokeWidth={2} />
                    </button>
                </div>

                {/* Active Student Detail View */}
                {selectedStudent && (
                    <div className="relative z-10 space-y-6">
                        

                        {/* Student Card */}
                        {(() => {
                            const isGhost = selectedStudent.linkStatus === 'UNLINKED';
                            return (
                                <div className={`flex flex-col gap-4 px-6 py-6 border rounded-2xl transition-colors ${isGhost
                                    ? 'bg-gray-100/70 border-gray-200'
                                    : 'bg-gray-50 border-gray-100'
                                }`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 border rounded-full flex items-center justify-center shadow-sm shrink-0 ${isGhost ? 'bg-gray-200 border-gray-300' : 'bg-white border-gray-200'}`}>
                                                {isGhost
                                                    ? <UserX size={20} className="text-gray-400" />
                                                    : <span className="text-gray-500 font-bold text-xl">{selectedStudent.name.charAt(0)}</span>
                                                }
                                            </div>
                                            <div className="text-start">
                                                <span className={`block font-bold text-base mb-1 ${isGhost ? 'text-gray-500' : 'text-gray-700'}`}>{selectedStudent.name}</span>
                                                {isGhost ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-200 border border-gray-300 rounded-full px-2 py-0.5">
                                                        <UserX size={10} />
                                                        {t('parent.ghostBadge')}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-500 font-medium bg-white px-2 py-0.5 rounded border border-gray-200">
                                                        {selectedStudent.assignedBus ? t('parent.busAssigned', { busId: selectedStudent.assignedBus.busId }) : t('parent.notAssigned')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {!isGhost && (() => {
                                            const badge = getStatusBadgeProps(selectedStudent.latestEvent, selectedStudent.assignedBus);
                                            return (
                                                <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm font-bold text-sm ${badge.bgClass}`}>
                                                    <span className={`w-2.5 h-2.5 rounded-full ${badge.dotClass}`}></span>
                                                    {badge.text}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Ghost card: Contact Admin */}
                                    {isGhost ? (
                                        <div className="p-4 rounded-xl bg-white border border-dashed border-gray-300 space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <span className="text-[11px] text-gray-500 inline-flex items-center gap-1.5 text-start">
                                                    <HelpCircle size={12} />
                                                    {t('parent.unlinkContactAdmin')}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setContactsModal(selectedStudent.school?.emergencyContacts || [])}
                                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-100 transition-colors self-start sm:self-auto"
                                                >
                                                    <Phone size={14} />
                                                    {t('parent.contactAdmin')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Driver Info */}
                                            {selectedStudent.assignedBus?.driver && (
                                                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                                            <User size={14} className="text-gray-500" />
                                                        </div>
                                                        <div className="flex flex-col leading-tight">
                                                            <span className="text-[10px] text-gray-500 font-normal">{t('parent.driver')}</span>
                                                            <span className="text-xs font-bold text-gray-800">{selectedStudent.assignedBus.driver.name}</span>
                                                        </div>
                                                    </div>
                                                    {selectedStudent.assignedBus.driver.phone ? (
                                                        <a
                                                            href={`tel:${selectedStudent.assignedBus.driver.phone}`}
                                                            className="flex items-center justify-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 shadow-sm font-bold text-xs hover:bg-green-100 transition-colors"
                                                        >
                                                            <Phone size={14} strokeWidth={2} />
                                                            {t('parent.call')}
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">{t('parent.noPhone')}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                                {/* Track Bus Button */}
                                                <button
                                                    disabled={!selectedStudent.assignedBus}
                                                    onClick={() => selectedStudent.assignedBus && setTracking({
                                                        busId: selectedStudent.assignedBus._id,
                                                        busName: selectedStudent.assignedBus.busId
                                                    })}
                                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${selectedStudent.assignedBus
                                                        ? 'bg-primary-500 text-white border border-primary-600 hover:bg-primary-600 shadow-md shadow-primary-500/20'
                                                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                                        }`}
                                                >
                                                    <Map size={18} strokeWidth={2} />
                                                    {t('parent.trackBus')}
                                                </button>
                                                
                                                {/* Update Home Button */}
                                                <button
                                                    onClick={() => setPickingLocationFor(selectedStudent)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                                                >
                                                    <MapPin size={18} strokeWidth={2} />
                                                    {t('parent.updateHome')}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

            </div>

            {/* ─── FE-S1-9: Add Another Child Modal ─────────────────────────── */}
            {showAddChildModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddChildModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowAddChildModal(false)}
                            className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={18} />
                        </button>

                        {linkStep === 1 ? (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <UserPlus size={28} strokeWidth={1.75} className="text-primary-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">{t('parent.addStudentTitle')}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{t('parent.addStudentSubtitle')}</p>
                                </div>

                                <form onSubmit={handleRequestLinking} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-gray-700 font-bold text-sm px-1">{t('parent.nationalId')}</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-sans text-left"
                                                dir="ltr"
                                                value={childForm.nationalId}
                                                onChange={(e) => setChildForm({ ...childForm, nationalId: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-gray-700 font-bold text-sm px-1">{t('parent.dob')}</label>
                                            <input
                                                type="date"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                                value={childForm.dob}
                                                onChange={(e) => setChildForm({ ...childForm, dob: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {user?.phone ? (
                                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                            <span className="text-gray-500 text-sm">{t('parent.sendCodeTo')}</span>
                                            <span className="font-bold text-gray-800 font-sans text-left" dir="ltr">{user.phone}</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <label className="block text-gray-700 font-bold text-sm px-1">{t('parent.phoneForCode')}</label>
                                            <input
                                                type="tel"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-sans text-left"
                                                dir="ltr"
                                                value={childForm.phone}
                                                onChange={(e) => setChildForm({ ...childForm, phone: e.target.value })}
                                                required
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={childLoading}
                                        className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-2 ${childLoading
                                            ? 'opacity-70 cursor-not-allowed shadow-none'
                                            : 'hover:bg-primary-600 shadow-primary-500/30 transform hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {childLoading && <Loader2 size={20} className="animate-spin" />}
                                        <span>{childLoading ? t('parent.matching') : t('parent.matchData')}</span>
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center animate-fade-in-up">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-green-100">
                                    <CheckCircle2 size={30} className="text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">{t('parent.linkConfirmTitle')}</h3>
                                <p className="text-gray-500 text-sm mt-2 mb-6 leading-relaxed">
                                    {t('parent.otpSentTo')} <span className="font-bold text-gray-800" dir="ltr">{childForm.phone}</span>
                                </p>

                                <form onSubmit={handleVerifyLinking} className="space-y-6">
                                    <div className="flex justify-center">
                                        <input
                                            type="text"
                                            maxLength="6"
                                            className="w-48 text-center text-3xl tracking-widest px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-0 focus:border-green-500 transition-all font-mono"
                                            placeholder="------"
                                            dir="ltr"
                                            value={childForm.otp}
                                            onChange={(e) => setChildForm({ ...childForm, otp: e.target.value.replace(/\D/g, '') })}
                                            autoFocus
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={childLoading || childForm.otp.length !== 6}
                                        className={`w-full bg-green-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-4 ${
                                            (childLoading || childForm.otp.length !== 6)
                                            ? 'opacity-70 cursor-not-allowed shadow-none'
                                            : 'hover:bg-green-600 shadow-green-500/30 transform hover:-translate-y-0.5'
                                        }`}
                                    >
                                        {childLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                                        <span>{childLoading ? t('parent.confirming') : t('parent.confirmLink')}</span>
                                    </button>

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setLinkStep(1)}
                                            className="text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            {t('parent.editData')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Error */}
                        {childError && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-sm text-red-700 flex items-start gap-2">
                                    <AlertCircle size={16} strokeWidth={2} className="text-red-500 mt-0.5 shrink-0" />
                                    <span className="font-semibold">{childError}</span>
                                </p>
                            </div>
                        )}

                        {/* Success */}
                        {childSuccess && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl">
                                <p className="text-sm text-green-700 flex items-start gap-2">
                                    <CheckCircle2 size={16} strokeWidth={2} className="text-green-500 mt-0.5 shrink-0" />
                                    <span className="font-semibold">{childSuccess}</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Map Location Picker Modal ──────────────────────── */}
            {pickingLocationFor && (
                <LocationPicker
                    student={pickingLocationFor}
                    onClose={() => setPickingLocationFor(null)}
                    onSaved={handleLocationSaved}
                />
            )}

            {/* ─── Bus Tracking Modal ────────────────────────────────── */}
            {tracking && (
                <BusTrackingModal
                    busId={tracking.busId}
                    busName={tracking.busName}
                    onClose={() => setTracking(null)}
                />
            )}

            {/* ─── Internal School Contacts (reused from Driver Dashboard) ─── */}
            {contactsModal !== null && (
                <DriverContactsModal
                    contacts={contactsModal}
                    onClose={() => setContactsModal(null)}
                />
            )}
        </MainLayout>
    );
};

export default ParentDashboard;
