import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LogoutConfirmModal from './LogoutConfirmModal';
import LanguageSwitcher from './LanguageSwitcher';
import { Bus, Bell, UserCircle } from 'lucide-react';

const MainLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);

    const profilePath = { parent: '/parent/profile', driver: '/driver/profile', schooladmin: '/admin/profile' }[user?.role];

    const roleDisplay = {
        superadmin: t('roles.superadmin'),
        schooladmin: t('roles.schooladmin'),
        driver: t('roles.driver'),
        parent: t('roles.parent')
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Bus size={28} strokeWidth={2} className="text-primary-500" />
                    <span className="hidden sm:inline bg-gradient-to-l from-primary-600 to-primary-400 bg-clip-text text-transparent">
                        {t('common.appName')}
                    </span>
                </h1>

                {user && (
                    <div className="flex items-center gap-3 text-sm font-semibold">
                        <LanguageSwitcher />
                        <span className="text-primary-600 hidden sm:inline px-3 py-1 bg-primary-50 rounded-full border border-primary-100">
                            {roleDisplay[user.role]}
                        </span>
                        <span className="text-gray-700 hidden sm:inline">{user.name}</span>
                        {user.role === 'parent' && (
                            <button className="hover:bg-gray-100 rounded-full p-2 transition shadow-sm border border-gray-100 bg-white flex items-center justify-center">
                                <Bell size={18} strokeWidth={2} className="text-primary-500" />
                            </button>
                        )}
                        {['parent', 'driver', 'schooladmin'].includes(user.role) && (
                            <button
                                onClick={() => navigate(profilePath)}
                                title={t('admin.profile')}
                                className="hover:bg-gray-100 rounded-full p-2 transition shadow-sm border border-gray-100 bg-white flex items-center justify-center"
                            >
                                <UserCircle size={18} strokeWidth={2} className="text-gray-500" />
                            </button>
                        )}
                        <button
                            onClick={() => setLogoutModalOpen(true)}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold border border-transparent hover:border-red-100"
                        >
                            {t('common.logout')}
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
