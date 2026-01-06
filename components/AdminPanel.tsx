
import React, { useState } from 'react';
import { WeddingData, LocalizedString, FONT_OPTIONS, ScheduleItem, FaqItem } from '../types';
import { X, Sparkles, Save, Loader2, Palette, Database, Image as ImageIcon, Type, Upload, MapPin, Clock, HelpCircle, Trash2, Plus, CalendarClock, Wand2, LogOut, Music, Camera, Code, FileText, Copy, Check, Heart, Settings, AlignLeft, ToggleLeft, MonitorPlay, Download, AlertTriangle, Link, FolderInput } from 'lucide-react';
import { generateGreeting, fetchVenueDetails, generateSchedule } from '../services/geminiService';

interface Props {
  data: WeddingData;
  onUpdate: (newData: WeddingData) => void;
  onClose: () => void;
}

const THEME_PRESETS = [
  { name: 'Classic Gold', primary: '#C5A059', text: '#4A4A4A', bg: '#F5F0E6' },
  { name: 'Sakura Pink', primary: '#D48695', text: '#5D4037', bg: '#FCE4EC' },
  { name: 'Forest Green', primary: '#5D7052', text: '#2C3E26', bg: '#EDF2EB' },
  { name: 'Ocean Blue', primary: '#6B8E9B', text: '#2B3A42', bg: '#EFF5F7' },
];

type Tab = 'basics' | 'content' | 'design' | 'settings';

