import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LogoutConfirmModal from './LogoutConfirmModal';
import { Bus, Bell } from 'lucide-react';

const MainLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);

    // Translate roles for display
    const roleDisplay = {
        admin: 'مدير',
        driver: 'سائق',
        parent: 'ولي أمر'
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Bus size={28} strokeWidth={2} className="text-primary-500" />
                    <span className="hidden sm:inline bg-gradient-to-l from-primary-600 to-primary-400 bg-clip-text text-transparent">متتبع الحافلة المدرسية</span>
                </h1>

                {user && (
                    <div className="flex items-center gap-4 text-sm font-semibold">
                        <span className="text-primary-600 hidden sm:inline px-3 py-1 bg-primary-50 rounded-full border border-primary-100">
                            {roleDisplay[user.role]}
                        </span>
                        <span className="text-gray-700">{user.name}</span>
                        {user.role === 'parent' && (
                            <button className="hover:bg-gray-100 rounded-full p-2 transition shadow-sm border border-gray-100 bg-white flex items-center justify-center">
                                <Bell size={18} strokeWidth={2} className="text-primary-500" />
                            </button>
                        )}
                        <button
                            onClick={() => setLogoutModalOpen(true)}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold border border-transparent hover:border-red-100"
                        >
                            تسجيل خروج
                        </button>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
                {children}
            </main>

            {/* Logout Modal */}
            <LogoutConfirmModal
                isOpen={isLogoutModalOpen}
                onClose={() => setLogoutModalOpen(false)}
                onConfirm={logout}
            />
        </div>
    );
};

export default MainLayout;
