import React from 'react';
import { Language } from '../types';

interface Props {
  current: Language;
  onChange: (lang: Language) => void;
}

const LanguageSwitch: React.FC<Props> = ({ current, onChange }) => {
  return (
    <div id="lang-switch" className="fixed top-4 right-4 z-50 bg-white/80 backdrop-blur-md rounded-full shadow-lg p-1 flex gap-1">
      {(['en', 'ja', 'my'] as Language[]).map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`
            px-3 py-1 rounded-full text-xs font-medium transition-all
            ${current === lang 
              ? 'bg-wedding-text text-white shadow-sm' 
              : 'text-gray-500 hover:text-wedding-text hover:bg-gray-100'}
          `}
        >
          {lang === 'en' ? 'EN' : lang === 'ja' ? 'JP' : 'MY'}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitch;