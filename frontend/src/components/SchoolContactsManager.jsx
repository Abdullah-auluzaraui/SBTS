import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Plus, Trash2, X, Loader2, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import api from '../services/apiService';

// Modal for the school admin to add / edit / delete internal school contacts.
// Backed by: GET /api/admin/school & PUT /api/admin/school/emergency-contacts
//
// Contact shape: { role: string, phone: string }
// The backend persists them as { name, phone }; we map transparently here.
const SchoolContactsManager = ({ onClose, onSaved }) => {
    const { t } = useTranslation();

    const [contacts, setContacts] = useState([]); // [{ role, phone }]
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // ── Load current contacts ─────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get('/admin/school');
                if (cancelled) return;
                const list = (data.school?.emergencyContacts || []).map(c => ({
                    role: c.name || '',
                    phone: c.phone || ''
                }));
                setContacts(list.length ? list : [{ role: '', phone: '' }]);
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.message || t('common.error'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [t]);

    // ── Row helpers ───────────────────────────────────────────────────────
    const updateRow = (idx, field, value) => {
        setContacts(prev => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
        setSuccess('');
        setError('');
    };

    const addRow = () => {
        setContacts(prev => [...prev, { role: '', phone: '' }]);
        setSuccess('');
        setError('');
    };

    const removeRow = (idx) => {
        setContacts(prev => prev.filter((_, i) => i !== idx));
        setSuccess('');
        setError('');
    };

    // ── Save ──────────────────────────────────────────────────────────────
    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Drop completely empty rows; validate the rest.
        const cleaned = contacts
            .map(c => ({ role: c.role.trim(), phone: c.phone.trim() }))
            .filter(c => c.role || c.phone);

        const invalid = cleaned.find(c => !c.role || !c.phone);
        if (invalid) {
            setError(t('admin.contactValidationError'));
            return;
        }

        setSaving(true);
        try {
            const payload = { contacts: cleaned.map(c => ({ name: c.role, phone: c.phone })) };
            const { data } = await api.put('/admin/school/emergency-contacts', payload);
            const saved = (data.emergencyContacts || []).map(c => ({ role: c.name || '', phone: c.phone || '' }));
            setContacts(saved.length ? saved : [{ role: '', phone: '' }]);
            setSuccess(t('admin.contactsSaved'));
            onSaved?.(data.emergencyContacts || []);
        } catch (err) {
            setError(err.response?.data?.message || t('admin.contactsSaveFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => !saving && onClose?.()}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/60 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Users size={20} className="text-blue-600" />
                        </div>
                        <div className="min-w-0 text-start">
                            <h3 className="text-lg font-bold text-gray-800 truncate">{t('admin.manageContacts')}</h3>
                            <p className="text-xs text-gray-500 truncate">{t('admin.manageContactsHint')}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => !saving && onClose?.()}
                        className="w-9 h-9 shrink-0 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSave} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
                    {loading ? (
                        <div className="h-40 flex items-center justify-center">
                            <Loader2 size={28} className="animate-spin text-blue-400" />
                        </div>
                    ) : (
                        <>
                            {contacts.length === 0 && (
                                <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center">
                                    <p className="text-sm font-bold text-gray-600">{t('admin.noEmergency')}</p>
                                    <p className="text-xs text-gray-400 mt-1">{t('admin.noEmergencyHint')}</p>
                                </div>
                            )}

                            {contacts.map((c, idx) => (
                                <div
                                    key={idx}
                                    className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-3 items-start p-3 rounded-2xl border border-gray-100 bg-gray-50/60"
                                >
                                    {/* Role / Name */}
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-gray-500 text-start px-1">
                                            {t('admin.roleLabel')}
                                        </label>
                                        <input
                                            type="text"
                                            value={c.role}
                                            onChange={e => updateRow(idx, 'role', e.target.value)}
                                            placeholder={t('admin.rolePlaceholder')}
                                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-start"
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-gray-500 text-start px-1">
                                            {t('admin.phoneLabel')}
                                        </label>
                                        <div className="relative">
                                            <Phone
                                                size={14}
                                                className="absolute top-1/2 -translate-y-1/2 start-3 text-gray-400 pointer-events-none"
                                            />
                                            <input
                                                type="tel"
                                                dir="ltr"
                                                value={c.phone}
                                                onChange={e => updateRow(idx, 'phone', e.target.value.replace(/[^\d+]/g, ''))}
                                                placeholder={t('admin.phonePlaceholder')}
                                                className="w-full ps-9 pe-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-start font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Remove */}
                                    <div className="flex sm:pt-6 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(idx)}
                                            title={t('admin.removeContact')}
                                            aria-label={t('admin.removeContact')}
                                            className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addRow}
                                className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-200 rounded-xl transition-colors"
                            >
                                <Plus size={16} />
                                {t('admin.addContact')}
                            </button>

                            {success && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-semibold">
                                    <CheckCircle2 size={16} className="shrink-0" />
                                    <span className="text-start">{success}</span>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-semibold">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <span className="text-start">{error}</span>
                                </div>
                            )}
                        </>
                    )}
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => !saving && onClose?.()}
                        disabled={saving}
                        className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-md shadow-blue-600/20 disabled:opacity-60"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {saving ? t('admin.savingContacts') : t('common.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SchoolContactsManager;
