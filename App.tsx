import React, { useState, useEffect, useRef, Suspense } from 'react';
import { WeddingData, Language, DEFAULT_DATA } from './types';
import LanguageSwitch from './components/LanguageSwitch';
import Countdown from './components/Countdown';
import RsvpForm from './components/RsvpForm'; 
import EnvelopeOverlay from './components/EnvelopeOverlay'; 
import OnboardingGuide from './components/OnboardingGuide';
import { MapPin, Clock, Volume2, VolumeX, ChevronDown, Camera } from 'lucide-react'; // Reduced imports for main bundle

// Lazy Load Admin Panel - This splits the code into a separate chunk!
// It will NOT be loaded by guests on the live website.
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
// If the environment says Admin is disabled, this code block becomes "dead code"
// and the build tool (Vite) will remove it entirely from the public site.
const showAdminPanel = import.meta.env.VITE_ENABLE_ADMIN === 'true' || import.meta.env.DEV;

const TRANSLATIONS = {
  en: {
    saveTheDate: "Save The Date",
    invitation: "Wedding Invitation",
    days: "Days", hours: "Hours", mins: "Mins", secs: "Secs",
    schedule: "Plan",
    access: "Access",
    faq: "FAQ",
    gallery: "Gallery",
    rsvp: "RSVP",
    rsvpNote: "Please respond by filling out the form below.",
    presentedBy: "Presented by Amoré Wedding Tokyo",
    addToCal: "Add to Calendar",
    googleCal: "Google Calendar",
    appleCal: "Apple / Outlook",
    copied: "Copied!",
    copyAddr: "Copy Address"
  },
  ja: {
    saveTheDate: "Save The Date",
    invitation: "結婚式のご案内",
    days: "日", hours: "時間", mins: "分", secs: "秒",
    schedule: "進行",
    access: "アクセス",
    faq: "Q&A",
    gallery: "写真",
    rsvp: "出欠",
    rsvpNote: "以下のフォームよりご回答をお願いいたします。",
    presentedBy: "Presented by Amoré Wedding Tokyo",
    addToCal: "カレンダーに追加",
    googleCal: "Googleカレンダー",
    appleCal: "Apple / Outlook",
    copied: "コピーしました!",
    copyAddr: "住所をコピー"
  },
  my: {
    saveTheDate: "ရက်စွဲမှတ်ထားပေးပါ",
    invitation: "မင်္ဂလာဖိတ်စာ",
    days: "ရက်", hours: "နာရီ", mins: "မိနစ်", secs: "စက္ကန့်",
    schedule: "အစီအစဉ်",
    access: "တည်နေရာ",
    faq: "မေးခွန်းများ",
    gallery: "အမှတ်တရများ",
    rsvp: "အကြောင်းပြန်ရန်",
    rsvpNote: "ကျေးဇူးပြု၍ အောက်ပါပုံစံကိုဖြည့်ပါ",
    presentedBy: "Amoré Wedding Tokyo မှ တင်ဆက်သည်",
    addToCal: "ပြက္ခဒိန်တွင်မှတ်သားရန်",
    googleCal: "Google Calendar",
    appleCal: "Apple / Outlook",
    copied: "ကူးယူပြီးပါပြီ!",
    copyAddr: "လိပ်စာကူးယူရန်"
  }
};

// Helper to convert hex to space-separated RGB
const hexToRgb = (hex: string) => {
  if (!hex || typeof hex !== 'string') return '0 0 0';
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '0 0 0';
};

