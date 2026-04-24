import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, Loader2, Unlink, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import api from '../services/apiService';

// Strict confirmation modal for the admin "Unlink Parent" action. It lays out
// the consequences and requires the admin's current password to proceed.
//
// Props:
//   student  : the Student object being unlinked (must include id, name, parentName)
//   onClose()
//   onSuccess(updatedStudent) — called after a successful unlink
const UnlinkParentModal = ({ student, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password.trim()) {
            setError(t('studentManagement.confirmPasswordLabel'));
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            const { data } = await api.post(`/students/${student.id}/unlink-parent`, { password });
            onSuccess?.(data.student);
        } catch (err) {
            const code = err.response?.data?.errorCode;
            setError(
                code === 'WRONG_PASSWORD'
                    ? t('studentManagement.wrongPassword')
                    : err.response?.data?.message || t('common.error')
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !submitting && onClose?.()}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-3 bg-red-50/60 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 bg-red-100 rounded-xl flex items-center justify-center">
                            <ShieldAlert size={20} className="text-red-600" />
                        </div>
                        <div className="min-w-0 text-start">
                            <h3 className="text-lg font-bold text-gray-800 truncate">{t('studentManagement.unlinkConfirmTitle')}</h3>
                            <p className="text-xs text-gray-500 truncate">{t('studentManagement.unlinkConfirmSubtitle')}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => !submitting && onClose?.()}
                        disabled={submitting}
                        className="w-9 h-9 shrink-0 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                        aria-label={t('common.close')}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Student + parent summary */}
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-500">
                                {student?.name?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0 flex-1 text-start">
                                <p className="font-bold text-gray-800 truncate">{student?.name}</p>
                                <p className="text-[11px] text-gray-400 font-mono truncate" dir="ltr">{student?.studentId}</p>
                            </div>
                        </div>
                        {student?.parentName && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                                <span className="text-xs text-gray-500 font-semibold text-start">{t('studentManagement.linkedParentLabel')}</span>
                                <span className="text-xs font-bold text-gray-700 bg-white px-2 py-1 rounded-lg border border-gray-200 truncate text-end">{student.parentName}</span>
                            </div>
                        )}
                    </div>

                    {/* Consequences */}
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                        <div className="flex items-start gap-2 mb-3">
                            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-sm font-bold text-amber-800 text-start">{t('studentManagement.unlinkWarningHeading')}</p>
                        </div>
                        <ul className="space-y-2 ps-6 list-disc marker:text-amber-500 text-xs text-amber-900 text-start leading-relaxed">
                            <li>{t('studentManagement.unlinkWarningPoint1')}</li>
                            <li>{t('studentManagement.unlinkWarningPoint2')}</li>
                            <li>{t('studentManagement.unlinkWarningPoint3')}</li>
                            <li>{t('studentManagement.unlinkWarningPoint4')}</li>
                        </ul>
                    </div>

                    {/* Password confirmation */}
                    <div className="space-y-1.5">
                        <label htmlFor="unlink-password" className="block text-gray-700 font-bold text-sm text-start px-1">
                            {t('studentManagement.confirmPasswordLabel')}
                        </label>
                        <div className="relative">
                            <input
                                id="unlink-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                placeholder={t('studentManagement.confirmPasswordPlaceholder')}
                                autoComplete="current-password"
                                autoFocus
                                disabled={submitting}
                                className="w-full ps-4 pe-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-start"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                className="absolute top-1/2 -translate-y-1/2 end-2 w-8 h-8 inline-flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-semibold">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <span className="text-start">{error}</span>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => !submitting && onClose?.()}
                        disabled={submitting}
                        className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !password.trim()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm shadow-md shadow-red-600/20 disabled:opacity-60"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
                        {submitting ? t('studentManagement.unlinkingButton') : t('studentManagement.unlinkCtaButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnlinkParentModal;