const AdminPanel: React.FC<Props> = ({ data, onUpdate, onClose }) => {
  const [localData, setLocalData] = useState<WeddingData>(data);
  const [activeTab, setActiveTab] = useState<Tab>('basics');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingVenue, setIsFetchingVenue] = useState(false);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [galleryUrlInput, setGalleryUrlInput] = useState('');

  const handleChange = (section: keyof WeddingData, key: string | null, value: any) => {
    setLocalData(prev => {
      if (key && typeof prev[section] === 'object' && !Array.isArray(prev[section])) {
        return {
          ...prev,
          [section]: {
            ...(prev[section] as any),
            [key]: value
          }
        };
      }
      return { ...prev, [section]: value };
    });
  };

  const handleVisualChange = (key: keyof WeddingData['visuals'], value: boolean) => {
    setLocalData(prev => ({
      ...prev,
      visuals: {
        ...prev.visuals,
        [key]: value
      }
    }));
  };

  const handleLocationChange = (key: keyof WeddingData['location'], subKey: 'en' | 'ja' | 'my' | null, value: string) => {
    setLocalData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [key]: subKey ? { ...(prev.location[key] as LocalizedString), [subKey]: value } : value
      }
    }));
  };

  const handleVenueAutoFill = async () => {
      const venueName = localData.location.name.en;
      if (!venueName) {
          alert("Please enter a Venue Name (English) first.");
          return;
      }
      setIsFetchingVenue(true);
      try {
          const result = await fetchVenueDetails(venueName);
          if (result) {
              setLocalData(prev => ({
                  ...prev,
                  location: {
                      ...prev.location,
                      address: result.address,
                      mapUrl: result.mapUrl || prev.location.mapUrl
                  }
              }));
          } else {
              alert("Could not find venue details. Please try manually.");
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsFetchingVenue(false);
      }
  };

  const updateScheduleItem = (index: number, field: 'time' | 'en' | 'ja' | 'my' | 'icon', value: string) => {
    const newSchedule = [...localData.schedule];
    if (field === 'time') {
      newSchedule[index].time = value;
    } else if (field === 'icon') {
        newSchedule[index].icon = value as any;
    } else {
      newSchedule[index].title[field] = value;
    }
    setLocalData({ ...localData, schedule: newSchedule });
  };

  const addScheduleItem = () => {
    const newItem: ScheduleItem = { time: '00:00', title: { en: 'New Event', ja: 'イベント', my: 'Event' }, icon: 'ceremony' };
    setLocalData({ ...localData, schedule: [...localData.schedule, newItem] });
  };

  const removeScheduleItem = (index: number) => {
    const newSchedule = localData.schedule.filter((_, i) => i !== index);
    setLocalData({ ...localData, schedule: newSchedule });
  };

  const handleAutoGenerateSchedule = async () => {
      setIsGeneratingSchedule(true);
      const timeStr = new Date(localData.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      try {
          const schedule = await generateSchedule(timeStr);
          if (schedule.length > 0) {
              setLocalData(prev => ({ ...prev, schedule }));
          } else {
              alert("Failed to generate schedule.");
          }
      } catch (e) {
          console.error(e);
          alert("Error generating schedule.");
      } finally {
          setIsGeneratingSchedule(false);
      }
  };

  const updateFaqItem = (index: number, type: 'question' | 'answer' | 'icon', lang: 'en' | 'ja' | 'my' | null, value: string) => {
    const newFaq = [...(localData.faq || [])];
    if (type === 'icon') {
        newFaq[index].icon = value as any;
    } else if (lang) {
        newFaq[index][type][lang] = value;
    }
    setLocalData({ ...localData, faq: newFaq });
  };

  const addFaqItem = () => {
    const newItem: FaqItem = { 
      question: { en: 'New Question?', ja: '質問？', my: 'မေးခွန်း?' }, 
      answer: { en: 'Answer here.', ja: '回答', my: 'အဖြေ' },
      icon: 'info'
    };
    setLocalData({ ...localData, faq: [...(localData.faq || []), newItem] });
  };

  const removeFaqItem = (index: number) => {
    const newFaq = (localData.faq || []).filter((_, i) => i !== index);
    setLocalData({ ...localData, faq: newFaq });
  };

  const handleImageUrlChange = (key: keyof WeddingData['images'], url: string) => {
      setLocalData(prev => ({
        ...prev,
        images: {
          ...prev.images,
          [key]: url
        }
      }));
  };

  const addGalleryImage = () => {
    if (!galleryUrlInput) return;
    setLocalData(prev => ({
        ...prev,
        gallery: [...(prev.gallery || []), galleryUrlInput]
    }));
    setGalleryUrlInput('');
  };

  const removeGalleryImage = (index: number) => {
      setLocalData(prev => ({
          ...prev,
          gallery: prev.gallery.filter((_, i) => i !== index)
      }));
  };

  const handleThemeChange = (key: 'primary' | 'text' | 'backgroundTint', value: string) => {
    setLocalData(prev => ({
      ...prev,
      theme: { ...prev.theme, [key]: value }
    }));
  };
  
  const handleFontChange = (lang: 'en' | 'ja' | 'my', font: string) => {
    setLocalData(prev => ({
      ...prev,
      fonts: { ...prev.fonts, [lang]: font }
    }));
  };

  const applyPreset = (preset: typeof THEME_PRESETS[0]) => {
    setLocalData(prev => ({
      ...prev,
      theme: { primary: preset.primary, text: preset.text, backgroundTint: preset.bg }
    }));
  };

  const handleGenerateGreeting = async () => {
    setIsGenerating(true);
    try {
      const newGreeting = await generateGreeting(localData);
      setLocalData(prev => ({ ...prev, message: newGreeting }));
    } catch (e) {
      alert("Failed to generate greeting. Check API Key.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleDownloadUpdate = () => {
      const jsonStr = JSON.stringify(localData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wedding-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in">
        
        <div className="p-4 border-b flex justify-between items-center bg-white z-20">
          <h2 className="text-xl font-serif font-bold text-wedding-text">Planner Dashboard</h2>
          <div className="flex gap-2">
            <button 
                onClick={onClose}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold flex items-center gap-1"
            >
                <LogOut size={14} /> Exit
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex border-b bg-gray-50/50">
           <button onClick={() => setActiveTab('basics')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex justify-center items-center gap-2 border-b-2 transition-colors ${activeTab === 'basics' ? 'border-wedding-gold text-wedding-gold bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}><Heart size={14} /> Basics</button>
           <button onClick={() => setActiveTab('content')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex justify-center items-center gap-2 border-b-2 transition-colors ${activeTab === 'content' ? 'border-wedding-gold text-wedding-gold bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}><AlignLeft size={14} /> Content</button>
           <button onClick={() => setActiveTab('design')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex justify-center items-center gap-2 border-b-2 transition-colors ${activeTab === 'design' ? 'border-wedding-gold text-wedding-gold bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}><Palette size={14} /> Design</button>
           <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide flex justify-center items-center gap-2 border-b-2 transition-colors ${activeTab === 'settings' ? 'border-wedding-gold text-wedding-gold bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}><Settings size={14} /> Settings</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {activeTab === 'basics' && (
            <div className="space-y-6 animate-fade-in">
                <section className="space-y-4">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Couple Names (English)</h3>
                        <div className="grid grid-cols-2 gap-2">
                        <input className="border p-2 rounded w-full text-sm" placeholder="Groom (EN)" value={localData.groomName.en} onChange={e => handleChange('groomName', 'en', e.target.value)} />
                        <input className="border p-2 rounded w-full text-sm" placeholder="Bride (EN)" value={localData.brideName.en} onChange={e => handleChange('brideName', 'en', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Couple Names (Japanese)</h3>
                        <div className="grid grid-cols-2 gap-2">
                        <input className="border p-2 rounded w-full text-sm" placeholder="Groom (JA)" value={localData.groomName.ja} onChange={e => handleChange('groomName', 'ja', e.target.value)} />
                        <input className="border p-2 rounded w-full text-sm" placeholder="Bride (JA)" value={localData.brideName.ja} onChange={e => handleChange('brideName', 'ja', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Couple Names (Burmese)</h3>
                        <div className="grid grid-cols-2 gap-2">
                        <input className="border p-2 rounded w-full text-sm" placeholder="Groom (MY)" value={localData.groomName.my} onChange={e => handleChange('groomName', 'my', e.target.value)} />
                        <input className="border p-2 rounded w-full text-sm" placeholder="Bride (MY)" value={localData.brideName.my} onChange={e => handleChange('brideName', 'my', e.target.value)} />
                        </div>
                    </div>
                </section>
                <section className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-500 flex items-center gap-2"><CalendarClock size={16} /> Date & Time</h3>
                    <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Wedding Date & Time</label>
                        <input type="datetime-local" className="w-full border p-2 rounded text-sm bg-white" value={localData.date.substring(0, 16)} onChange={e => handleChange('date', null, e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">RSVP Deadline</label>
                        <input type="date" className="w-full border p-2 rounded text-sm bg-white" value={localData.rsvpDeadline || ''} onChange={e => handleChange('rsvpDeadline', null, e.target.value)} />
                    </div>
                    </div>
                </section>
                <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-500 flex items-center gap-2"><MapPin size={16} /> Location Details</h3>
                    <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Venue Name (English)</label>
                        <div className="flex gap-2">
                            <input className="w-full text-sm p-2 border rounded" value={localData.location.name.en} onChange={e => handleLocationChange('name', 'en', e.target.value)} />
                            <button onClick={handleVenueAutoFill} disabled={isFetchingVenue} className="bg-wedding-text text-white p-2 rounded hover:bg-black transition-colors disabled:opacity-50" title="Auto-fill details from Google Maps">{isFetchingVenue ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} />}</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Venue Name (Japanese)</label>
                        <input className="w-full text-sm p-2 border rounded" value={localData.location.name.ja} onChange={e => handleLocationChange('name', 'ja', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Address (English)</label>
                        <textarea rows={2} className="w-full text-sm p-2 border rounded" value={localData.location.address.en} onChange={e => handleLocationChange('address', 'en', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Google Maps Embed URL</label>
                        <input className="w-full text-xs p-2 border rounded font-mono text-gray-500" value={localData.location.mapUrl} onChange={e => handleLocationChange('mapUrl', null, e.target.value)} />
                    </div>
                    </div>
                </section>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6 animate-fade-in">
                <section className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-center mb-2"><h3 className="text-sm font-bold text-blue-800 flex items-center gap-2"><Sparkles size={16} /> AI Greeting Assistant</h3></div>
                    <p className="text-xs text-blue-600 mb-3 leading-relaxed">Generate a polite and romantic greeting message localized for English, Japanese, and Burmese.</p>
                    <button onClick={handleGenerateGreeting} disabled={isGenerating} className="w-full bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded shadow-sm text-sm hover:bg-blue-50 flex items-center justify-center gap-2">{isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Generate Message</button>
                </section>
                <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2"><Clock size={16} /> Schedule</h3>
                        <div className="flex items-center gap-4">
                            <button onClick={handleAutoGenerateSchedule} disabled={isGeneratingSchedule} className="text-xs bg-wedding-text text-white px-2 py-1 rounded flex items-center gap-1 hover:opacity-90 disabled:opacity-50" title="Auto-generate plan based on wedding start time">{isGeneratingSchedule ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Auto-Plan</button>
                        </div>
                    </div>
                    {localData.showSchedule && (
                    <div className="space-y-4">
                        {localData.schedule.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-gray-200 relative group">
                            <button onClick={() => removeScheduleItem(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                            <div className="flex gap-2 mb-2 items-center">
                              <input type="time" className="border rounded p-1 text-sm" value={item.time} onChange={e => updateScheduleItem(idx, 'time', e.target.value)} />
                              <select className="border rounded p-1 text-xs max-w-[80px]" value={item.icon || 'ceremony'} onChange={e => updateScheduleItem(idx, 'icon', e.target.value)}>
                                  <option value="ceremony">Ring</option>
                                  <option value="reception">Hall</option>
                                  <option value="party">Party</option>
                                  <option value="toast">Cheers</option>
                                  <option value="meal">Meal</option>
                                  <option value="camera">Photo</option>
                              </select>
                              <input className="border rounded p-1 text-sm flex-1" placeholder="Event Title (EN)" value={item.title.en} onChange={e => updateScheduleItem(idx, 'en', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                            <input className="border rounded p-1 text-xs" placeholder="Japanese" value={item.title.ja} onChange={e => updateScheduleItem(idx, 'ja', e.target.value)} />
                            <input className="border rounded p-1 text-xs" placeholder="Burmese" value={item.title.my} onChange={e => updateScheduleItem(idx, 'my', e.target.value)} />
                            </div>
                        </div>
                        ))}
                        <button onClick={addScheduleItem} className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-400 text-xs font-bold hover:border-gray-400 hover:text-gray-500 flex justify-center items-center gap-2"><Plus size={14} /> Add Event</button>
                    </div>
                    )}
                </section>
                <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="mb-4"><h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2"><HelpCircle size={16} /> FAQ</h3></div>
                    <div className="space-y-4">
                        {(localData.faq || []).map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-gray-200 relative group">
                            <button onClick={() => removeFaqItem(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                            <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="font-bold text-xs text-gray-400">Question</div>
                                <select className="text-xs border rounded p-1" value={item.icon || 'info'} onChange={e => updateFaqItem(idx, 'icon', null, e.target.value)}>
                                    <option value="info">Info</option>
                                    <option value="users">Users</option>
                                    <option value="shirt">Dress Code</option>
                                    <option value="clock">Time</option>
                                    <option value="map">Map/Parking</option>
                                    <option value="utensils">Food</option>
                                    <option value="calendar">Calendar</option>
                                    <option value="gift">Gift</option>
                                </select>
                            </div>
                            <input className="w-full border rounded p-1 text-sm" placeholder="EN Question" value={item.question.en} onChange={e => updateFaqItem(idx, 'question', 'en', e.target.value)} />
                            <div className="grid grid-cols-2 gap-2">
                                <input className="border rounded p-1 text-xs" placeholder="JA" value={item.question.ja} onChange={e => updateFaqItem(idx, 'question', 'ja', e.target.value)} />
                                <input className="border rounded p-1 text-xs" placeholder="MY" value={item.question.my} onChange={e => updateFaqItem(idx, 'question', 'my', e.target.value)} />
                            </div>
                            <div className="font-bold text-xs text-gray-400 mt-2">Answer</div>
                            <textarea className="w-full border rounded p-1 text-sm" placeholder="EN Answer" rows={2} value={item.answer.en} onChange={e => updateFaqItem(idx, 'answer', 'en', e.target.value)} />
                            <div className="grid grid-cols-2 gap-2">
                                <textarea className="border rounded p-1 text-xs" placeholder="JA" rows={1} value={item.answer.ja} onChange={e => updateFaqItem(idx, 'answer', 'ja', e.target.value)} />
                                <textarea className="border rounded p-1 text-xs" placeholder="MY" rows={1} value={item.answer.my} onChange={e => updateFaqItem(idx, 'answer', 'my', e.target.value)} />
                            </div>
                            </div>
                        </div>
                        ))}
                        <button onClick={addFaqItem} className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-400 text-xs font-bold hover:border-gray-400 hover:text-gray-500 flex justify-center items-center gap-2"><Plus size={14} /> Add FAQ</button>
                    </div>
                </section>
            </div>
          )}

          {activeTab === 'design' && (
             <div className="space-y-6 animate-fade-in">
                <section>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-500 flex items-center gap-2"><ImageIcon size={16} /> Photos</h3>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4 text-xs text-blue-800 flex gap-2">
                       <Link size={16} className="shrink-0" />
                       <p><strong>Use Image URLs:</strong> To avoid large file errors on GitHub, please paste URLs from Imgur, Google Photos, or Unsplash instead of uploading files directly.</p>
                    </div>
                    <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-700 block mb-2">Main Background URL (Hero)</label>
                        <div className="flex gap-2 mb-2">
                            <input className="flex-1 text-sm p-2 border rounded" placeholder="https://..." value={localData.images.hero} onChange={e => handleImageUrlChange('hero', e.target.value)} />
                        </div>
                        <div className="w-full h-24 bg-gray-200 rounded overflow-hidden"><img src={localData.images.hero} className="w-full h-full object-cover opacity-80" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <label className="text-xs font-bold text-gray-700 block mb-2">Groom URL</label>
                            <input className="w-full text-sm p-2 border rounded mb-2" placeholder="https://..." value={localData.images.groom} onChange={e => handleImageUrlChange('groom', e.target.value)} />
                            <div className="aspect-square w-full bg-gray-200 rounded overflow-hidden"><img src={localData.images.groom} className="w-full h-full object-cover" /></div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <label className="text-xs font-bold text-gray-700 block mb-2">Bride URL</label>
                            <input className="w-full text-sm p-2 border rounded mb-2" placeholder="https://..." value={localData.images.bride} onChange={e => handleImageUrlChange('bride', e.target.value)} />
                            <div className="aspect-square w-full bg-gray-200 rounded overflow-hidden"><img src={localData.images.bride} className="w-full h-full object-cover" /></div>
                        </div>
                    </div>
                    </div>
                </section>
                <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2"><Camera size={16} /> Gallery / Our Story</h3></div>
                    {localData.showGallery && (
                        <>
                            <div className="flex gap-2 mb-4">
                                <input className="flex-1 text-sm p-2 border rounded" placeholder="Paste Image URL here..." value={galleryUrlInput} onChange={e => setGalleryUrlInput(e.target.value)} />
                                <button onClick={addGalleryImage} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded text-sm font-bold">Add</button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {(localData.gallery || []).map((img, idx) => (
                                    <div key={idx} className="relative aspect-square group rounded overflow-hidden bg-gray-200">
                                        <img src={img} alt="Gallery" className="w-full h-full object-cover" />
                                        <button onClick={() => removeGalleryImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </section>
                <section className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-purple-800 flex items-center gap-2"><Wand2 size={16} /> Interactive Effects</h3>
                    <div className="space-y-3">
                    <label className="flex items-center justify-between p-2 bg-white rounded border border-purple-100">
                        <span className="text-sm text-gray-700">Open Envelope Animation</span>
                        <input type="checkbox" checked={localData.visuals?.enableEnvelope ?? true} onChange={e => handleVisualChange('enableEnvelope', e.target.checked)} className="w-5 h-5 accent-purple-600" />
                    </label>
                    <label className="flex items-center justify-between p-2 bg-white rounded border border-purple-100">
                        <span className="text-sm text-gray-700">Scroll Animations</span>
                        <input type="checkbox" checked={localData.visuals?.enableAnimations ?? true} onChange={e => handleVisualChange('enableAnimations', e.target.checked)} className="w-5 h-5 accent-purple-600" />
                    </label>
                    </div>
                </section>
                <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-500 flex items-center gap-2"><Palette size={16} /> Color & Typography</h3>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                    {THEME_PRESETS.map(preset => (
                        <button key={preset.name} onClick={() => applyPreset(preset)} className="flex flex-col items-center gap-1 group">
                        <div className="w-8 h-8 rounded-full border shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: preset.primary }} />
                        <span className="text-[10px] text-gray-500">{preset.name}</span>
                        </button>
                    ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Accent</label>
                        <div className="flex items-center gap-2 border rounded p-1 bg-white"><input type="color" value={localData.theme.primary} onChange={e => handleThemeChange('primary', e.target.value)} className="w-6 h-6 p-0 border-0 rounded cursor-pointer" /></div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Text</label>
                        <div className="flex items-center gap-2 border rounded p-1 bg-white"><input type="color" value={localData.theme.text} onChange={e => handleThemeChange('text', e.target.value)} className="w-6 h-6 p-0 border-0 rounded cursor-pointer" /></div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Background</label>
                        <div className="flex items-center gap-2 border rounded p-1 bg-white"><input type="color" value={localData.theme.backgroundTint} onChange={e => handleThemeChange('backgroundTint', e.target.value)} className="w-6 h-6 p-0 border-0 rounded cursor-pointer" /></div>
                    </div>
                    </div>
                    <div className="space-y-3">
                        <div><label className="text-xs text-gray-400 block mb-1">English Font</label><select className="w-full text-sm p-2 border rounded bg-white" value={localData.fonts?.en || FONT_OPTIONS.en[0].value} onChange={(e) => handleFontChange('en', e.target.value)}>{FONT_OPTIONS.en.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                        <div><label className="text-xs text-gray-400 block mb-1">Japanese Font</label><select className="w-full text-sm p-2 border rounded bg-white" value={localData.fonts?.ja || FONT_OPTIONS.ja[0].value} onChange={(e) => handleFontChange('ja', e.target.value)}>{FONT_OPTIONS.ja.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                        <div><label className="text-xs text-gray-400 block mb-1">Burmese Font</label><select className="w-full text-sm p-2 border rounded bg-white" value={localData.fonts?.my || FONT_OPTIONS.my[0].value} onChange={(e) => handleFontChange('my', e.target.value)}>{FONT_OPTIONS.my.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                    </div>
                </section>
             </div>
          )}

          {activeTab === 'settings' && (
             <div className="space-y-6 animate-fade-in">
                <section className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold flex items-center gap-2 text-lg"><Database size={20}/> Website Updates</h3></div>
                    <div className="space-y-4 text-sm opacity-90 leading-relaxed mb-6">
                        <p className="font-bold bg-black/20 p-2 rounded inline-block">DEPLOYMENT GUIDE</p>
                        <p>1. Customize your site using this panel.</p>
                        <p>2. Click <strong>Download Config</strong> below.</p>
                        <p>3. Upload your entire project folder + this config file to GitHub.</p>
                        <p className="italic text-xs mt-2 border-t border-white/20 pt-2">*Note: This Admin Panel is smart. It will automatically hide itself on the live website so your guests cannot see it.</p>
                    </div>
                    <button onClick={handleDownloadUpdate} className="w-full bg-white text-emerald-600 font-bold py-4 rounded-lg shadow-md hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 group">{downloaded ? <Check size={20}/> : <Download size={20}/>}{downloaded ? "Downloaded!" : "Download wedding-data.json"}</button>
                </section>
                <section className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-orange-800 flex items-center gap-2"><ToggleLeft size={16} /> Feature Visibility</h3>
                    <div className="grid grid-cols-1 gap-2">
                        <label className="flex items-center justify-between p-2 bg-white rounded border border-orange-100 cursor-pointer hover:bg-orange-50/50"><div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Countdown Timer</span></div><input type="checkbox" checked={localData.showCountdown ?? true} onChange={e => handleChange('showCountdown', null, e.target.checked)} className="w-5 h-5 accent-orange-500 cursor-pointer" /></label>
                        <label className="flex items-center justify-between p-2 bg-white rounded border border-orange-100 cursor-pointer hover:bg-orange-50/50"><div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Wedding Schedule</span></div><input type="checkbox" checked={localData.showSchedule} onChange={e => handleChange('showSchedule', null, e.target.checked)} className="w-5 h-5 accent-orange-500 cursor-pointer" /></label>
                         <label className="flex items-center justify-between p-2 bg-white rounded border border-orange-100 cursor-pointer hover:bg-orange-50/50"><div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Photo Gallery</span></div><input type="checkbox" checked={localData.showGallery} onChange={e => handleChange('showGallery', null, e.target.checked)} className="w-5 h-5 accent-orange-500 cursor-pointer" /></label>
                         <label className="flex items-center justify-between p-2 bg-white rounded border border-orange-100 cursor-pointer hover:bg-orange-50/50"><div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Envelope Animation</span></div><input type="checkbox" checked={localData.visuals?.enableEnvelope ?? true} onChange={e => handleVisualChange('enableEnvelope', e.target.checked)} className="w-5 h-5 accent-orange-500 cursor-pointer" /></label>
                    </div>
                </section>
                <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-500 flex items-center gap-2"><Database size={16} /> Data Connections</h3>
                    <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-700 block mb-1">Google Apps Script URL</label><input className="border p-2 rounded w-full text-xs font-mono" placeholder="https://script.google.com/..." value={localData.googleScriptUrl || ''} onChange={e => handleChange('googleScriptUrl', null, e.target.value)} /></div>
                    <div><label className="text-xs font-bold text-gray-700 block mb-1">External RSVP Link (Fallback)</label><input className="border p-2 rounded w-full text-xs" placeholder="https://docs.google.com/..." value={localData.googleFormUrl || ''} onChange={e => handleChange('googleFormUrl', null, e.target.value)} /></div>
                    </div>
                </section>
                <section className="bg-pink-50/50 p-4 rounded-xl border border-pink-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-pink-800 flex items-center gap-2"><Music size={16} /> Background Music (URL)</h3>
                    <div className="space-y-2"><div className="flex gap-2"><input className="flex-1 text-xs p-2 border rounded" placeholder="Paste Audio URL (mp3)..." value={localData.musicUrl || ''} onChange={e => handleChange('musicUrl', null, e.target.value)} />{localData.musicUrl && (<button onClick={() => handleChange('musicUrl', null, '')} className="text-red-500 hover:bg-red-50 p-2 rounded border border-red-200"><Trash2 size={14} /></button>)}</div><p className="text-[10px] text-gray-400">Audio will play automatically after the envelope is opened.</p></div>
                </section>
             </div>
          )}
        </div>
        <div className="p-4 border-t bg-white z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
            <button onClick={() => { onUpdate(localData); onClose(); }} className="w-full bg-wedding-text text-white py-3 rounded-lg font-bold shadow-lg hover:bg-black transition-colors flex items-center justify-center gap-2" style={{ backgroundColor: localData.theme.text }}><Save size={18} /> Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;