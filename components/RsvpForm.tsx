import React, { useState } from 'react';
import { Language, FaqItem, WeddingData } from '../types';
import { ArrowLeft, Check, Loader2, Send, Info, CalendarPlus, Download } from 'lucide-react';

interface Props {
  language: Language;
  googleScriptUrl: string;
  faq: FaqItem[];
  weddingData?: WeddingData; // Optional so we don't break existing usage if not passed immediately
  onBack: () => void;
}

const TEXTS = {
  en: {
    title: "RSVP",
    subtitle: "Please let us know if you can make it.",
    attend: "ATTEND",
    decline: "DECLINE",
    attendDesc: "I will happily attend.",
    declineDesc: "I regretfully decline.",
    honorific: "Title",
    name: "Name",
    email: "Email",
    phone: "Phone",
    allergies: "Allergies / Dietary Restrictions",
    message: "Message for the couple",
    submit: "Send RSVP",
    submitting: "Sending...",
    success: "Thank you! Your RSVP has been sent.",
    error: "Something went wrong. Please try again.",
    guests: "Number of Guests",
    guestInfo: "Guest Information",
    guestName: "Guest Name",
    addToCal: "Add to Calendar",
    googleCal: "Google",
    appleCal: "Apple"
  },
  ja: {
    title: "ご出欠確認",
    subtitle: "ご出席の可否を下記よりお知らせください。",
    attend: "ご出席",
    decline: "ご欠席",
    attendDesc: "出席させていただきます。",
    declineDesc: "残念ながら欠席させていただきます。",
    honorific: "敬称",
    name: "お名前",
    email: "メールアドレス",
    phone: "電話番号",
    allergies: "アレルギー・苦手な食材",
    message: "メッセージ",
    submit: "送信する",
    submitting: "送信中...",
    success: "送信しました。ありがとうございます。",
    error: "エラーが発生しました。もう一度お試しください。",
    guests: "ご同伴者数",
    guestInfo: "ご同伴者様情報",
    guestName: "お名前",
    addToCal: "カレンダーに追加",
    googleCal: "Google",
    appleCal: "Apple"
  },
  my: {
    title: "ဖိတ်ကြားလွှာအကြောင်းပြန်ရန်",
    subtitle: "ကျေးဇူးပြု၍ တက်ရောက်နိုင်ခြင်း ရှိ/မရှိ အကြောင်းကြားပေးပါ။",
    attend: "တက်ရောက်မည်",
    decline: "မတက်ရောက်နိုင်ပါ",
    attendDesc: "ဝမ်းမြောက်စွာ တက်ရောက်ပါမည်။",
    declineDesc: "မတက်ရောက်နိုင်သည့်အတွက် ဝမ်းနည်းပါသည်။",
    honorific: "အမည်ရှေ့ဆက်",
    name: "အမည်",
    email: "အီးမေးလ်",
    phone: "ဖုန်းနံပါတ်",
    allergies: "ရှောင်ကြဉ်ရမည့် အစားအသောက်များ",
    message: "ဆုတောင်းစကား",
    submit: "ပေးပို့မည်",
    submitting: "ပေးပို့နေသည်...",
    success: "ကျေးဇူးတင်ပါသည်။ ပေးပို့ပြီးပါပြီ။",
    error: "တစုံတစ်ခု မှားယွင်းနေပါသည်။",
    guests: "ဧည့်သည် အရေအတွက်",
    guestInfo: "ဧည့်သည် အချက်အလက်",
    guestName: "အမည်",
    addToCal: "ပြက္ခဒိန်တွင်မှတ်သားရန်",
    googleCal: "Google",
    appleCal: "Apple"
  }
};

