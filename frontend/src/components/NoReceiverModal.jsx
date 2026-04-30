import React from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, X, AlertOctagon, Check } from 'lucide-react';

const NoReceiverModal = ({ student, parentPhone, parentName, schoolContacts, onConfirm, onClose }) => {
    const { t } = useTranslation();
    const [acknowledged, setAcknowledged] = React.useState(false);

    const handleConfirm = () => {
        onConfirm();
        setAcknowledged(false);
    };

    const handleClose = () => {
        onClose();
        setAcknowledged(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 bg-red-50/60 shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                                <AlertOctagon size={24} strokeWidth={1.75} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{t('driver.noReceiverModalTitle')}</h3>
                                <p className="text-xs text-gray-500 mt-1">{t('driver.noReceiverModalSubtitle')}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Student & Parent Info */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-800">{student?.name}</p>
                                <p className="text-sm text-gray-500">{student?.studentId}</p>
                            </div>
                            {parentName && (
                                <div className="text-end">
                                    <p className="text-xs text-gray-400">{t('driver.parent')}</p>
                                    <p className="text-sm font-bold text-gray-700">{parentName}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Call Parent or School Contacts */}
                    <div className="space-y-3">
                        {parentPhone ? (
                            <a
                                href={`tel:${parentPhone}`}
                                className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl hover:bg-green-100 transition-colors w-full"
                            >
                                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                    <Phone size={20} strokeWidth={1.75} />
                                </div>
                                <div className="flex-1 text-start">
                                    <p className="font-bold text-gray-800">{t('driver.callParent')}</p>
                                    <p className="text-sm text-gray-500">{parentPhone}</p>
                                </div>
                            </a>
                        ) : (
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <p className="text-sm text-amber-700 font-medium">{t('driver.noParentPhone')}</p>
                            </div>
                        )}

                        {/* School emergency contacts fallback */}
                        {!parentPhone && schoolContacts && schoolContacts.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 font-medium px-1">{t('driver.schoolEmergencyContacts')}:</p>
                                {schoolContacts.map((contact, idx) => (
                                    <a
                                        key={idx}
                                        href={`tel:${contact}`}
                                        className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                                    >
                                        <Phone size={16} strokeWidth={1.75} className="text-blue-600 shrink-0" />
                                        <span className="font-bold text-blue-700">{contact}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Acknowledgment checkbox */}
                    <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={e => setAcknowledged(e.target.checked)}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500 shrink-0"
                        />
                        <p className="text-sm text-gray-600 leading-relaxed">{t('driver.noReceiverAck')}</p>
                    </label>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-5 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!acknowledged}
                        className="px-5 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors text-sm shadow-md shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <AlertOctagon size={16} />
                        {t('driver.confirmNoReceiver')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoReceiverModal;