const ensureEmbedUrl = (url: string): string => {
  if (!url) return '';
  if (url.includes('/embed') || url.includes('output=embed')) return url;
  if (url.includes('<iframe')) {
      const match = url.match(/src="([^"]+)"/);
      if (match) return match[1];
  }
  const query = encodeURIComponent(url.trim());
  return `https://maps.google.com/maps?q=${query}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
};

const replacePhotoPathsWithEventFolder = (data: WeddingData, eventParam: string | null): WeddingData => {
  if (!eventParam) return data; // No event param, return data as-is
  
  // Convert event param to folder name: aki.mimi -> aki_mimi
  const eventFolder = eventParam.replace(/\./g, '_');
  
  const replacePhotoPaths = (str: string): string => {
    return str.replace(/\.\/photos\/\[event-folder\]/g, `./photos/${eventFolder}`);
  };
  
  return {
    ...data,
    images: {
      hero: replacePhotoPaths(data.images?.hero || ''),
      groom: replacePhotoPaths(data.images?.groom || ''),
      bride: replacePhotoPaths(data.images?.bride || '')
    },
    gallery: (data.gallery || []).map(img => replacePhotoPaths(img))
  };
};

const App: React.FC = () => {
  const [data, setData] = useState<WeddingData>(DEFAULT_DATA);
  const [lang, setLang] = useState<Language>('en');
  
  // App Modes
  const [isAdminAvailable, setIsAdminAvailable] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  
  const [view, setView] = useState<'invitation' | 'rsvp'>('invitation');
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs
  const scheduleRef = useRef<HTMLDivElement>(null);
  const accessRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  // DOM ref for the embedded map iframe to help debug deployed behavior
  const mapFrameRef = useRef<HTMLIFrameElement | null>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) ref.current.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Initialization & Data Loading
  useEffect(() => {
    // SECURITY: Control Admin Access based on Build Environment
    let isBuildEnabled = false;
    
    try {
        // @ts-ignore
        // Safely check for import.meta and import.meta.env
        const meta = import.meta;
        // @ts-ignore
        if (meta && meta.env) {
            // @ts-ignore
            const env = meta.env;
            // 1. If running locally ('npm run dev'), env.DEV is usually true.
            // 2. If running in production, DEV is false. Admin is DISABLED unless VITE_ENABLE_ADMIN=true is set.
            isBuildEnabled = env.VITE_ENABLE_ADMIN === 'true' || env.DEV === true;
        }
    } catch (e) {
        console.warn("Environment check failed, defaulting to secure mode.", e);
    }
    
    if (isBuildEnabled) {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        const params = new URLSearchParams(window.location.search);
        const isExplicitAdmin = params.get('mode') === 'admin';

        // Even if enabled in build, we double-check we are on localhost OR explicitly requested via URL
        if (isLocal || isExplicitAdmin) {
            setIsAdminAvailable(true);
            if (isExplicitAdmin) setShowAdmin(true);
        }
    }

    // Load External Configuration (The "Database")
    // Support dynamic event parameter: ?event=aki.mimi loads wedding-data_aki_mimi.json
    const params = new URLSearchParams(window.location.search);
    const eventParam = params.get('event');
    
    // Build the data filename based on event parameter
    let dataFile = './wedding-data.json';
    if (eventParam) {
      // Convert dots to underscores for filename: aki.mimi -> aki_mimi
      const eventFileName = eventParam.replace(/\./g, '_');
      dataFile = `./wedding-data_${eventFileName}.json`;
    }

    // Client-side cache/version strategy
    const ASSET_VERSION = import.meta.env.VITE_ASSET_VERSION || null; // set this in CI (recommended)
    const ASSET_TTL_HOURS = Number(import.meta.env.VITE_ASSET_TTL_HOURS) || 24; // fallback TTL when no version provided

    try {
      const storedVersion = localStorage.getItem('amore_asset_version');
      if (ASSET_VERSION) {
        if (storedVersion !== ASSET_VERSION) {
          console.info('Asset version changed; clearing cached wedding data and service workers.');
          localStorage.removeItem('amore_wedding_data');
          localStorage.setItem('amore_asset_version', ASSET_VERSION);
          // Unregister any active service workers to avoid stale SW caching
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister().then(() => console.debug('Service worker unregistered.')))).catch(() => {});
          }
        }
      } else {
        // No build-time version provided — use TTL to occasionally clear cache
        const lastCheck = Number(localStorage.getItem('amore_version_checked') || 0);
        if (!lastCheck || (Date.now() - lastCheck) > ASSET_TTL_HOURS * 3600 * 1000) {
          console.info('No asset version set; TTL expired — clearing cached wedding data.');
          localStorage.removeItem('amore_wedding_data');
          localStorage.setItem('amore_version_checked', String(Date.now()));
        }
      }
    } catch (e) {
      console.debug('Cache/version check failed', e);
    }

    // Build the fetch URL with a cache-busting query parameter (prefer build-time version if available)
    const assetKey = ASSET_VERSION || localStorage.getItem('amore_asset_version') || localStorage.getItem('amore_version_checked') || String(Date.now());
    const dataFileUrl = `${dataFile}${dataFile.includes('?') ? '&' : '?'}v=${assetKey}`;

    // Debugging: print which file we are attempting to fetch (helps diagnose mobile issues)
    console.debug('Attempting to fetch wedding config:', dataFileUrl);

    fetch(dataFileUrl)
      .then(async res => {
        // If the response is not OK, bail out
        if (!res.ok) {
          console.warn("External config fetch failed with status:", res.status, res.statusText);
          throw new Error("No external config found");
        }

        // If the server responds with HTML (common when static hosts rewrite unknown files to index.html),
        // log a helpful warning and bail out so we fall back to the default data.
        const contentType = (res.headers.get("content-type") || '').toLowerCase();
        if (contentType.includes('text/html')) {
          const body = await res.text();
          console.warn("External config fetch returned HTML (likely a 404 rewrite to index.html).\nStatus:", res.status, "Snippet:", body.slice(0, 300));
          throw new Error("Invalid external config (HTML received)");
        }

        // Try to parse JSON; if parsing fails, show a snippet of the response for diagnosis.
        try {
          return await res.json();
        } catch (e) {
          const body = await res.clone().text();
          console.warn("Failed to parse JSON when loading external config. Snippet:", body.slice(0, 300));
          throw new Error("Invalid JSON response when loading external config");
        }
      })
      .then(externalData => {
        console.log("Loaded wedding configuration");
        // Merge to ensure no missing keys
        let merged = { 
          ...DEFAULT_DATA, 
          ...externalData,
          location: { 
            ...DEFAULT_DATA.location, 
            ...(externalData.location || {}),
            mapUrl: ensureEmbedUrl(externalData.location?.mapUrl || DEFAULT_DATA.location.mapUrl)
          },
          images: { ...DEFAULT_DATA.images, ...(externalData.images || {}) },
          theme: { ...DEFAULT_DATA.theme, ...(externalData.theme || {}) },
          fonts: { ...DEFAULT_DATA.fonts, ...(externalData.fonts || {}) },
          visuals: { ...DEFAULT_DATA.visuals, ...(externalData.visuals || {}) },
        };
        
        // Replace photo paths with event-specific folder
        merged = replacePhotoPathsWithEventFolder(merged, eventParam);

        // Diagnostic: show exactly what map URL we ended up with in the merged data
        console.debug("External mapUrl:", externalData.location?.mapUrl);
        console.debug("Merged location.mapUrl:", merged.location?.mapUrl);
        if (merged.location?.mapUrl === DEFAULT_DATA.location.mapUrl) {
          console.warn("Merged map URL equals DEFAULT_DATA.location.mapUrl — the external config might not include a mapUrl or it was rejected.");
        }

        setData(merged);
      })
      .catch((e) => {
         console.log("Using default/local data (" + e.message + ")");
         // Fallback to localStorage for development convenience
         const saved = localStorage.getItem('amore_wedding_data');
         if (saved) {
           try {
             setData({ ...DEFAULT_DATA, ...JSON.parse(saved) });
           } catch (e) { localStorage.removeItem('amore_wedding_data'); }
         }
      });
  }, []);

  // 2. Audio Logic
  useEffect(() => {
    if (data.musicUrl) {
        try {
            audioRef.current = new Audio(data.musicUrl);
            audioRef.current.loop = true;
        } catch (e) { console.error("Audio init failed", e); }
    }
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    };
  }, [data.musicUrl]);

  const toggleMusic = () => {
      if (!audioRef.current) return;
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(e => console.log("Play failed", e));
      setIsPlaying(!isPlaying);
  };

  const handleEnvelopeOpen = () => {
      setIsEnvelopeOpen(true);
      if (audioRef.current && !isPlaying) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      
      // Trigger Onboarding Guide after envelope animation finishes (approx 3.5s sequence, but content is visible earlier)
      // We check if they have seen it before
      const hasSeen = localStorage.getItem('amore_guide_seen');
      if (!hasSeen && !showAdmin) {
          setTimeout(() => setShowGuide(true), 3500); 
      }
  };
  
  // Handle case where envelope is disabled
  useEffect(() => {
      if (data.visuals && !data.visuals.enableEnvelope) {
          const hasSeen = localStorage.getItem('amore_guide_seen');
          if (!hasSeen && !showAdmin) {
               // Small delay for initial render
               setTimeout(() => setShowGuide(true), 1500);
          }
      }
  }, [data.visuals, showAdmin]);

  const handleGuideComplete = () => {
      setShowGuide(false);
      localStorage.setItem('amore_guide_seen', 'true');
  };

  const handleUpdateData = (newData: WeddingData) => {
    setData(newData);
    localStorage.setItem('amore_wedding_data', JSON.stringify(newData));
  };

  // 3. Render Logic
  const t = TRANSLATIONS[lang];
  const d = new Date(data.date);
  const dateObj = isNaN(d.getTime()) ? new Date() : d;
  
  const formattedDate = dateObj.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : 'en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Calendar Links
  const generateCalendarLinks = () => {
    const start = isNaN(new Date(data.date).getTime()) ? new Date() : new Date(data.date);
    const end = new Date(start.getTime() + (4 * 60 * 60 * 1000));
    const title = `${data.groomName.en} & ${data.brideName.en} Wedding`;
    const location = `${data.location.name.en}, ${data.location.address.en}`;
    const details = `Join us for the wedding of ${data.groomName.en} and ${data.brideName.en}!`;
    const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${end.toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;
    const downloadIcs = () => {
      const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nURL:${window.location.href}\nDTSTART:${start.toISOString().replace(/-|:|\.\d\d\d/g, "")}\nDTEND:${end.toISOString().replace(/-|:|\.\d\d\d/g, "")}\nSUMMARY:${title}\nDESCRIPTION:${details}\nLOCATION:${location}\nEND:VEVENT\nEND:VCALENDAR`;
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', 'wedding-invite.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    return { googleUrl, downloadIcs };
  };
  const { googleUrl, downloadIcs } = generateCalendarLinks();

  const processFaqText = (text: string) => {
    let processed = text;
    if (processed.includes('{{time}}')) processed = processed.replace(/{{time}}/g, dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: lang !== 'ja' }));
    if (processed.includes('{{deadline}}')) processed = processed.replace(/{{deadline}}/g, new Date(data.rsvpDeadline).toLocaleDateString());
    return processed;
  };

  const activeFont = data.fonts?.[lang] || DEFAULT_DATA.fonts[lang];
  const theme = data.theme || DEFAULT_DATA.theme;
  const styleVars = {
    '--color-primary': hexToRgb(theme.primary),
    '--color-text': hexToRgb(theme.text),
    '--color-bg-tint': hexToRgb(theme.backgroundTint),
    '--font-main': activeFont ? activeFont.replace(/"/g, '') : 'serif', 
  } as React.CSSProperties;

  // Log actual DOM iframe src after the merged mapUrl is applied so we can detect differences in deployed builds
  useEffect(() => {
    // Small timeout allows DOM to update
    const t = setTimeout(() => {
      try {
        const domSrc = mapFrameRef.current?.getAttribute('src');
        console.debug('Map iframe DOM src (from ref):', domSrc);
        // Attempt to read the iframe's current location - will throw if cross-origin
        try {
          const winLoc = mapFrameRef.current?.contentWindow?.location?.href;
          console.debug('Map iframe contentWindow.location.href:', winLoc);
        } catch (e) {
          console.debug('Map iframe contentLocation: cross-origin or unavailable');
        }
      } catch (e) {
        console.debug('Map iframe debug failed', e);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [data.location.mapUrl]);

  const showEnvelope = data.visuals?.enableEnvelope && !isEnvelopeOpen && !showAdmin;
  const contentAnimationClass = (!data.visuals?.enableEnvelope || isEnvelopeOpen) && data.visuals?.enableAnimations ? 'fade-in' : 'opacity-0';

  return (
    <div 
      className="relative min-h-screen pb-24 overflow-x-hidden selection:bg-wedding-gold selection:text-white"
      style={styleVars}
    >
      {!data.visuals?.enableAnimations && (
        <style>{`*, *::before, *::after { animation: none !important; transition: none !important; }`}</style>
      )}

      {showEnvelope && <EnvelopeOverlay data={data} onOpen={handleEnvelopeOpen} />}

      <LanguageSwitch current={lang} onChange={setLang} />
      
      {/* Onboarding Guide for Guests */}
      {showGuide && <OnboardingGuide onComplete={handleGuideComplete} />}

      {data.musicUrl && (
          <button
            onClick={toggleMusic}
            className="fixed top-4 left-4 z-50 bg-white/80 backdrop-blur-md rounded-full shadow-lg p-2 text-gray-600 hover:text-wedding-text hover:bg-white transition-all animate-fade-in"
          >
             {isPlaying ? <Volume2 size={20} className="text-wedding-gold animate-pulse" /> : <VolumeX size={20} />}
          </button>
      )}

      {/* Admin Panel Loading (Code Splitting) */}
      {showAdminPanel && isAdminAvailable && (
        <Suspense fallback={null}>
            {!showAdmin && (
                 <button 
                    onClick={() => setShowAdmin(true)} 
                    // Changed: z-index increased to 200 (above envelope) so it is always clickable in dev mode
                    className="fixed bottom-24 left-4 z-[200] px-4 py-2 bg-black/80 text-white rounded-full shadow-lg text-xs font-bold hover:bg-black transition-all"
                >
                    Edit Website
                </button>
            )}
            {showAdmin && <AdminPanel data={data} onUpdate={handleUpdateData} onClose={() => setShowAdmin(false)} />}
        </Suspense>
      )}

      {view === 'rsvp' ? (
        <RsvpForm language={lang} googleScriptUrl={data.googleScriptUrl} faq={data.faq} weddingData={data} onBack={() => setView('invitation')} />
      ) : (
        <>
          <header className="relative h-screen min-h-[700px] flex items-center justify-center text-center overflow-hidden">
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-105"
              style={{ backgroundImage: `url(${data.images?.hero || DEFAULT_DATA.images.hero})` }}
            />
            {/* Piary Style: Darker overlay to make white text pop more elegantly */}
            <div className="absolute inset-0 bg-black/10 z-0" />
            
            <div className={`relative z-10 text-white p-6 w-full max-w-5xl mx-auto h-full flex flex-col justify-center items-center transition-opacity duration-1000 ${contentAnimationClass}`}>
               
                {/* Vertical Japanese Text (Piary Style) - Visible on Mobile now */}
                <div className="absolute top-12 right-6 md:top-24 md:right-12 h-3/4 writing-vertical text-2xl md:text-4xl font-serif text-white drop-shadow-lg tracking-[0.5em] opacity-90 flex flex-col justify-center pointer-events-none z-0">
                     <span className="mb-8">{data.groomName.ja}</span>
                     <span className="mb-8 text-[0.5em]">●</span>
                     <span>{data.brideName.ja}</span>
                </div>

                <div className="flex flex-col items-center relative z-10">
                    <p className="text-sm md:text-xl tracking-[0.3em] uppercase mb-12 drop-shadow-md text-white font-serif border-b border-white/60 pb-2">{t.saveTheDate}</p>
                    
                    <div className="relative mb-8 py-4">
                        <h1 className="font-script text-7xl md:text-9xl mb-4 drop-shadow-2xl text-white flex flex-col md:block items-center">
                            <span>{data.groomName.en}</span>
                            <span className="text-4xl align-middle mx-4 text-wedding-gold/90 my-2">&</span>
                            <span>{data.brideName.en}</span>
                        </h1>
                    </div>

                    <div className="inline-block bg-white/10 backdrop-blur-[4px] border border-white/30 py-4 px-10 rounded-sm mt-8">
                        <p className="text-xl md:text-3xl font-serif tracking-[0.2em] drop-shadow-md text-white">{formattedDate}</p>
                    </div>
                </div>
            </div>

            <div className={`absolute bottom-24 left-1/2 -translate-x-1/2 z-10 animate-bounce transition-opacity duration-1000 ${contentAnimationClass}`}>
                <div className="text-white/90 flex flex-col items-center gap-2">
                    <span className="text-[10px] tracking-widest uppercase">Scroll</span>
                    <ChevronDown size={24} />
                </div>
            </div>
          </header>

          <main className="max-w-4xl mx-auto bg-white relative z-20 shadow-2xl pb-12">
            
            {/* Greeting Section */}
            <section className="text-center pt-24 pb-16 px-8 md:px-12 bg-white">
              <div className="mb-12 flex flex-col items-center">
                  <div className="h-16 w-[1px] bg-wedding-gold mb-6"></div>
                  <p className="text-wedding-gold text-xs tracking-[0.3em] uppercase mb-4">Welcome</p>
                  <h2 className="text-3xl md:text-4xl font-serif text-wedding-text">{t.invitation}</h2>
              </div>
              <p className="whitespace-pre-wrap leading-loose text-gray-600 font-light text-md md:text-lg max-w-2xl mx-auto font-serif">{data.message[lang]}</p>
            </section>

             {/* Profile Section - Refined for Piary Look (Cleaner, no rotation on mobile) */}
             <section className="py-20 px-6 overflow-hidden bg-[#faf9f6]">
                <div className="flex flex-col md:flex-row justify-center items-center gap-12 md:gap-24 relative max-w-5xl mx-auto">
                    
                    {/* Groom */}
                    <div className="relative group text-center w-full max-w-xs">
                        <div className="aspect-[3/4] overflow-hidden relative shadow-md bg-white p-2">
                             <div className="w-full h-full overflow-hidden relative">
                                <img src={data.images.groom} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-95 group-hover:opacity-100" />
                             </div>
                        </div>
                        <div className="mt-6">
                             <h3 className="text-2xl font-serif text-wedding-text">{data.groomName[lang]}</h3>
                             <p className="text-xs text-wedding-gold uppercase tracking-widest mt-1">Groom</p>
                        </div>
                    </div>

                    <div className="hidden md:block font-script text-5xl text-wedding-gold/20">&</div>

                    {/* Bride */}
                    <div className="relative group text-center w-full max-w-xs">
                        <div className="aspect-[3/4] overflow-hidden relative shadow-md bg-white p-2">
                             <div className="w-full h-full overflow-hidden relative">
                                <img src={data.images.bride} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-95 group-hover:opacity-100" />
                             </div>
                        </div>
                         <div className="mt-6">
                             <h3 className="text-2xl font-serif text-wedding-text">{data.brideName[lang]}</h3>
                             <p className="text-xs text-wedding-gold uppercase tracking-widest mt-1">Bride</p>
                        </div>
                    </div>
                </div>
            </section>

            {(data.showCountdown ?? true) && (
              <section className="bg-white py-16 mb-12 border-b border-gray-100">
                <div className="text-center mb-8"><span className="text-wedding-gold tracking-widest uppercase text-xs">Time until the big day</span></div>
                <Countdown targetDate={data.date} labels={{ days: t.days, hours: t.hours, mins: t.mins, secs: t.secs }} />
              </section>
            )}

            {data.showSchedule && (
              <section ref={scheduleRef} className="mb-24 px-6 md:px-12">
                <div className="text-center mb-16">
                     <h2 className="text-3xl font-serif text-wedding-text">{t.schedule}</h2>
                     <div className="w-10 h-[1px] bg-wedding-gold mx-auto mt-6"></div>
                </div>
                <div className="relative border-l border-wedding-gold/20 ml-6 md:ml-1/2 space-y-16 pl-10 md:pl-0">
                  {data.schedule.map((item, idx) => (
                    <div key={idx} className="relative md:flex items-center justify-between group">
                      <div className="absolute -left-[45px] md:left-1/2 md:-ml-[5px] w-[10px] h-[10px] bg-wedding-gold rounded-full z-10 ring-4 ring-white" />
                      <div className="md:w-[45%] md:text-right mb-2 md:mb-0 md:pr-12"><span className="text-3xl font-serif text-wedding-text font-light">{item.time}</span></div>
                      <div className="md:w-[45%] md:pl-12"><h3 className="text-lg text-gray-700 font-medium tracking-wide">{item.title[lang]}</h3></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section ref={accessRef} className="mb-24 px-6 md:px-12">
               <div className="text-center mb-16">
                     <h2 className="text-3xl font-serif text-wedding-text">{t.access}</h2>
                     <div className="w-10 h-[1px] bg-wedding-gold mx-auto mt-6"></div>
                </div>
               <div className="bg-[#fcfbf9] p-8 md:p-12 rounded-sm border border-gray-100 text-center">
                    <h3 className="text-2xl font-serif font-bold mb-4 text-gray-800">{data.location.name[lang]}</h3>
                    <p className="text-gray-500 mb-8 font-light">{data.location.address[lang]}</p>
                    <div className="h-64 md:h-80 w-full bg-gray-200 mb-8 grayscale hover:grayscale-0 transition-all duration-700">
                         <iframe ref={mapFrameRef} src={data.location.mapUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" />
                    </div>

                    {/* Diagnostic: log the iframe DOM src after mapUrl changes (helps confirm deployed DOM matches merged data) */}
                    <script dangerouslySetInnerHTML={{ __html: `
                      (function(){
                        try { console.debug('DOM iframe src (immediate):', document.querySelector('iframe[loading="lazy"]').getAttribute('src')); } catch(e){}
                      })();
                    ` }} />
                    <div className="flex flex-col md:flex-row justify-center gap-4">
                        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-white border border-gray-300 text-gray-600 text-xs font-bold uppercase tracking-widest hover:bg-wedding-text hover:text-white hover:border-wedding-text transition-colors shadow-sm">{t.googleCal}</a>
                        <button onClick={downloadIcs} className="px-8 py-3 bg-white border border-gray-300 text-gray-600 text-xs font-bold uppercase tracking-widest hover:bg-wedding-text hover:text-white hover:border-wedding-text transition-colors shadow-sm">{t.appleCal}</button>
                    </div>
               </div>
            </section>

            {(data.showGallery && data.gallery && data.gallery.length > 0) && (
                <section ref={galleryRef} className="mb-24 px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-serif text-wedding-text">{t.gallery}</h2>
                        <div className="w-10 h-[1px] bg-wedding-gold mx-auto mt-6"></div>
                    </div>
                    <div className="columns-2 md:columns-3 gap-3 space-y-3">
                        {data.gallery.map((img, idx) => (
                            <div key={idx} className="break-inside-avoid overflow-hidden rounded-sm shadow-sm">
                                <img src={img} alt="Gallery" className="w-full h-auto object-cover hover:opacity-90 transition-opacity duration-300" loading="lazy" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

             {(data.faq && data.faq.length > 0) && (
               <section className="mb-24 px-6 md:px-12 bg-[#faf9f6] py-20">
                 <div className="text-center mb-12">
                        <h2 className="text-3xl font-serif text-wedding-text">{t.faq}</h2>
                        <div className="w-10 h-[1px] bg-wedding-gold mx-auto mt-6"></div>
                 </div>
                 <div className="grid md:grid-cols-2 gap-x-12 gap-y-12 max-w-3xl mx-auto">
                   {data.faq.map((item, idx) => (
                     <div key={idx} className="border-b border-gray-200 pb-8">
                        <h3 className="text-md font-bold text-gray-800 mb-4 flex items-start gap-3">
                             <span className="text-wedding-gold text-sm font-serif italic">Q.</span>
                             {processFaqText(item.question[lang])}
                        </h3>
                        <p className="text-gray-500 font-light text-sm leading-relaxed pl-7">{processFaqText(item.answer[lang])}</p>
                     </div>
                   ))}
                 </div>
               </section>
             )}

            <section className="text-center py-20 px-6">
                 <div className="border border-wedding-gold p-1 inline-block rounded-full">
                    <button onClick={() => setView('rsvp')} className="w-full md:w-auto px-16 py-4 bg-wedding-gold text-white font-serif text-xl tracking-widest uppercase hover:bg-wedding-text transition-colors rounded-full shadow-lg">{t.rsvp}</button>
                </div>
                 <p className="mt-6 text-gray-400 font-light text-sm">{t.rsvpNote}</p>
            </section>
          </main>

          <footer className="bg-[#f5f5f5] pt-16 pb-32 text-center text-gray-500">
            <div className="max-w-md mx-auto flex flex-col items-center">
              <p className="font-serif italic text-xl mb-4 text-wedding-gold">Amoré Wedding Tokyo</p>
              <p className="text-[10px] uppercase tracking-widest opacity-60">{t.presentedBy}</p>
            </div>
          </footer>

          <div id="mobile-nav" className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-40 md:hidden pb-safe">
               <div className="flex justify-around items-center h-16">
                    <button onClick={() => scrollToSection(scheduleRef)} className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-wedding-gold"><Clock size={18} /><span className="text-[10px] mt-1">{t.schedule}</span></button>
                     <button onClick={() => scrollToSection(accessRef)} className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-wedding-gold"><MapPin size={18} /><span className="text-[10px] mt-1">{t.access}</span></button>
                    <button onClick={() => setView('rsvp')} className="flex flex-col items-center justify-center w-full h-full bg-wedding-gold text-white"><span className="text-[10px] mt-1 font-bold">{t.rsvp}</span></button>
                     <button onClick={() => scrollToSection(galleryRef)} className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-wedding-gold"><Camera size={18} /><span className="text-[10px] mt-1">{t.gallery}</span></button>
               </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;