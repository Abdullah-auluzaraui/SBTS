import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, School, Home, ChevronLeft, ChevronRight } from 'lucide-react';

// Two-option chooser presented when the driver taps the big "Start Trip" button.
// The driver picks the direction; the parent component then runs the existing
// OSRM/map flow and renders per-state action buttons on each student card.
//
// Props:
//   onClose()
//   onSelect('to_school' | 'to_home')
const TripTypeModal = ({ onClose, onSelect }) => {
    const { t, i18n } = useTranslation();
    const isRtl = (i18n.language || 'en').startsWith('ar');
    // Direction-aware chevron so the affordance always points "forward".
    const Chevron = isRtl ? ChevronLeft : ChevronRight;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-primary-50/60 shrink-0">
                    <div className="min-w-0 text-start">
                        <h3 className="text-base font-bold text-gray-800 truncate">
                            {t('driver.chooseTripType')}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                            {t('driver.chooseTripTypeSubtitle')}
                        </p>
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
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                    {/* Trip to School */}
                    <button
                        type="button"
                        onClick={() => onSelect?.('to_school')}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-white hover:bg-blue-50/60 hover:border-blue-100 transition-colors group text-start"
                    >
                        <div className="w-12 h-12 shrink-0 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <School size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-800 text-sm truncate">
                                {t('driver.tripToSchool')}
                            </p>
                        </div>
                        <Chevron size={18} className="ms-auto shrink-0 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </button>

                    {/* Trip Back Home */}
                    <button
                        type="button"
                        onClick={() => onSelect?.('to_home')}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-white hover:bg-amber-50/60 hover:border-amber-100 transition-colors group text-start"
                    >
                        <div className="w-12 h-12 shrink-0 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <Home size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-800 text-sm truncate">
                                {t('driver.tripToHome')}
                            </p>
                        </div>
                        <Chevron size={18} className="ms-auto shrink-0 text-gray-300 group-hover:text-amber-500 transition-colors" />
                    </button>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TripTypeModal;
