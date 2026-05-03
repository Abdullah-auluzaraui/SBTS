import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LogoutConfirmModal from './LogoutConfirmModal';
import LanguageSwitcher from './LanguageSwitcher';
import { Bus, Bell, UserCircle, X } from 'lucide-react';
import useNotifications from '../hooks/useNotifications';

const MainLayout = ({ children, onRefreshRequired }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
    const [isDropdownOpen, setDropdownOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead, toastData, setToastData } = useNotifications({ onRefreshRequired });


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
                            <div className="relative">
                                <button 
                                    onClick={() => setDropdownOpen(!isDropdownOpen)}
                                    className="hover:bg-gray-100 rounded-full p-2 transition shadow-sm border border-gray-100 bg-white flex items-center justify-center relative"
                                >
                                    <Bell size={18} strokeWidth={2} className="text-primary-500" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {isDropdownOpen && (
                                    <div className={`absolute top-full mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[100] left-1/2 -translate-x-1/2 sm:translate-x-0 ${i18n.language?.startsWith('ar') ? 'sm:right-auto sm:left-0' : 'sm:left-auto sm:right-0'}`}>

                                        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                            <h3 className="font-bold text-gray-800 text-sm">{t('common.notifications')}</h3>
                                            <button 
                                                onClick={() => { markAllAsRead(); setDropdownOpen(false); }}
                                                className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
                                            >
                                                {t('common.markAllAsRead')}
                                            </button>
                                        </div>
                                        <div className="max-h-[60vh] overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center text-sm text-gray-500">{t('common.noData')}</div>
                                            ) : (
                                                notifications.slice(0, 10).map(n => (
                                                    <div 
                                                        key={n._id}
                                                        onClick={() => { if (!n.isRead) markAsRead(n._id); }}
                                                        className={`p-3 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${n.isRead ? 'bg-white' : 'bg-primary-50/30'} ${n.type === 'urgent_alert' ? 'border-l-4 border-l-red-500' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {!n.isRead && <div className="mt-1.5 w-2 h-2 rounded-full bg-primary-500 shrink-0 shadow-sm shadow-primary-500/40" />}
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className={`text-sm font-bold truncate ${n.type === 'urgent_alert' ? 'text-red-700' : 'text-gray-800'}`}>
                                                                    {n.notificationType ? t(`notifications.${n.notificationType}.title`) : n.title}
                                                                </h4>
                                                                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                                                                    {n.notificationType ? t(`notifications.${n.notificationType}.body`) : n.message}
                                                                </p>
                                                                <span className="text-[10px] text-gray-400 mt-1 block font-medium">
                                                                    {new Date(n.createdAt).toLocaleTimeString(i18n.language?.startsWith('ar') ? 'ar' : 'en', { hour: '2-digit', minute:'2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
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

            {/* Dynamic Toast Notification */}
            <div
                className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${toastData ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0 pointer-events-none'
                    } w-[90%] max-w-sm`}
            >
                {toastData && (
                    <div className={`bg-white border ${toastData.type === 'urgent_alert' ? 'border-red-300' : 'border-primary-200'} rounded-2xl p-4 flex items-center justify-between gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.08)] relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-transparent via-primary-50/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none"></div>
                        <div className="flex items-center gap-4 z-10">
                            <div className={`w-10 h-10 ${toastData.type === 'urgent_alert' ? 'bg-red-50' : 'bg-primary-50'} rounded-full flex items-center justify-center shadow-sm shrink-0`}>
                                <Bell size={20} strokeWidth={2} className={`${toastData.type === 'urgent_alert' ? 'text-red-500' : 'text-primary-500'} animate-bounce`} />
                            </div>
                            <div>
                                <h4 className={`font-bold text-sm ${toastData.type === 'urgent_alert' ? 'text-red-700' : 'text-gray-800'}`}>
                                    {toastData.notificationType ? t(`notifications.${toastData.notificationType}.title`) : toastData.title}
                                </h4>
                                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                                    {toastData.notificationType ? t(`notifications.${toastData.notificationType}.body`) : toastData.message}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setToastData(null)}
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors z-10"
                        >
                            <X size={16} strokeWidth={2} />
                        </button>
                    </div>
                )}
            </div>

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
