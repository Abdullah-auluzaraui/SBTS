import React from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Task FE-S1-6: LogoutConfirmModal
const LogoutConfirmModal = ({ isOpen, onClose, onConfirm }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 transform transition-all scale-100">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <LogOut size={28} strokeWidth={2} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-800">
                        {t('logout.title')}
                    </h2>
                    <p className="text-gray-500 mb-8 text-lg">
                        {t('logout.message')}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-bold transition-colors focus:ring-4 focus:ring-gray-100"
                    >
                        {t('logout.cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-bold shadow-md shadow-red-200 transition-colors focus:ring-4 focus:ring-red-200"
                    >
                        {t('logout.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirmModal;
