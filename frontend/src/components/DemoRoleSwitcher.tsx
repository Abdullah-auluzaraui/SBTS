import React, { useState } from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  School,
  Bus,
  Users,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import api from '../services/apiService';

const DEMO_USERS_MAP: Record<UserRole, { username: string; labelKey: string; icon: any }> = {
  superadmin: {
    username: 'superadmin',
    labelKey: 'roles.superadmin',
    icon: ShieldCheck,
  },
  schooladmin: {
    username: 's_admin',
    labelKey: 'roles.schooladmin',
    icon: School,
  },
  driver: {
    username: 'driver01',
    labelKey: 'roles.driver',
    icon: Bus,
  },
  parent: {
    username: 'parent001',
    labelKey: 'roles.parent',
    icon: Users,
  }
};

export const DemoRoleSwitcher: React.FC = () => {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isRtl = i18n.language === 'ar';

  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isAuthenticated || !user || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const currentRoleInfo = DEMO_USERS_MAP[user.role] || DEMO_USERS_MAP.driver;
  const CurrentIcon = currentRoleInfo.icon;

  const handleRoleSwitch = async (targetRole: UserRole) => {
    if (user.role === targetRole || switchingTo) return;
    const target = DEMO_USERS_MAP[targetRole];
    if (!target) return;

    setSwitchingTo(targetRole);
    try {
      logout();
      await new Promise((resolve) => setTimeout(resolve, 200));
      await login(target.username, 'Aa1234');
    } catch (err: any) {
      console.error('Demo role switch failed:', err);
      setNotification({
        type: 'error',
        message: err.message || (isRtl ? 'تعذر التبديل' : 'Switch failed')
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setSwitchingTo(null);
    }
  };

  const handleResetDemo = async () => {
    if (resetting) return;
    const confirmText = isRtl ? 'إعادة ضبط البيانات التجريبية لحالتها الأولية؟' : 'Reset demo database?';
    if (!window.confirm(confirmText)) return;

    setResetting(true);
    try {
      const { data } = await api.post('/demo/reset');
      setNotification({
        type: 'success',
        message: data.message || (isRtl ? 'تمت إعادة الضبط بنجاح' : 'Reset successful')
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.message || (isRtl ? 'تعذر إعادة الضبط' : 'Reset failed');
      setNotification({
        type: 'error',
        message: msg
      });
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 font-sans max-w-[95vw]">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`mb-2 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm border animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {notification.type === 'success' ? <Check size={13} /> : <AlertCircle size={13} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Light Theme Pill */}
      <div className="bg-white/95 hover:bg-white backdrop-blur-md text-gray-800 border border-gray-200 shadow-md rounded-full p-1 flex items-center gap-1.5 transition-all">
        {/* Active Role Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100 text-xs font-bold">
          <CurrentIcon size={14} className="text-primary-600" />
          <span className="truncate max-w-[120px] sm:max-w-none">{t(currentRoleInfo.labelKey)}</span>
        </div>

        {/* Collapsed / Expanded Switcher Controls */}
        {!isCollapsed && (
          <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
            {(['superadmin', 'schooladmin', 'driver', 'parent'] as UserRole[])
              .filter((r) => r !== user.role)
              .map((roleKey) => {
                const info = DEMO_USERS_MAP[roleKey];
                const RoleIcon = info.icon;
                const isLoadingThis = switchingTo === roleKey;

                return (
                  <button
                    key={roleKey}
                    type="button"
                    disabled={!!switchingTo}
                    onClick={() => handleRoleSwitch(roleKey)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
                    title={t(info.labelKey)}
                  >
                    {isLoadingThis ? (
                      <Loader2 size={13} className="animate-spin text-primary-600" />
                    ) : (
                      <RoleIcon size={13} className="text-gray-500" />
                    )}
                    <span className="hidden md:inline">{t(info.labelKey)}</span>
                  </button>
                );
              })}

            <div className="h-4 w-px bg-gray-200 mx-1" />

            {/* Reset Demo Data Button */}
            <button
              type="button"
              disabled={resetting}
              onClick={handleResetDemo}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
              title={isRtl ? 'إعادة ضبط البيانات' : 'Reset Data'}
            >
              <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isRtl ? 'إعادة ضبط البيانات' : 'Reset Data'}</span>
            </button>
          </div>
        )}

        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          title={isCollapsed ? (isRtl ? 'تبديل الدور' : 'Switch Role') : (isRtl ? 'تصغير' : 'Minimize')}
        >
          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>
    </div>
  );
};

export default DemoRoleSwitcher;
