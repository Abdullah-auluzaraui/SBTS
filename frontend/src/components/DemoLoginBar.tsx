import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  School,
  Bus,
  Users,
  Loader2
} from 'lucide-react';

interface DemoLoginBarProps {
  onDemoLogin: (username: string, password: string) => Promise<void>;
  loading: boolean;
}

const DEMO_ROLES = [
  {
    id: 'superadmin',
    username: 'superadmin',
    password: 'Aa1234',
    titleKey: 'roles.superadmin',
    icon: ShieldCheck,
  },
  {
    id: 'schooladmin',
    username: 's_admin',
    password: 'Aa1234',
    titleKey: 'roles.schooladmin',
    icon: School,
  },
  {
    id: 'driver',
    username: 'driver01',
    password: 'Aa1234',
    titleKey: 'roles.driver',
    icon: Bus,
  },
  {
    id: 'parent',
    username: 'parent001',
    password: 'Aa1234',
    titleKey: 'roles.parent',
    icon: Users,
  }
];

export const DemoLoginBar: React.FC<DemoLoginBarProps> = ({ onDemoLogin, loading }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleRoleClick = async (role: typeof DEMO_ROLES[0]) => {
    if (loading) return;
    setSelectedRole(role.id);
    try {
      await onDemoLogin(role.username, role.password);
    } finally {
      setSelectedRole(null);
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-gray-700">
          {isRtl ? 'تسجيل دخول تجريبي سريع' : 'Quick Demo Login'}
        </span>
        <span className="text-[11px] text-gray-400">
          {isRtl ? 'اختر دوراً لتسجيل الدخول الفوري' : 'Select role to sign in instantly'}
        </span>
      </div>

      {/* 4 Clean Light Role Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DEMO_ROLES.map((role) => {
          const Icon = role.icon;
          const isCurrentLoading = loading && selectedRole === role.id;

          return (
            <button
              key={role.id}
              type="button"
              disabled={loading}
              onClick={() => handleRoleClick(role)}
              className={`flex flex-col items-start text-start p-3 bg-gray-50 hover:bg-white border border-gray-200 rounded-xl transition-all ${
                loading && !isCurrentLoading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:border-primary-500 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-700 flex items-center justify-center shadow-xs">
                  {isCurrentLoading ? (
                    <Loader2 size={14} className="animate-spin text-primary-500" />
                  ) : (
                    <Icon size={14} strokeWidth={1.75} />
                  )}
                </div>
                <span className="text-[10px] font-mono text-gray-400 font-medium">
                  {role.username}
                </span>
              </div>

              <div className="text-xs font-bold text-gray-800 truncate w-full">
                {t(role.titleKey)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DemoLoginBar;
