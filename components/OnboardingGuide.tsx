import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';

interface Step {
  targetId: string;
  title: string;
  message: string;
  placement: 'top' | 'bottom';
}

interface Props {
  onComplete: () => void;
}

const STEPS: Step[] = [
  {
    targetId: 'lang-switch',
    title: 'Select Language',
    message: 'Change to English, Japanese, or Burmese here.\n言語はこちらで変更できます。',
    placement: 'bottom'
  },
  {
    targetId: 'mobile-nav',
    title: 'Navigation',
    message: 'Use these tabs to view the Schedule, Access, and RSVP.',
    placement: 'top'
  }
];

const OnboardingGuide: React.FC<Props> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [styles, setStyles] = useState<{ tooltip: React.CSSProperties, arrow: React.CSSProperties } | null>(null);
  const [visible, setVisible] = useState(false);

  const currentStep = STEPS[currentStepIndex];

  const updatePosition = useCallback(() => {
    const element = document.getElementById(currentStep.targetId);
    
    // Check if element exists and is visible (e.g., mobile nav is hidden on desktop)
    if (!element || element.offsetParent === null || window.getComputedStyle(element).display === 'none') {
        if (currentStepIndex < STEPS.length - 1) {
             setCurrentStepIndex(prev => prev + 1);
        } else {
             onComplete();
        }
        return;
    }

    const rect = element.getBoundingClientRect();
    const scrollY = window.scrollY;
    const viewWidth = window.innerWidth;
    
    // Layout Constants
    // Max width 280px, but ensure it fits on very small screens (320px) with padding
    const padding = 20; // Safe distance from screen edge
    const tooltipWidth = Math.min(280, viewWidth - (padding * 2)); 
    
    // 1. Calculate Horizontal Position (Left)
    const targetCenterX = rect.left + rect.width / 2;
    let left = targetCenterX - (tooltipWidth / 2);
    
    // Clamp to viewport to prevent horizontal scroll/overflow
    if (left < padding) left = padding;
    if (left + tooltipWidth > viewWidth - padding) {
        left = viewWidth - tooltipWidth - padding;
    }

    // 2. Calculate Arrow Horizontal Position (Relative to Tooltip)
    // The arrow must point to targetCenterX, regardless of where the tooltip is clamped
    let arrowLeft = targetCenterX - left - 8; // 8 is half of arrow width (16px)
    
    // Clamp arrow to be safely within the tooltip's border radius area
    if (arrowLeft < 12) arrowLeft = 12;
    if (arrowLeft > tooltipWidth - 28) arrowLeft = tooltipWidth - 28;

    // 3. Calculate Vertical Position (Top)
    let top = 0;
    let arrowStyle: React.CSSProperties = {};

    if (currentStep.placement === 'top') {
        // Place ABOVE the target (Mobile Nav)
        // We assume approx tooltip height ~160px. 
        top = rect.top + scrollY - 180; 
        
        arrowStyle = {
            bottom: '-8px', // Push arrow out of box bottom
            left: `${arrowLeft}px`,
            transform: 'rotate(225deg)', // Point down
            borderTop: '1px solid rgba(200, 175, 100, 0.3)', 
            borderLeft: '1px solid rgba(200, 175, 100, 0.3)'
        };
    } else {
        // Place BELOW the target (Language Switch)
        top = rect.bottom + scrollY + 16; // 16px gap

        arrowStyle = {
            top: '-8px', // Push arrow out of box top
            left: `${arrowLeft}px`,
            transform: 'rotate(45deg)', // Point up
            borderTop: '1px solid rgba(200, 175, 100, 0.3)', 
            borderLeft: '1px solid rgba(200, 175, 100, 0.3)'
        };
    }

    setStyles({
        tooltip: { top, left, width: tooltipWidth },
        arrow: arrowStyle
    });
    setVisible(true);
  }, [currentStep, currentStepIndex, onComplete]);

  useEffect(() => {
    setVisible(false);
    // Small delay to allow DOM render/layout settle
    const timer = setTimeout(updatePosition, 100);
    
    // Update position on resize and scroll to keep it attached
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
    };
  }, [updatePosition]);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setVisible(false);
      setTimeout(() => setCurrentStepIndex(prev => prev + 1), 300);
    } else {
      onComplete();
    }
  };

  if (!styles) return null;

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[110]">
      {/* Tooltip Card */}
      <div 
        className={`absolute z-[110] bg-white rounded-xl shadow-2xl p-5 border border-wedding-gold/30 pointer-events-auto transition-all duration-500 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={styles.tooltip}
      >
        {/* Arrow */}
        <div 
            className="absolute w-4 h-4 bg-white" 
            style={styles.arrow}
        />

        <div className="relative z-10">
            <button onClick={onComplete} className="absolute -top-2 -right-2 text-gray-400 hover:text-gray-600 p-1">
                <X size={16} />
            </button>
            
            <h3 className="text-wedding-gold font-serif font-bold text-lg mb-2">{currentStep.title}</h3>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed whitespace-pre-wrap">{currentStep.message}</p>
            
            <div className="flex justify-between items-center mt-2">
                <div className="flex gap-1">
                    {STEPS.map((_, idx) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentStepIndex ? 'bg-wedding-gold' : 'bg-gray-200'}`} />
                    ))}
                </div>
                <button 
                    onClick={handleNext}
                    className="flex items-center gap-1 bg-wedding-gold text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide hover:bg-wedding-text transition-colors shadow-md"
                >
                    {currentStepIndex === STEPS.length - 1 ? 'Got it' : 'Next'}
                    {currentStepIndex === STEPS.length - 1 ? <Check size={14} /> : <ChevronRight size={14} />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuide;