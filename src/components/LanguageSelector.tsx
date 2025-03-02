
import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { Language } from '@/types';

interface LanguageSelectorProps {
  value: Language | null;
  onChange: (language: Language) => void;
  disabled?: boolean;
  label: string;
  excludedCode?: string;
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  label,
  excludedCode,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const filteredLanguages = React.useMemo(() => {
    return SUPPORTED_LANGUAGES.filter(lang => lang.code !== excludedCode);
  }, [excludedCode]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <div 
        ref={dropdownRef}
        className={cn(
          "glass-panel p-3 flex items-center justify-between w-full cursor-pointer button-transition",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:border-primary/70",
          isOpen ? "border-primary/70 ring-1 ring-primary/30" : ""
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={cn(value ? "" : "text-muted-foreground")}>
          {value ? value.name : "Select language"}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen ? "transform rotate-180" : ""
          )} 
        />
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full glass-panel p-1 max-h-60 overflow-auto animate-fade-in">
          <div className="py-1">
            {filteredLanguages.map((language) => (
              <div
                key={language.code}
                className={cn(
                  "px-4 py-2 text-sm rounded-lg cursor-pointer button-transition",
                  value?.code === language.code ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                )}
                onClick={() => {
                  onChange(language);
                  setIsOpen(false);
                }}
              >
                {language.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
