import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/apiService';
import { useTranslation } from 'react-i18next';
import {
    UserCog, Plus, X, Loader2, AlertCircle, Eye, EyeOff,
    Ban, CircleCheck, Phone, Check, Pencil
} from 'lucide-react';

const DriverManagement = () => {
    const { t } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', username: '', password: '', phone: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [successId, setSuccessId] = useState(null);

    const [editDriver, setEditDriver] = useState(null);
    const [editName, setEditName] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    const fetchDrivers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(showAll ? '/users/drivers?all=true' : '/users/drivers');
            setDrivers(data.drivers);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [showAll]);

    useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

    const resetForm = () => {
        setForm({ name: '', username: '', password: '', phone: '' });
        setShowForm(false);
        setFormError('');
        setShowPassword(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);
        try {
            const { data } = await api.post('/users/driver', form);
            resetForm();
            fetchDrivers();
            setSuccessId(data.driver.id);
            setTimeout(() => setSuccessId(null), 3000);
        } catch (err) {
            setFormError(err.response?.data?.message || t('driverManagement.errors.createError'));
        } finally { setFormLoading(false); }
    };

    const openEditDriver = (driver) => {
        setEditDriver(driver);
        setEditName(driver.name);
        setEditError('');
    };

    const handleEditName = async (e) => {
        e.preventDefault();
        setEditError('');
        setEditLoading(true);
        try {
            await api.patch(`/users/drivers/${editDriver._id}`, { name: editName });
            setSuccessId(editDriver._id);
            setTimeout(() => setSuccessId(null), 3000);
            setEditDriver(null);
            fetchDrivers();
        } catch (err) {
            setEditError(err.response?.data?.message || t('driverManagement.errors.updateError'));
        } finally { setEditLoading(false); }
    };

    const handleToggleStatus = async (driver) => {
        try {
            await api.patch(`/users/drivers/${driver._id}/status`);
            fetchDrivers();
        } catch (err) { console.error(err); }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <UserCog size={22} className="text-primary-500" />
                    {t('driverManagement.title')}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAll(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm border transition-all ${
                            showAll
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        {showAll ? <Eye size={15} /> : <EyeOff size={15} />}
                        <span className="hidden sm:inline">{showAll ? t('common.showActiveOnly') : t('common.showAll')}</span>
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 text-sm"
                    >
                        <Plus size={17} />
                        <span>{t('driverManagement.addDriver')}</span>
                    </button>
                </div>
            </div>

            {/* ── Add Driver Modal ─────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={resetForm} className="absolute top-4 start-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                            <X size={18} />
                        </button>
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mb-3">
                                <UserCog size={28} className="text-primary-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">{t('driverManagement.addDriverTitle')}</h3>
                            <p className="text-gray-400 text-sm mt-1">{t('driverManagement.addDriverSubtitle')}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">{t('driverManagement.fullName')}</label>
                                <input
                                    type="text" required
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">{t('driverManagement.username')}</label>
                                <input
                                    type="text" required dir="ltr"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                    placeholder="driver_ahmed"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">{t('driverManagement.password')}</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'} required dir="ltr"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        minLength={6}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">{t('driverManagement.phone')}</label>
                                <input
                                    type="tel" dir="ltr" required
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                                    placeholder="0512345678"
                                    minLength={10} maxLength={10} pattern="[0-9]*"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                />
                            </div>

                            <button type="submit" disabled={formLoading}
                                className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 mt-2 ${formLoading ? 'opacity-70' : 'hover:bg-primary-600 shadow-primary-500/30'}`}>
                                {formLoading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                                {formLoading ? t('driverManagement.creating') : t('driverManagement.createAccount')}
                            </button>

                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-sm text-red-700 flex items-start gap-2">
                                        <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                        <span className="font-semibold">{formError}</span>
                                    </p>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Driver Name Modal ───────────────────────── */}
            {editDriver && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditDriver(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 sm:p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setEditDriver(null)} className="absolute top-4 start-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                            <X size={18} />
                        </button>
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mb-3">
                                <Pencil size={24} className="text-primary-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">{t('driverManagement.editNameTitle')}</h3>
                            <p className="text-gray-400 text-sm mt-1 font-mono">{editDriver.username}</p>
                        </div>
                        <form onSubmit={handleEditName} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-gray-700 font-bold text-sm px-1">{t('driverManagement.fullName')}</label>
                                <input
                                    type="text" required autoFocus
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                />
                            </div>
                            <button type="submit" disabled={editLoading}
                                className={`w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 ${editLoading ? 'opacity-70' : 'hover:bg-primary-600 shadow-primary-500/30'}`}>
                                {editLoading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                                {editLoading ? t('common.saving') : t('common.save')}
                            </button>
                            {editError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-sm text-red-700 flex items-start gap-2">
                                        <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                        <span className="font-semibold">{editError}</span>
                                    </p>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* ── Drivers List ─────────────────────────────────── */}
            {loading ? (
                <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-primary-400" /></div>
            ) : drivers.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl">
                    <UserCog size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-lg">{t('driverManagement.noDrivers')}</p>
                    <p className="text-sm mt-1">{t('driverManagement.noDriversHint')}</p>
                </div>
            ) : (
                <>
                    {/* ── Mobile: Card List (< md) ───────────────── */}
                    <div className="md:hidden flex flex-col gap-3">
                        {drivers.map(driver => (
                            <div
                                key={driver._id}
                                className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${
                                    !driver.isActive ? 'opacity-60 border-gray-100' : 'border-gray-100'
                                } ${successId === driver._id ? 'border-green-200 bg-green-50/30' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                                                {driver.name}
                                                {successId === driver._id && <Check size={13} className="text-green-500" />}
                                            </p>
                                            <code className="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-mono">{driver.username}</code>
                                        </div>
                                    </div>
                                    {driver.isActive ? (
                                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-green-100 shrink-0">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />{t('driverManagement.active')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[11px] font-bold px-2.5 py-1 rounded-full border border-red-100 shrink-0">
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />{t('driverManagement.suspended')}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                    {driver.phone ? (
                                        <a href={`tel:${driver.phone}`} className="flex items-center gap-1.5 text-sm text-gray-500">
                                            <Phone size={13} className="text-gray-400" />
                                            <span dir="ltr">{driver.phone}</span>
                                        </a>
                                    ) : <span className="text-gray-300 text-sm">—</span>}

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditDriver(driver)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 transition-all"
                                            title={t('common.edit')}
                                        >
                                            <Pencil size={12} /> {t('common.edit')}
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(driver)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                driver.isActive
                                                    ? 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100'
                                                    : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'
                                            }`}
                                        >
                                            {driver.isActive
                                                ? <><Ban size={13} /> {t('common.suspend')}</>
                                                : <><CircleCheck size={13} /> {t('common.enable')}</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Desktop: Table (>= md) ─────────────────── */}
                    <div className="hidden md:block bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr className="text-gray-500 font-bold">
                                    <th className="px-6 py-4 text-start">{t('roles.driver')}</th>
                                    <th className="px-6 py-4 text-start">{t('driverManagement.usernameCol')}</th>
                                    <th className="px-6 py-4 text-start">{t('driverManagement.phoneCol')}</th>
                                    <th className="px-6 py-4 text-center">{t('driverManagement.statusCol')}</th>
                                    <th className="px-6 py-4 text-center">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {drivers.map(driver => (
                                    <tr
                                        key={driver._id}
                                        className={`hover:bg-gray-50/50 transition-colors group ${!driver.isActive ? 'opacity-60' : ''} ${successId === driver._id ? 'bg-green-50/50' : ''}`}
                                    >
                                        <td className="px-6 py-4 text-start">
                                            <div className="flex items-center gap-3">
                                                <p className="font-bold text-gray-800 flex items-center gap-1.5">
                                                    {driver.name}
                                                    {successId === driver._id && <Check size={14} className="text-green-500" />}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-start">
                                            <code className="text-xs bg-gray-100 px-2.5 py-1 rounded-lg text-gray-600 font-mono">{driver.username}</code>
                                        </td>
                                        <td className="px-6 py-4 text-start text-gray-500">
                                            {driver.phone ? (
                                                <span className="inline-flex items-center gap-1.5" dir="ltr">
                                                    <Phone size={13} className="text-gray-400 shrink-0" />
                                                    {driver.phone}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {driver.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-100">
                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />{t('driverManagement.active')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-100">
                                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />{t('driverManagement.suspended')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditDriver(driver)}
                                                    className="p-2 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-colors"
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(driver)}
                                                    className={`p-2 rounded-lg transition-colors ${driver.isActive
                                                        ? 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                                                        : 'hover:bg-green-50 text-gray-400 hover:text-green-500'}`}
                                                    title={driver.isActive ? t('common.suspend') : t('common.enable')}
                                                >
                                                    {driver.isActive ? <Ban size={16} /> : <CircleCheck size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default DriverManagement;