const RsvpForm: React.FC<Props> = ({ language, googleScriptUrl, faq, weddingData, onBack }) => {
  const t = TEXTS[language];
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    attendance: 'attend',
    honorific: 'Mr',
    name: '',
    email: '',
    phone: '',
    guests: 1,
    guestHonorific: 'Mr',
    guestName: '',
    allergies: '',
    message: ''
  });

  const getFaq = (icon: string) => faq?.find(f => f.icon === icon);

  // --- Calendar Logic Copy (Simplified for reuse) ---
  const generateCalendarLinks = () => {
    if (!weddingData) return { googleUrl: '#', downloadIcs: () => {} };
    
    const start = new Date(weddingData.date);
    const end = new Date(start.getTime() + (4 * 60 * 60 * 1000));
    const title = `${weddingData.groomName.en} & ${weddingData.brideName.en} Wedding`;
    const location = `${weddingData.location.name.en}, ${weddingData.location.address.en}`;
    const details = `Join us for the wedding of ${weddingData.groomName.en} and ${weddingData.brideName.en}!`;

    const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${end.toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;

    const downloadIcs = () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${window.location.href}
DTSTART:${start.toISOString().replace(/-|:|\.\d\d\d/g, "")}
DTEND:${end.toISOString().replace(/-|:|\.\d\d\d/g, "")}
SUMMARY:${title}
DESCRIPTION:${details}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;
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
  // ------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    // Combine honorific with name for the payload if backend expects simple fields
    const payload = {
      ...formData,
      full_name: `${formData.honorific}. ${formData.name}`,
      guest_info: formData.guests === 2 ? `${formData.guestHonorific}. ${formData.guestName}` : ''
    };

    if (!googleScriptUrl) {
      // Mock Submission for Demo purposes
      console.log("Mock Submission:", payload);
      setTimeout(() => {
        setStatus('success');
      }, 1500);
      return;
    }

    try {
      const formDataObj = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formDataObj.append(key, String(value));
      });
      formDataObj.append('timestamp', new Date().toISOString());

      await fetch(googleScriptUrl, {
        method: 'POST',
        body: formDataObj,
        mode: 'no-cors' 
      });

      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const inputClasses = "w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-wedding-text focus:border-wedding-gold focus:ring-2 focus:ring-wedding-gold/20 outline-none transition-all duration-300 placeholder-gray-300";

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-wedding-sand/30 flex items-center justify-center p-6 animate-slide-in">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-wedding-gold text-white rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={32} />
          </div>
          <h2 className="text-3xl font-serif text-wedding-text mb-4">{t.success}</h2>
          <p className="text-gray-600 mb-8">
            {googleScriptUrl ? t.attendDesc : "(Demo Mode: No data was sent)"}
          </p>

          {/* Calendar Buttons on Success */}
          {formData.attendance === 'attend' && weddingData && (
             <div className="mb-8 border-t border-b border-gray-100 py-6">
                 <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">{t.addToCal}</p>
                 <div className="flex justify-center gap-3">
                    <a 
                      href={googleUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                    >
                      <CalendarPlus size={16} /> {t.googleCal}
                    </a>
                    <button 
                      onClick={downloadIcs}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                    >
                      <Download size={16} /> {t.appleCal}
                    </button>
                 </div>
             </div>
          )}

          <button 
            onClick={onBack}
            className="text-wedding-gold font-bold uppercase tracking-widest text-sm hover:underline"
          >
            Back to Invitation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white animate-slide-in relative">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-gray-500 hover:text-wedding-text mb-8 transition-colors"
        >
          <ArrowLeft size={20} /> Back
        </button>

        <h1 className="text-4xl md:text-5xl font-serif text-wedding-text text-center mb-4">{t.title}</h1>
        <p className="text-center text-gray-500 mb-12">{t.subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Attendance Toggle */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleInputChange('attendance', 'attend')}
              className={`p-6 border rounded-xl text-center transition-all duration-300 ${
                formData.attendance === 'attend' 
                  ? 'bg-wedding-gold text-white shadow-lg border-wedding-gold transform scale-105 ring-2 ring-wedding-gold/30' 
                  : 'bg-white text-gray-400 border-gray-200 hover:border-wedding-gold/50'
              }`}
            >
              <div className="text-xl font-bold font-serif mb-2">{t.attend}</div>
              <div className="text-xs opacity-80">{t.attendDesc}</div>
            </button>

            <button
              type="button"
              onClick={() => handleInputChange('attendance', 'decline')}
              className={`p-6 border rounded-xl text-center transition-all duration-300 ${
                formData.attendance === 'decline' 
                  ? 'bg-gray-600 text-white shadow-lg border-gray-600 transform scale-105 ring-2 ring-gray-400/30' 
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className="text-xl font-bold font-serif mb-2">{t.decline}</div>
              <div className="text-xs opacity-80">{t.declineDesc}</div>
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-6 bg-wedding-sand/10 p-6 md:p-8 rounded-2xl border border-wedding-sand/30">
            <div className="flex gap-4">
              <div className="w-1/3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t.honorific}</label>
                <select 
                  className={inputClasses}
                  value={formData.honorific}
                  onChange={e => handleInputChange('honorific', e.target.value)}
                >
                  <option value="Mr">Mr.</option>
                  <option value="Ms">Ms.</option>
                  <option value="Mrs">Mrs.</option>
                  <option value="Dr">Dr.</option>
                </select>
              </div>
              <div className="w-2/3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t.name} <span className="text-red-400">*</span></label>
                <input 
                  required
                  className={inputClasses}
                  placeholder={t.name}
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t.email} <span className="text-red-400">*</span></label>
                <input 
                  required
                  type="email"
                  className={inputClasses}
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t.phone}</label>
                <input 
                  type="tel"
                  className={inputClasses}
                  placeholder="090-1234-5678"
                  value={formData.phone}
                  onChange={e => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>

            {formData.attendance === 'attend' && (
              <div className="animate-fade-in space-y-6">
                 {/* Guests Selection */}
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t.guests}</label>
                    <select 
                      className={inputClasses}
                      value={formData.guests}
                      onChange={e => handleInputChange('guests', Number(e.target.value))}
                    >
                      <option value={1}>1 (Just me)</option>
                      <option value={2}>2 (Plus one)</option>
                    </select>

                    {/* FAQ Tip for Guests */}
                    {getFaq('users') && (
                        <div className="mt-3 text-sm text-gray-500 bg-white/50 p-3 rounded-lg border border-gray-100 flex gap-3 items-start">
                           <Info size={16} className="text-wedding-gold shrink-0 mt-0.5" />
                           <div>
                             <p className="font-bold text-xs uppercase mb-1 text-gray-600">{getFaq('users')?.question[language]}</p>
                             <p className="text-xs leading-relaxed">{getFaq('users')?.answer[language]}</p>
                           </div>
                        </div>
                    )}
                 </div>

                 {/* +1 Guest Details Input */}
                 {formData.guests === 2 && (
                   <div className="p-5 bg-white rounded-xl border border-wedding-gold/20 animate-fade-in relative overflow-hidden shadow-sm">
                       <div className="absolute top-0 left-0 w-1 h-full bg-wedding-gold"></div>
                       <h4 className="text-xs font-bold uppercase tracking-wider text-wedding-gold mb-4">{t.guestInfo}</h4>
                       <div className="flex gap-4">
                        <div className="w-1/3">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{t.honorific}</label>
                            <select 
                            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-2 text-sm text-wedding-text focus:border-wedding-gold focus:outline-none"
                            value={formData.guestHonorific}
                            onChange={e => handleInputChange('guestHonorific', e.target.value)}
                            >
                            <option value="Mr">Mr.</option>
                            <option value="Ms">Ms.</option>
                            <option value="Mrs">Mrs.</option>
                            <option value="Dr">Dr.</option>
                            </select>
                        </div>
                        <div className="w-2/3">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{t.guestName} <span className="text-red-400">*</span></label>
                            <input 
                            required={formData.guests === 2}
                            className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-wedding-text focus:border-wedding-gold focus:outline-none placeholder-gray-300"
                            placeholder={t.name}
                            value={formData.guestName}
                            onChange={e => handleInputChange('guestName', e.target.value)}
                            />
                        </div>
                       </div>
                   </div>
                 )}

                 {/* Allergies */}
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t.allergies}</label>
                    <textarea 
                      className={inputClasses}
                      placeholder="e.g. Peanuts, Seafood..."
                      value={formData.allergies}
                      onChange={e => handleInputChange('allergies', e.target.value)}
                      rows={3}
                    />
                     {/* FAQ Tip for Allergies */}
                     {getFaq('utensils') && (
                        <div className="mt-2 text-sm text-gray-500 bg-white/50 p-3 rounded-lg border border-gray-100 flex gap-3 items-start">
                           <Info size={16} className="text-wedding-gold shrink-0 mt-0.5" />
                           <div>
                             <p className="font-bold text-xs uppercase mb-1 text-gray-600">{getFaq('utensils')?.question[language]}</p>
                             <p className="text-xs leading-relaxed">{getFaq('utensils')?.answer[language]}</p>
                           </div>
                        </div>
                    )}
                 </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t.message}</label>
              <textarea 
                className={inputClasses}
                placeholder="..."
                value={formData.message}
                onChange={e => handleInputChange('message', e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="text-center pt-4">
            <button 
              type="submit" 
              disabled={status === 'submitting'}
              className="bg-wedding-text text-white px-12 py-4 rounded-full font-serif text-xl shadow-xl hover:bg-wedding-gold transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 mx-auto min-w-[200px]"
            >
              {status === 'submitting' ? (
                <><Loader2 className="animate-spin" /> {t.submitting}</>
              ) : (
                <>{t.submit} <Send size={18} /></>
              )}
            </button>
            {status === 'error' && (
              <p className="text-red-500 mt-4 text-sm">{t.error}</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RsvpForm;