import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Compass,
  ShieldCheck,
  School,
  Bus,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Code2,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Lightbulb,
  LucideIcon
} from 'lucide-react';
import { UserRole } from '../context/AuthContext';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchRole: (role: UserRole) => Promise<void> | void;
  onTourComplete?: () => void;
  currentRole?: UserRole;
  initialStep?: number;
}

interface RoleStepConfig {
  roleKey: UserRole;
  icon: LucideIcon;
  themeColor: string;
  bgLight: string;
  borderLight: string;
  textDark: string;
  badgeBg: string;
  badgeText: string;
  btnPrimary: string;
}

const ROLE_STEPS: RoleStepConfig[] = [
  {
    roleKey: 'superadmin',
    icon: ShieldCheck,
    themeColor: 'purple',
    bgLight: 'bg-purple-50/70',
    borderLight: 'border-purple-200',
    textDark: 'text-purple-950',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    btnPrimary: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200'
  },
  {
    roleKey: 'schooladmin',
    icon: School,
    themeColor: 'blue',
    bgLight: 'bg-blue-50/70',
    borderLight: 'border-blue-200',
    textDark: 'text-blue-950',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
  },
  {
    roleKey: 'parent',
    icon: Users,
    themeColor: 'emerald',
    bgLight: 'bg-emerald-50/70',
    borderLight: 'border-emerald-200',
    textDark: 'text-emerald-950',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
  },
  {
    roleKey: 'driver',
    icon: Bus,
    themeColor: 'amber',
    bgLight: 'bg-amber-50/70',
    borderLight: 'border-amber-200',
    textDark: 'text-amber-950',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
  }
];

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({
  isOpen,
  onClose,
  onSwitchRole,
  onTourComplete,
  currentRole,
  initialStep = 0
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep);
      setShowTechDetails(false);
    }
  }, [isOpen, initialStep]);

  useEffect(() => {
    setShowTechDetails(false);
    // Smoothly reset scroll position to top whenever currentStep changes
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalSteps = 5; // 0 = Welcome, 1..4 = Roles
  const isWelcome = currentStep === 0;
  const activeRoleIndex = currentStep - 1;
  const activeRoleConfig = !isWelcome ? ROLE_STEPS[activeRoleIndex] : null;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      if (onTourComplete) {
        onTourComplete();
      }
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSwitchAndClose = async (role: UserRole) => {
    await onSwitchRole(role);
    onClose();
  };

  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;

  const getNextBtnClass = () => {
    if (isWelcome) return 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-200';
    if (!activeRoleConfig) return 'bg-primary-600 hover:bg-primary-700 text-white';
    return activeRoleConfig.btnPrimary;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999999] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 font-sans"
      onClick={onClose}
    >
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 relative text-right"
      >
        {/* TOP HEADER / PROGRESS BAR */}
        <div className="px-5 sm:px-7 pt-4 pb-3 border-b border-gray-100/80 shrink-0 bg-gray-50/50">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-primary-50 text-primary-700 border border-primary-100">
                <BookOpen size={13} className="text-primary-600" />
                <span>{t('guide.badge')}</span>
              </span>
              <span className="text-xs font-semibold text-gray-400">
                {isWelcome
                  ? t('guide.welcome.badge')
                  : t('guide.stepOf', { current: currentStep, total: 4 })}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              title={t('guide.skip')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Stepper Navigation Pills */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            {/* Step 0: Welcome */}
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentStep === 0
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800'
              }`}
              title={t('guide.welcome.title')}
            >
              <Compass size={12} />
              <span className="hidden sm:inline">{t('guide.welcome.badge')}</span>
            </button>

            {/* Steps 1..4: Roles */}
            {ROLE_STEPS.map((roleCfg, idx) => {
              const stepIndex = idx + 1;
              const isSelected = currentStep === stepIndex;
              const isPast = currentStep > stepIndex;
              const Icon = roleCfg.icon;
              const roleTitle = t(`guide.${roleCfg.roleKey}.roleName`);

              return (
                <button
                  key={roleCfg.roleKey}
                  type="button"
                  onClick={() => setCurrentStep(stepIndex)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? `${roleCfg.btnPrimary} shadow-xs`
                      : isPast
                      ? 'bg-gray-200/80 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800'
                  }`}
                  title={roleTitle}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{roleTitle}</span>
                </button>
              );
            })}
          </div>

          {/* Animated Slim Progress Line */}
          <div className="w-full bg-gray-200/70 h-1 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 via-blue-500 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* MAIN CONTENT BODY (Scrollable with custom scrollbar) */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 sm:px-7 py-4 space-y-4 scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200/80 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {/* STEP 0: WELCOME SCREEN */}
          {isWelcome && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Hero Banner */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-700 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10 space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-white border border-white/20">
                    <Compass size={12} />
                    <span>SBTS · Smart Bus Transport System</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black leading-snug">
                    {t('guide.welcome.title')}
                  </h3>
                  <p className="text-xs sm:text-sm text-primary-100 leading-relaxed max-w-xl">
                    {t('guide.welcome.subtitle')}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-primary-200 font-medium pt-0.5">
                    <Clock size={13} />
                    <span>{t('guide.welcome.duration')}</span>
                  </div>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-center space-y-0.5">
                  <div className="text-base sm:text-lg font-black text-purple-900">30+</div>
                  <div className="text-[11px] font-semibold text-purple-700">
                    {t('guide.welcome.stats.schools')}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-center space-y-0.5">
                  <div className="text-base sm:text-lg font-black text-blue-900">100+</div>
                  <div className="text-[11px] font-semibold text-blue-700">
                    {t('guide.welcome.stats.students')}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center space-y-0.5">
                  <div className="text-base sm:text-lg font-black text-emerald-900">4</div>
                  <div className="text-[11px] font-semibold text-emerald-700">
                    {t('guide.welcome.stats.roles')}
                  </div>
                </div>
              </div>

              {/* 4 Roles Overview Tiles */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  {t('guide.capabilities')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLE_STEPS.map((roleCfg, idx) => {
                    const Icon = roleCfg.icon;
                    return (
                      <button
                        key={roleCfg.roleKey}
                        type="button"
                        onClick={() => setCurrentStep(idx + 1)}
                        className={`p-2.5 sm:p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 cursor-pointer hover:shadow-xs ${roleCfg.bgLight} ${roleCfg.borderLight}`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${roleCfg.badgeBg} ${roleCfg.badgeText}`}>
                          <Icon size={16} />
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-gray-900">
                            <span>{t(`guide.${roleCfg.roleKey}.roleName`)}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                            {t(`guide.${roleCfg.roleKey}.tagline`)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Discreet Tech Note for Curious Viewers (Subtle Footer) */}
              <div className="pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                  <Code2 size={13} className="text-gray-400 shrink-0" />
                  <span className="leading-tight">{t('guide.welcome.techStack')}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEPS 1..4: ROLE SCREENS */}
          {!isWelcome && activeRoleConfig && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Role Header Banner */}
              <div className={`p-4 rounded-2xl border ${activeRoleConfig.bgLight} ${activeRoleConfig.borderLight} flex items-start justify-between gap-3`}>
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${activeRoleConfig.badgeBg} ${activeRoleConfig.badgeText} shadow-xs`}>
                    <activeRoleConfig.icon size={22} strokeWidth={2} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-gray-900">
                        {t(`guide.${activeRoleConfig.roleKey}.roleName`)}
                      </h3>
                      {activeRoleConfig.roleKey === 'driver' && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-200 text-amber-900">
                          {t('guide.driver.badge')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-700">
                      {t(`guide.${activeRoleConfig.roleKey}.tagline`)}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed pt-0.5">
                      {t(`guide.${activeRoleConfig.roleKey}.desc`)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Features / Capabilities Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                  <Layers size={15} className="text-primary-600" />
                  <span>{t('guide.capabilities')}</span>
                </div>
                <ul className="space-y-2">
                  {(t(`guide.${activeRoleConfig.roleKey}.features`, { returnObjects: true }) as string[]).map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs text-gray-700 leading-relaxed">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Try It Yourself Steps Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/90 border border-gray-200/80 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                  <Lightbulb size={15} className="text-amber-500" />
                  <span>{t('guide.tryYourself')}</span>
                </div>
                <div className="space-y-2">
                  {(t(`guide.${activeRoleConfig.roleKey}.steps`, { returnObjects: true }) as string[]).map((stepText, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2.5 text-xs text-gray-800">
                      <span className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[11px] font-bold text-gray-700 shrink-0 mt-0.5 shadow-2xs">
                        {sIdx + 1}
                      </span>
                      <span className="leading-relaxed">{stepText}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discrete Subtle Technical Drawer (Secondary info for recruiters / engineers) */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowTechDetails(!showTechDetails)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition-colors py-1 cursor-pointer"
                >
                  <Code2 size={13} />
                  <span>{t('guide.techSideNote')}</span>
                  {showTechDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showTechDetails && (
                  <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-200/80 text-[11px] text-gray-600 leading-relaxed animate-in fade-in duration-150 font-mono">
                    {t(`guide.${activeRoleConfig.roleKey}.tech`)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR (Sticky at bottom) */}
        <div className="px-5 sm:px-7 py-3 border-t border-gray-100 bg-gray-50/90 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Left / Secondary Action: Prev & Skip */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {!isWelcome && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
              >
                <PrevIcon size={14} />
                <span>{t('guide.prev')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 cursor-pointer"
            >
              {t('guide.skip')}
            </button>
          </div>

          {/* Right / Primary Action: Try Role Now & Next */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* If on a role screen, provide instant "Switch to Role" action */}
            {!isWelcome && activeRoleConfig && (
              <button
                type="button"
                onClick={() => handleSwitchAndClose(activeRoleConfig.roleKey)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer ${
                  currentRole === activeRoleConfig.roleKey
                    ? 'bg-gray-100 text-gray-600 border border-gray-200 cursor-default'
                    : activeRoleConfig.btnPrimary
                }`}
              >
                <activeRoleConfig.icon size={14} />
                <span>
                  {currentRole === activeRoleConfig.roleKey
                    ? t('guide.activeHere')
                    : t('guide.tryNow')}
                </span>
              </button>
            )}

            {/* Next / Start Tour / Finish Button */}
            <button
              type="button"
              onClick={handleNext}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer ${getNextBtnClass()}`}
            >
              <span>
                {isWelcome
                  ? t('guide.welcome.startTour')
                  : currentStep === totalSteps - 1
                  ? t('guide.finish')
                  : t('guide.next')}
              </span>
              <NextIcon size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoGuideModal;
