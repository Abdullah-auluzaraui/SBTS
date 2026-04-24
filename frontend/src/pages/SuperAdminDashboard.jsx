import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import { useTranslation } from 'react-i18next';
import api from '../services/apiService';
import {
    Shield, School, Users, Plus, X, Loader2, AlertCircle, CheckCircle2,
    ToggleLeft, ToggleRight, Copy, RefreshCw, Bus, Link2, Clock, Eye, EyeOff
} from 'lucide-react';

const SuperAdminDashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();

    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteForm, setInviteForm] = useState({ schoolName: '', contactEmail: '', contactPhone: '' });
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState(null);

    const [resendModal, setResendModal] = useState(null);
    const [resendResult, setResendResult] = useState(null);
    const [resendLoading, setResendLoading] = useState(false);

    const [copied, setCopied] = useState(false);

    const fetchSchools = async () => {
        try {
            const { data } = await api.get(showAll ? '/super/schools?all=true' : '/super/schools');
            setSchools(data.schools);
        } catch (err) {
            console.error('Failed to fetch schools:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSchools(); }, [showAll]);

    const fullLink = (path) => `${window.location.origin}${path}`;

    const copyLink = (link) => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInvite = async (e) => {
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
        } catch (err) {
            setInviteError(err.response?.data?.message || t('superadmin.errors.createError'));
        } finally {
            setInviteLoading(false);
        }
    };

    const handleToggle = async (schoolId) => {
        try {
            await api.patch(`/super/schools/${schoolId}/status`);
            fetchSchools();
        } catch (err) {
            console.error('Toggle failed:', err);
        }
    };

    const handleResend = async (schoolId) => {
        setResendLoading(true);
        setResendResult(null);
        try {
            const { data } = await api.post(`/super/invitations/${schoolId}/resend`);
            setResendResult(fullLink(data.invitation.link));
        } catch (err) {
            setResendResult('خطأ: ' + (err.response?.data?.message || 'فشل إعادة الإرسال'));
        } finally {
            setResendLoading(false);
        }
    };

    const statusBadge = (status) => {
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

    return (
        <MainLayout>
            <div className="bg-white border text-right border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-10">

                {/* Header */}
                <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm">
                            <Shield size={32} strokeWidth={1.75} className="text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800">
                                {t('superadmin.welcomeTitle', { name: user?.name })}
                            </h2>
                            <p className="text-gray-500 mt-1">{t('superadmin.subtitle')}</p>
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
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <School size={20} className="text-indigo-500" />
                            {t('superadmin.schoolsTable')}
                        </h3>
                        <button
                            onClick={() => setShowAll(v => !v)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border transition-all ${showAll
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                }`}
                        >
                            {showAll ? <Eye size={15} /> : <EyeOff size={15} />}
                            {showAll ? t('common.showActive') : t('common.showAll')}
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-indigo-400" /></div>
                    ) : schools.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <School size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="font-bold text-lg">{t('superadmin.noSchools')}</p>
                            <p className="text-sm mt-1">{t('superadmin.noSchoolsHint')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50/50">
                                    <tr className="text-gray-500 font-bold">
                                        <th className="px-6 py-3 text-right">{t('superadmin.schoolName')}</th>
                                        <th className="px-6 py-3 text-right">{t('superadmin.schoolId')}</th>
                                        <th className="px-6 py-3 text-center">{t('superadmin.studentsCol')}</th>
                                        <th className="px-6 py-3 text-center">{t('superadmin.busesCol')}</th>
                                        <th className="px-6 py-3 text-center">{t('superadmin.invitationStatus')}</th>
                                        <th className="px-6 py-3 text-center">{t('superadmin.schoolStatus')}</th>
                                        <th className="px-6 py-3 text-center">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {schools.map((s) => (
                                        <tr key={s._id} className={`hover:bg-gray-50/50 transition-colors ${!s.isActive ? 'opacity-60' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">{s.name}</div>
                                                {s.admin && <div className="text-xs text-gray-400 mt-0.5">{t('superadmin.adminCol', { name: s.admin.name })}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-100">{s.schoolId}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-700">{s.studentCount}</td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-700">{s.busCount}</td>
                                            <td className="px-6 py-4 text-center">{statusBadge(s.invitationStatus)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s.isActive
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-red-50 text-red-600 border-red-200'
                                                    }`}>
                                                    <span className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-red-400'}`}></span>
                                                    {s.isActive ? t('superadmin.schoolActive') : t('superadmin.schoolInactive')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleToggle(s._id)}
                                                        title={s.isActive ? t('common.disable') : t('common.enable')}
                                                        className={`p-2 rounded-lg transition-colors border ${s.isActive
                                                            ? 'hover:bg-red-50 text-gray-400 hover:text-red-500 border-transparent hover:border-red-100'
                                                            : 'hover:bg-green-50 text-gray-400 hover:text-green-500 border-transparent hover:border-green-100'
                                                            }`}
                                                    >
                                                        {s.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                    </button>
                                                    {s.invitationStatus !== 'accepted' && (
                                                        <button
                                                            onClick={() => { setResendModal(s._id); setResendResult(null); }}
                                                            title={t('superadmin.resendInvite')}
                                                            className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-500 transition-colors border border-transparent hover:border-indigo-100"
                                                        >
                                                            <RefreshCw size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Invite School Modal ──────────────────────────────────────── */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowInviteModal(false)} className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
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
                                            className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600'}`}>
                                            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 justify-center text-xs text-amber-600 font-bold">
                                    <Clock size={14} />
                                    <span>{t('superadmin.validFor24h')}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{t('superadmin.sendLinkHint', { email: inviteSuccess.email })}</p>
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
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-left" dir="ltr" placeholder="admin@school.edu.sa" />
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
                        <button onClick={() => setResendModal(null)} className="absolute top-4 left-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
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
                                                className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600'}`}>
                                                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                            </button>
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
