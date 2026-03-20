import React, { useState, useEffect } from 'react';
import { WeddingData } from '../types';

interface Props {
  data: WeddingData;
  onOpen: () => void;
}

type AnimationStage = 'closed' | 'opening' | 'extracting' | 'zooming' | 'revealing' | 'finished';

const EnvelopeOverlay: React.FC<Props> = ({ data, onOpen }) => {
  const [stage, setStage] = useState<AnimationStage>('closed');

  const playPaperSound = () => {
      const audio = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3'); 
      //const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2414/2414-preview.mp3'); 
      audio.volume = 0.5;
      audio.play().catch(() => {});
  };

  const startSequence = () => {
    if (stage !== 'closed') return;
    playPaperSound();
    setStage('opening');
    document.body.style.overflow = '';
    setTimeout(() => setStage('extracting'), 400);
    setTimeout(() => setStage('zooming'), 1400);
    setTimeout(() => {
        setStage('revealing');
        onOpen(); 
    }, 2400); 
    setTimeout(() => setStage('finished'), 3500); 
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleWheel = (e: WheelEvent) => { if (stage === 'closed' && Math.abs(e.deltaY) > 5) startSequence(); };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      document.body.style.overflow = '';
    };
  }, [stage]);

  if (stage === 'finished') return null;

  const isOpeningOrLater = stage !== 'closed';
  const isExtractingOrLater = ['extracting', 'zooming', 'revealing', 'finished'].includes(stage);
  const isZoomingOrLater = ['zooming', 'revealing', 'finished'].includes(stage);
  const isRevealing = stage === 'revealing';
  const flapZIndex = isExtractingOrLater ? 1 : 30; 

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-1000 ease-in-out ${isRevealing ? 'opacity-0 pointer-events-none' : 'opacity-100 bg-stone-900/90 backdrop-blur-sm'}`}
      style={{ touchAction: 'none' }}
      onClick={startSequence}
    >
      <div className="relative w-full max-w-lg perspective-1000">
         <div className={`relative w-full aspect-[1.5] transition-all duration-1000 ease-in-out ${isZoomingOrLater ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-[#f3f0e9] rounded-sm shadow-2xl overflow-hidden border border-[#e6e2d8] z-0">
                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
            </div>
            <div className="absolute inset-0 z-20 pointer-events-none filter drop-shadow-md">
                <svg viewBox="0 0 300 200" className="w-full h-full" preserveAspectRatio="none">
                    <path d="M0,0 L140,110 L0,200 Z" fill="#e6e2d8" />
                    <path d="M300,0 L160,110 L300,200 Z" fill="#e6e2d8" />
                    <path d="M0,200 L150,90 L300,200 Z" fill="#ece8df" />
                    <path d="M0,200 L150,90 L300,200" fill="none" stroke="#dcd8cc" strokeWidth="1" />
                </svg>
            </div>
            <div 
                className="absolute top-0 left-0 right-0 h-1/2 origin-top transition-transform duration-[800ms] ease-in-out"
                style={{ zIndex: flapZIndex, transformStyle: 'preserve-3d', transform: isOpeningOrLater ? 'rotateX(180deg)' : 'rotateX(0deg)' }}
            >
                 <div className="absolute inset-0 backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
                     <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none"><path d="M0,0 L150,110 L300,0 Z" fill="#dcd8cc" /></svg>
                     <div className={`absolute top-[90%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 transition-opacity duration-300 ${isOpeningOrLater ? 'opacity-0' : 'opacity-100'}`}>
                        <div className="relative group cursor-pointer animate-pulse">
                            <div className="w-16 h-16 bg-[#8a1c1c] rounded-full border-4 border-[#701515] shadow-lg flex items-center justify-center">
                                <span className="text-white/90 font-serif italic font-bold text-sm">Open</span>
                            </div>
                        </div>
                     </div>
                 </div>
                 <div className="absolute inset-0 backface-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: '#f3f0e9', clipPath: 'polygon(0 0, 50% 100%, 100% 0)' }}>
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
                 </div>
            </div>
         </div>

         <div 
            className={`bg-[#FDFBF7] shadow-lg rounded flex flex-col items-center justify-center text-center z-10 transition-all duration-[1000ms] cubic-bezier(0.4, 0, 0.2, 1) ${isZoomingOrLater ? 'fixed inset-0 w-screen h-screen z-[1000] scale-100 rounded-none' : 'absolute left-4 right-4 top-4 bottom-4'}`}
            style={{ transform: !isZoomingOrLater && isExtractingOrLater ? 'translateY(-60%)' : 'translateY(0)', zIndex: isZoomingOrLater ? 100 : 10 }}
         >
            <div className={`w-full h-full flex flex-col items-center justify-center border border-wedding-gold/30 p-4 md:p-8 transition-opacity duration-500 ${isRevealing ? 'opacity-0' : 'opacity-100'}`}>
                <p className="text-wedding-gold text-[10px] md:text-xs tracking-[0.4em] uppercase mb-6 md:mb-8">Invitation</p>
                <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-gray-800 mb-3 md:mb-4 uppercase tracking-[0.15em] md:tracking-[0.3em] font-light break-words w-full px-2">{data.groomName.en}</h2>
                <span className="text-base md:text-lg text-wedding-gold font-script italic mb-3 md:mb-4">&</span>
                <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-gray-800 mb-6 md:mb-8 uppercase tracking-[0.15em] md:tracking-[0.3em] font-light break-words w-full px-2">{data.brideName.en}</h2>
                <div className="w-12 h-[1px] bg-wedding-gold mb-4"></div>
                <p className="text-[10px] md:text-xs text-gray-500 font-serif uppercase tracking-widest">{new Date(data.date).toLocaleDateString()}</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default EnvelopeOverlay;