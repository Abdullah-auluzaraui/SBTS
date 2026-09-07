import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import { useTranslation } from 'react-i18next';
import api from '../services/apiService';
import {
    Shield, School, Users, Plus, X, Loader2, AlertCircle, CheckCircle2,
    ToggleLeft, ToggleRight, Copy, RefreshCw, Bus, Link2, Clock,
    Search, ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react';


interface School {
  _id: string;
  name: string;
  schoolId: string;
  studentCount: number;
  busCount: number;
  invitationStatus: 'accepted' | 'pending' | 'expired' | 'none';
  isActive: boolean;
  admin?: {
    name: string;
  } | null;
}

interface InviteForm {
  schoolName: string;
  contactEmail: string;
  contactPhone: string;
}

interface InviteSuccess {
  schoolId: string;
  schoolName: string;
  link: string;
  email: string;
}

const SuperAdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();

    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'expired' | 'disabled'>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 8;

    const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
    const [inviteForm, setInviteForm] = useState<InviteForm>({ schoolName: '', contactEmail: '', contactPhone: '' });
    const [inviteLoading, setInviteLoading] = useState<boolean>(false);
    const [inviteError, setInviteError] = useState<string>('');
    const [inviteSuccess, setInviteSuccess] = useState<InviteSuccess | null>(null);

    const [resendModal, setResendModal] = useState<string | null>(null);
    const [resendResult, setResendResult] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState<boolean>(false);

    const [copied, setCopied] = useState<boolean>(false);

    const fetchSchools = async () => {
        try {
            // Default to all=true so SuperAdmin has full visibility
            const { data } = await api.get('/super/schools?all=true');
            setSchools(data.schools);
        } catch (err: any) {
            console.error('Failed to fetch schools:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSchools(); }, []);

    const fullLink = (path: string) => `${window.location.origin}${path}`;

    const copyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError('');
        setInviteSuccess(null);
        setInviteLoading(true);
        try {
            const { data } = await api.post('/super/invitations', inviteForm);
            setInviteSuccess({
                schoolId: data.school.schoolId,
                schoolName: data.school.name,
                link: fullLink(data.invitation.link),
                email: data.invitation.email
            });
            setInviteForm({ schoolName: '', contactEmail: '', contactPhone: '' });
            fetchSchools();
        } catch (err: any) {
            setInviteError(err.response?.data?.message || t('superadmin.errors.createError'));
        } finally {
            setInviteLoading(false);
        }
    };

    const handleToggle = async (schoolId: string) => {
        try {
            await api.patch(`/super/schools/${schoolId}/status`);
            fetchSchools();
        } catch (err: any) {
            console.error('Toggle failed:', err);
        }
    };

    const handleResend = async (schoolId: string) => {
        setResendLoading(true);
        setResendResult(null);
        try {
            const { data } = await api.post(`/super/invitations/${schoolId}/resend`);
            setResendResult(fullLink(data.invitation.link));
        } catch (err: any) {
            setResendResult('خطأ: ' + (err.response?.data?.message || 'فشل إعادة الإرسال'));
        } finally {
            setResendLoading(false);
        }
    };

    const statusBadge = (status: 'accepted' | 'pending' | 'expired' | 'none') => {
        const map = {
            accepted: { label: t('superadmin.statusAccepted'), classes: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
            pending: { label: t('superadmin.statusPending'), classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
            expired: { label: t('superadmin.statusExpired'), classes: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-400' },
            none: { label: t('superadmin.statusNone'), classes: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-400' }
        };
        const s = map[status] || map.none;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s.classes}`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`}></span>
                {s.label}
            </span>
        );
    };

    // Filter counts for quick stats - 100% distinct categories
    const counts = {
        all: schools.length,
        active: schools.filter(s => s.isActive && s.invitationStatus === 'accepted').length,
        pending: schools.filter(s => s.invitationStatus === 'pending').length,
        expired: schools.filter(s => s.invitationStatus === 'expired').length,
        disabled: schools.filter(s => !s.isActive && s.invitationStatus === 'accepted').length,
    };

    // Filter schools based on active tab and search query
    const filteredSchools = schools.filter(s => {
        // Tab Status Filter
        if (statusFilter === 'active') {
            if (!s.isActive || s.invitationStatus !== 'accepted') return false;
        } else if (statusFilter === 'pending') {
            if (s.invitationStatus !== 'pending') return false;
        } else if (statusFilter === 'expired') {
            if (s.invitationStatus !== 'expired') return false;
        } else if (statusFilter === 'disabled') {
            if (s.isActive || s.invitationStatus !== 'accepted') return false;
        }

        // Search Term Filter
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            const matchName = s.name.toLowerCase().includes(query);
            const matchId = s.schoolId.toLowerCase().includes(query);
            return matchName || matchId;
        }

        return true;
    });

    const totalPages = Math.ceil(filteredSchools.length / itemsPerPage) || 1;
    const paginatedSchools = filteredSchools.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <MainLayout>
            <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-6 lg:p-10">

                {/* Header */}
                <div className="mb-6 sm:mb-8 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                            <Shield size={26} strokeWidth={1.75} className="text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-3xl font-bold text-gray-800">
                                {t('superadmin.welcomeTitle', { name: user?.name })}
                            </h2>
                            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">{t('superadmin.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setShowInviteModal(true); setInviteError(''); setInviteSuccess(null); }}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/25 transform hover:-translate-y-0.5"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        {t('superadmin.inviteNewSchool')}
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-5 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-600 font-bold">{t('superadmin.registeredSchools')}</span>
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><School size={20} className="text-indigo-600" /></div>
                        </div>
                        <div className="text-4xl font-black text-indigo-600">{schools.length}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 p-5 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-600 font-bold">{t('superadmin.totalStudents')}</span>
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><Users size={20} className="text-purple-600" /></div>
                        </div>
                        <div className="text-4xl font-black text-purple-600">{schools.reduce((sum, s) => sum + (s.studentCount || 0), 0)}</div>
                    </div>
                    <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-100 p-5 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-600 font-bold">{t('superadmin.totalBuses')}</span>
                            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center"><Bus size={20} className="text-teal-600" /></div>
                        </div>
                        <div className="text-4xl font-black text-teal-600">{schools.reduce((sum, s) => sum + (s.busCount || 0), 0)}</div>
                    </div>
                </div>

                {/* Schools Table */}
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <School size={20} className="text-indigo-500" />
                                <h3 className="font-bold text-lg text-gray-800">
                                    {t('superadmin.schoolsTable')}
                                </h3>
                                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                    {filteredSchools.length}
                                </span>
                            </div>

                            {/* Search Box */}
                            <div className="relative w-full sm:w-72">
                                <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder={t('superadmin.searchSchoolPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full ps-9 pe-8 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-sans shadow-xs"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                        className="absolute top-1/2 -translate-y-1/2 end-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter Tabs / Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
                            <button
                                type="button"
                                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
                                    statusFilter === 'all'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-200'
                                }`}
                            >
                                <span>{t('superadmin.tabAll')}</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                    statusFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {counts.all}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
                                    statusFilter === 'active'
                                        ? 'bg-green-600 text-white border-green-600 shadow-xs'
                                        : 'bg-white text-gray-600 hover:bg-green-50 border-gray-200 hover:border-green-200'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                                <span>{t('superadmin.tabActive')}</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                    statusFilter === 'active' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700'
                                }`}>
                                    {counts.active}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
                                    statusFilter === 'pending'
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                        : 'bg-white text-gray-600 hover:bg-amber-50 border-gray-200 hover:border-amber-200'
                                }`}
                            >
                                <Clock size={12} className={statusFilter === 'pending' ? 'text-amber-200' : 'text-amber-500'} />
                                <span>{t('superadmin.tabPending')}</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                    statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'
                                }`}>
                                    {counts.pending}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStatusFilter('expired'); setCurrentPage(1); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
                                    statusFilter === 'expired'
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                        : 'bg-white text-gray-600 hover:bg-orange-50 border-gray-200 hover:border-orange-200'
                                }`}
                            >
                                <span>{t('superadmin.tabExpired')}</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                    statusFilter === 'expired' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700'
                                }`}>
                                    {counts.expired}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStatusFilter('disabled'); setCurrentPage(1); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
                                    statusFilter === 'disabled'
                                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                        : 'bg-white text-gray-600 hover:bg-red-50 border-gray-200 hover:border-red-200'
                                }`}
                            >
                                <span>{t('superadmin.tabDisabled')}</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                    statusFilter === 'disabled' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700'
                                }`}>
                                    {counts.disabled}
                                </span>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-indigo-400" /></div>
                    ) : schools.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <School size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="font-bold text-lg">{t('superadmin.noSchools')}</p>
                            <p className="text-sm mt-1">{t('superadmin.noSchoolsHint')}</p>
                        </div>
                    ) : filteredSchools.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Search size={44} className="mx-auto mb-3 opacity-30 text-indigo-400" />
                            <p className="font-bold text-base text-gray-700">لا توجد مدارس مطابقة للبحث</p>
                            <p className="text-xs text-gray-400 mt-1">جرّب البحث باسم آخر أو مسح حقل البحث</p>
                        </div>
                    ) : (
                        <>
                            {/* ── Mobile: School Cards (< md) ───────────────── */}
                            <div className="md:hidden flex flex-col p-3 gap-3 bg-gray-50/40">
                                {paginatedSchools.map((s) => (
                                    <div
                                        key={s._id}
                                        className={`bg-white border rounded-2xl p-4 shadow-sm space-y-3 transition-all ${
                                            !s.isActive ? 'border-red-100 opacity-70' : 'border-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-gray-800 text-base leading-snug">
                                                    {s.name}
                                                </h4>
                                                {s.admin && (
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {t('superadmin.adminCol', { name: s.admin.name })}
                                                    </p>
                                                )}
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-lg text-xs font-bold border border-indigo-100 font-mono shrink-0" dir="ltr">
                                                        {s.schoolId}
                                                    </span>
                                                    {s.invitationStatus === 'accepted' ? (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                                            s.isActive
                                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                                : 'bg-red-50 text-red-600 border-red-200'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-red-400'}`}></span>
                                                            {s.isActive ? t('superadmin.schoolActive') : t('superadmin.schoolInactive')}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-gray-50 text-gray-500 border-gray-200">
                                                            <Clock size={11} className="text-gray-400" />
                                                            {s.invitationStatus === 'expired' ? t('superadmin.statusExpired') : t('superadmin.statusPending')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="shrink-0">
                                                {statusBadge(s.invitationStatus)}
                                            </div>
                                        </div>

                                        {/* Counters */}
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100/80 text-xs">
                                            <div className="bg-purple-50/60 border border-purple-100/70 rounded-xl p-2 flex items-center justify-between">
                                                <span className="text-gray-500 font-bold flex items-center gap-1">
                                                    <Users size={14} className="text-purple-600" />
                                                    {t('superadmin.studentsCol')}:
                                                </span>
                                                <span className="font-black text-purple-700 text-sm">
                                                    {s.studentCount}
                                                </span>
                                            </div>

                                            <div className="bg-teal-50/60 border border-teal-100/70 rounded-xl p-2 flex items-center justify-between">
                                                <span className="text-gray-500 font-bold flex items-center gap-1">
                                                    <Bus size={14} className="text-teal-600" />
                                                    {t('superadmin.busesCol')}:
                                                </span>
                                                <span className="font-black text-teal-700 text-sm">
                                                    {s.busCount}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mobile Actions */}
                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                            {s.invitationStatus === 'accepted' ? (
                                                <button
                                                    onClick={() => handleToggle(s._id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                                                        s.isActive
                                                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                                            : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                    }`}
                                                >
                                                    {s.isActive ? <ToggleRight size={16} className="text-red-600" /> : <ToggleLeft size={16} className="text-gray-400" />}
                                                    <span>{s.isActive ? t('common.disable') : t('common.enable')}</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => { setResendModal(s._id); setResendResult(null); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                                                >
                                                    <RefreshCw size={13} />
                                                    <span>{t('superadmin.resendInvite')}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Desktop: Full Table (md+) ───────────────────── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50/50">
                                        <tr className="text-gray-500 font-bold">
                                            <th className="px-6 py-3 text-start">{t('superadmin.schoolName')}</th>
                                            <th className="px-6 py-3 text-start">{t('superadmin.schoolId')}</th>
                                            <th className="px-6 py-3 text-center">{t('superadmin.studentsCol')}</th>
                                            <th className="px-6 py-3 text-center">{t('superadmin.busesCol')}</th>
                                            <th className="px-6 py-3 text-center">{t('superadmin.invitationStatus')}</th>
                                            <th className="px-6 py-3 text-center">{t('superadmin.schoolStatus')}</th>
                                            <th className="px-6 py-3 text-center">{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paginatedSchools.map((s) => (
                                            <tr key={s._id} className={`hover:bg-gray-50/50 transition-colors ${!s.isActive ? 'opacity-60' : ''}`}>
                                                <td className="px-6 py-4 text-start">
                                                    <div className="font-bold text-gray-800">{s.name}</div>
                                                    {s.admin && <div className="text-xs text-gray-400 mt-0.5">{t('superadmin.adminCol', { name: s.admin.name })}</div>}
                                                </td>
                                                <td className="px-6 py-4 text-start whitespace-nowrap">
                                                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100 font-mono" dir="ltr">{s.schoolId}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-700">{s.studentCount}</td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-700">{s.busCount}</td>
                                                <td className="px-6 py-4 text-center">{statusBadge(s.invitationStatus)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {s.invitationStatus === 'accepted' ? (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s.isActive
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : 'bg-red-50 text-red-600 border-red-200'
                                                            }`}>
                                                            <span className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-red-400'}`}></span>
                                                            {s.isActive ? t('superadmin.schoolActive') : t('superadmin.schoolInactive')}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-500 border-gray-200">
                                                            <Clock size={12} className="text-gray-400" />
                                                            {s.invitationStatus === 'expired' ? t('superadmin.statusExpired') : t('superadmin.statusPending')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex items-center gap-2">
                                                        {s.invitationStatus === 'accepted' ? (
                                                            <button
                                                                onClick={() => handleToggle(s._id)}
                                                                title={s.isActive ? t('common.disable') : t('common.enable')}
                                                                className={`p-2 rounded-lg transition-colors border ${s.isActive
                                                                    ? 'hover:bg-red-50 text-gray-400 hover:text-red-500 border-transparent hover:border-red-100'
                                                                    : 'hover:bg-green-50 text-gray-400 hover:text-green-500 border-transparent hover:border-green-100'
                                                                    }`}
                                                            >
                                                                {s.isActive ? <ToggleRight size={20} className="text-green-600" /> : <ToggleLeft size={20} className="text-gray-400" />}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => { setResendModal(s._id); setResendResult(null); }}
                                                                title={t('superadmin.resendInvite')}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors border border-indigo-200"
                                                            >
                                                                <RefreshCw size={13} />
                                                                <span>{t('superadmin.resendInvite')}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Pagination Footer ───────────────────────────── */}
                            {totalPages > 1 && (
                                <div className="bg-gray-50/70 border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-2 font-sans">
                                    <span className="text-xs text-gray-500 font-medium">
                                        صفحة <span className="font-bold text-gray-800">{currentPage}</span> من <span className="font-bold text-gray-800">{totalPages}</span>
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                                    currentPage === pageNum
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ─── Invite School Modal ──────────────────────────────────────── */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowInviteModal(false)} className="absolute top-4 start-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={18} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                <Link2 size={28} strokeWidth={1.75} className="text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">{t('superadmin.inviteModalTitle')}</h3>
                            <p className="text-gray-500 text-sm mt-1">{t('superadmin.inviteModalSubtitle')}</p>
                        </div>

                        {inviteSuccess ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                                <h4 className="font-bold text-green-800 text-lg mb-2">{t('superadmin.inviteSuccess')}</h4>
                                <p className="text-sm text-gray-600 mb-4">{inviteSuccess.schoolName} ({inviteSuccess.schoolId})</p>

                                <div className="bg-white rounded-xl p-4 border border-green-100 mb-3">
                                    <p className="text-xs text-gray-500 mb-2 font-bold">{t('superadmin.inviteLink')}</p>
                                    <div className="flex items-center gap-2">
                                        <input type="text" readOnly value={inviteSuccess.link}
                                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-700" dir="ltr" />
                                        <button onClick={() => copyLink(inviteSuccess.link)}
                                            title="نسخ الرابط"
                                            className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600'}`}>
                                            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                        </button>
                                        <a href={inviteSuccess.link} target="_blank" rel="noopener noreferrer"
                                            title="فتح رابط التسجيل في تبويب جديد"
                                            className="px-2.5 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 text-xs font-bold">
                                            <ExternalLink size={14} />
                                            <span>تجربة الرابط</span>
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 justify-center text-xs text-amber-600 font-bold">
                                    <Clock size={14} />
                                    <span>{t('superadmin.validFor24h')}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{t('superadmin.sendLinkHint', { email: inviteSuccess.email })}</p>
                                <div className="mt-2 text-xs text-indigo-600 bg-indigo-50/70 border border-indigo-100 rounded-xl p-2 font-medium">
                                    💡 يمكنك الضغط على <strong>«تجربة الرابط»</strong> مباشرة لاختبار رحلة تسجيل مدير المدرسة كديمو.
                                </div>
                                <button onClick={() => setShowInviteModal(false)} className="mt-4 px-6 py-2.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors">{t('common.close')}</button>
                            </div>
                        ) : (
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">{t('superadmin.schoolNameLabel')}</label>
                                    <input type="text" required value={inviteForm.schoolName} onChange={e => setInviteForm({ ...inviteForm, schoolName: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder={t('superadmin.schoolNamePlaceholder')} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-gray-700 font-bold text-sm px-1">{t('superadmin.adminEmailLabel')}</label>
                                    <input type="email" required value={inviteForm.contactEmail} onChange={e => setInviteForm({ ...inviteForm, contactEmail: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" dir="ltr" placeholder="admin@school.edu.sa" />
                                </div>

                                <button type="submit" disabled={inviteLoading}
                                    className={`w-full bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-2 ${inviteLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-600 shadow-indigo-500/30 transform hover:-translate-y-0.5'}`}>
                                    {inviteLoading && <Loader2 size={20} className="animate-spin" />}
                                    <span>{inviteLoading ? t('superadmin.creating') : t('superadmin.createInviteLink')}</span>
                                </button>

                                {inviteError && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                        <p className="text-sm text-red-700 flex items-start gap-2">
                                            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                            <span className="font-semibold">{inviteError}</span>
                                        </p>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Resend Invitation Modal ─────────────────────────────────── */}
            {resendModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setResendModal(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative text-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setResendModal(null)} className="absolute top-4 start-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={18} />
                        </button>
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <RefreshCw size={28} className="text-indigo-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">{t('superadmin.resendModalTitle')}</h3>

                        {resendResult ? (
                            <div className="mt-4">
                                {resendResult.startsWith('خطأ') ? (
                                    <p className="text-sm text-red-600 font-bold">{resendResult}</p>
                                ) : (
                                    <>
                                        <p className="text-sm text-gray-500 mb-2">{t('superadmin.newInviteLink')}</p>
                                        <div className="flex items-center gap-2 mb-3">
                                            <input type="text" readOnly value={resendResult}
                                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-700" dir="ltr" />
                                            <button onClick={() => copyLink(resendResult)}
                                                title="نسخ الرابط"
                                                className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600'}`}>
                                                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                            </button>
                                            <a href={resendResult} target="_blank" rel="noopener noreferrer"
                                                title="فتح رابط التسجيل في تبويب جديد"
                                                className="px-2.5 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 text-xs font-bold">
                                                <ExternalLink size={14} />
                                                <span>تجربة الرابط</span>
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-2 justify-center text-xs text-amber-600 font-bold">
                                            <Clock size={14} />
                                            <span>{t('superadmin.oldLinkRevoked')}</span>
                                        </div>
                                    </>
                                )}
                                <button onClick={() => setResendModal(null)} className="mt-4 px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors">{t('common.close')}</button>
                            </div>
                        ) : (
                            <div className="mt-4">
                                <p className="text-sm text-gray-500 mb-4">{t('superadmin.resendConfirmMsg')}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setResendModal(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">{t('common.cancel')}</button>
                                    <button onClick={() => handleResend(resendModal)} disabled={resendLoading}
                                        className="flex-1 px-4 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2">
                                        {resendLoading && <Loader2 size={16} className="animate-spin" />}
                                        {resendLoading ? t('superadmin.resending') : t('superadmin.resend')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default SuperAdminDashboard;

