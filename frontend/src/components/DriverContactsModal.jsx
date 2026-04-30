import React from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, PhoneCall, X, Users, Info } from 'lucide-react';

// Displays the list of school contacts configured by the admin. Each phone
// number is rendered as an anchor with the tel: protocol for click-to-call.
//
// Props:
//   contacts : [{ name, phone }]
//   onClose()
const DriverContactsModal = ({ contacts = [], onClose }) => {
    const { t } = useTranslation();

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-blue-50/60 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Users size={20} className="text-blue-600" />
                        </div>
                        <div className="min-w-0 text-start">
                            <h3 className="text-base font-bold text-gray-800 truncate">
                                {t('driver.emergencyContactsTitle')}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                                {t('driver.emergencyContactsSubtitle')}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 shrink-0 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={t('common.close')}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                    {contacts.length === 0 ? (
                        <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-center">
                            <Info size={22} className="text-gray-300 mx-auto mb-2" />
                            <p className="text-sm font-bold text-gray-600">{t('driver.noEmergency')}</p>
                            <p className="text-xs text-gray-400 mt-1">{t('driver.noEmergencyHint')}</p>
                        </div>
                    ) : (
                        contacts.map((c, idx) => (
                            <a
                                key={`${c.phone}-${idx}`}
                                href={`tel:${c.phone}`}
                                className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-white hover:bg-blue-50/60 hover:border-blue-100 transition-colors group"
                            >
                                <div className="w-11 h-11 shrink-0 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Phone size={18} />
                                </div>
                                <div className="min-w-0 flex-1 text-start">
                                    <p className="font-bold text-gray-800 text-sm truncate">{c.name}</p>
                                    <p
                                        dir="ltr"
                                        className="text-xs text-gray-500 font-mono truncate text-start"
                                    >
                                        {c.phone}
                                    </p>
                                </div>
                                <span className="ms-auto shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg border border-blue-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-transparent transition-colors">
                                    <PhoneCall size={12} />
                                    {t('driver.callContact')}
                                </span>
                            </a>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DriverContactsModal;
