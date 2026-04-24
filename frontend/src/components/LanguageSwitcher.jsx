import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('en') ? 'en' : 'ar';

  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-bold">
      {['ar', 'en'].map(lng => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          className={`px-3 py-1.5 transition-colors ${
            current === lng
              ? 'bg-primary-500 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {lng === 'ar' ? 'ع' : 'EN'}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
