
export type Language = 'en' | 'ja' | 'my';

export interface LocalizedString {
  en: string;
  ja: string;
  my: string;
}

export interface ScheduleItem {
  time: string;
  title: LocalizedString;
  icon: 'ceremony' | 'reception' | 'party' | 'toast' | 'meal' | 'camera';
}

export interface FaqItem {
  question: LocalizedString;
  answer: LocalizedString;
  icon: 'users' | 'shirt' | 'clock' | 'map' | 'utensils' | 'calendar' | 'gift' | 'info';
}

export interface ThemeColors {
  primary: string; // The main accent (Gold)
  text: string;    // Main text color
  backgroundTint: string; // The light background color (Sand)
}

export interface FontConfig {
  en: string;
  ja: string;
  my: string;
}

export interface VisualConfig {
  enableAnimations: boolean;
  enableEnvelope: boolean;
}

export interface WeddingData {
  groomName: LocalizedString;
  brideName: LocalizedString;
  date: string; // ISO date string
  showCountdown: boolean; // Toggle for countdown
  rsvpDeadline: string; // ISO date string for RSVP
  location: {
    name: LocalizedString;
    address: LocalizedString;
    mapUrl: string;
  };
  message: LocalizedString;
  googleFormUrl: string; 
  googleScriptUrl: string; 
  showSchedule: boolean; 
  schedule: ScheduleItem[];
  faq: FaqItem[]; // New FAQ Section
  showGallery: boolean; // New: Toggle Gallery
  gallery: string[]; // New: Gallery Images
  musicUrl: string; // New: Background Music
  images: {
    hero: string;
    groom: string;
    bride: string;
  };
  theme: ThemeColors;
  fonts: FontConfig;
  visuals: VisualConfig;
}

export const FONT_OPTIONS = {
  en: [
    { label: 'Cormorant Garamond (Elegant)', value: '"Cormorant Garamond"' },
    { label: 'Playfair Display (Bold)', value: '"Playfair Display"' },
    { label: 'Montserrat (Modern)', value: '"Montserrat"' },
  ],
  ja: [
    { label: 'Noto Sans JP (Clean)', value: '"Noto Sans JP"' },
    { label: 'Shippori Mincho (Classic)', value: '"Shippori Mincho"' },
    { label: 'Zen Maru Gothic (Soft)', value: '"Zen Maru Gothic"' },
  ],
  my: [
    { label: 'Padauk (Standard)', value: '"Padauk"' },
    { label: 'Noto Serif Myanmar (Formal)', value: '"Noto Serif Myanmar"' },
    { label: 'Noto Sans Myanmar (Modern)', value: '"Noto Sans Myanmar"' },
  ]
};

export const DEFAULT_DATA: WeddingData = {
  groomName: { en: 'Groom', ja: 'アモーレ', my: 'အမိုးရေး' },
  brideName: { en: 'Bride', ja: 'メイ', my: 'မေ' },
  date: '2025-05-10T10:00:00',
  showCountdown: true,
  rsvpDeadline: '2025-04-05',
  location: {
    name: { en: 'Akasaka Area', ja: '赤坂エリア', my: 'Akasaka Area' },
    address: { en: 'Minato City, Tokyo', ja: '東京都港区', my: 'Minato City, Tokyo' },
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.1611203892307!2d139.7036731752753!3d35.69765252907259!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188cd8b5b7ac67%3A0x9ce2f5afc23c6d3a!2sWedding%26Party%20BATUR%20Tokyo!5e0!3m2!1sen!2sjp!4v1766565748294!5m2!1sen!2sjp'
  },
  message: {
    en: "We invite you to share in our joy as we exchange marriage vows.",
    ja: "このたび 私たちは結婚することになりました\n皆様に見守られながら 新しい人生の第一歩を踏み出したいと存じます",
    my: "ကျွန်ုပ်တို့၏ မင်္ဂလာပွဲသို့ ကြွရောက်ချီးမြှင့်ပါရန် ဖိတ်ကြားအပ်ပါသည်။"
  },
  googleFormUrl: '', 
  googleScriptUrl: 'PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE', 
  showSchedule: true,
  schedule: [
    { time: '10:30', title: { en: 'Registration', ja: '受付開始', my: 'ဧည့်ခံခြင်း' }, icon: 'reception' },
    { time: '11:00', title: { en: 'Grand Entrance', ja: '開宴・新郎新婦入場', my: 'မင်္ဂလာဧည့်ခံပွဲ စတင်ခြင်း' }, icon: 'party' },
    { time: '11:15', title: { en: 'Toast', ja: '乾杯', my: 'မင်္ဂလာစကားပြောကြားခြင်း' }, icon: 'toast' },
    { time: '11:30', title: { en: 'Meal & Conversation', ja: 'お食事歓談', my: 'ဧည့်ခံကျွေးမွေးခြင်း' }, icon: 'meal' },
    { time: '12:00', title: { en: 'Photo Session', ja: 'フォトラウンド', my: 'အမှတ်တရဓာတ်ပုံရိုက်ကူးခြင်း' }, icon: 'camera' },
    { time: '12:15', title: { en: 'Games & Entertainment', ja: '余興・ゲーム', my: 'ဖျော်ဖြေရေး အစီအစဉ်များ' }, icon: 'party' },
    { time: '13:00', title: { en: 'Conclusion & Send-off', ja: 'お披楽喜・送賓', my: 'ဧည့်ခံပွဲ ပြီးဆုံးခြင်း' }, icon: 'reception' },
  ],
  faq: [
    {
      question: { en: "Can I bring a +1?", ja: "同伴者を連れて行ってもいいですか？", my: "ဧည့်သည်အပို ခေါ်လာလို့ရပါသလား?" },
      answer: { 
        en: "We kindly ask that only those who received this invitation attend. If you are bringing a plus one, please register them in the RSVP form so we can arrange for you to be seated together.", 
        ja: "お席の都合上、ご招待申し上げた方のみのご出席をお願いしております。お連れ様がいらっしゃる場合は、お席を隣同士でご用意いたしますので、RSVPフォームにてお知らせください。", 
        my: "နေရာထိုင်ခင်း အခက်အခဲရှိပါသဖြင့် ဖိတ်ကြားထားသူများသာ တက်ရောက်ပေးပါရန် မေတ္တာရပ်ခံပါသည်။ အဖော်ခေါ်လာမည်ဆိုပါက နေရာအတူတကွစီစဉ်နိုင်ရန် RSVP တွင် ဖြည့်စွက်ပေးပါ။" 
      },
      icon: 'users'
    },
    {
      question: { en: "What should I wear?", ja: "服装の指定はありますか？", my: "ဘာဝတ်ဆင်ရမလဲ?" },
      answer: { 
        en: "Formal attire is requested.", 
        ja: "フォーマルな服装でお越しください。", 
        my: "Formal ဝတ်စုံ ဝတ်ဆင်ပေးပါရန် မေတ္တာရပ်ခံပါသည်။" 
      },
      icon: 'shirt'
    },
    {
      question: { en: "What time should I arrive?", ja: "何時に到着すればいいですか？", my: "ဘယ်အချိန်အရောက်လာရမလဲ?" },
      answer: { 
        en: "The ceremony begins at {{time}}. Please arrive 20 minutes early.", 
        ja: "挙式は{{time}}に始まります。20分前にはお越しください。", 
        my: "မင်္ဂလာပွဲသည် {{time}} တွင် စတင်မည်ဖြစ်ပါသဖြင့် မိနစ် ၂၀ ကြိုတင်ရောက်ရှိပေးပါ။" 
      },
      icon: 'clock'
    },
    {
      question: { en: "Is parking available?", ja: "駐車場はありますか？", my: "ကားပါကင်ရှိပါသလား?" },
      answer: { 
        en: "Unfortunately, parking is not available at the venue. Please use nearby public parking.", 
        ja: "申し訳ございませんが、会場に専用駐車場はございません。近隣のコインパーキングをご利用ください。", 
        my: "ကားပါကင်မရှိပါ။ ကျေးဇူးပြု၍ အနီးနားရှိ အခပေးကားပါကင်ကို အသုံးပြုပါ။" 
      },
      icon: 'map'
    },
    {
      question: { en: "I have a dietary restriction.", ja: "アレルギーがあります。", my: "မတည့်သည့် အစားအသောက်များ ရှိပါက?" },
      answer: { 
        en: "Please let us know when you RSVP so we can accommodate your needs.", 
        ja: "RSVPフォームにてお知らせください。対応させていただきます。", 
        my: "ကျေးဇူးပြု၍ RSVP ပုံစံတွင် ဖြည့်စွက်ဖော်ပြပေးပါ။" 
      },
      icon: 'utensils'
    },
    {
      question: { en: "What is the deadline to RSVP?", ja: "返信期限はいつですか？", my: "ဘယ်တော့နောက်ဆုံး အကြောင်းပြန်ရမလဲ?" },
      answer: { 
        en: "Please RSVP by {{deadline}}.", 
        ja: "{{deadline}}までにご返信をお願いいたします。", 
        my: "{{deadline}} နောက်ဆုံးထား၍ အကြောင်းပြန်ပေးပါ။" 
      },
      icon: 'calendar'
    }
  ],
  "showGallery": true,
  "gallery": [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1511285560982-1351cdeb9821?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1520854221256-17451cc330e7?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1522673607200-1645062cd495?auto=format&fit=crop&q=80&w=800'
  ],
  "musicUrl": '', // Default empty
  "images": {
    "hero": "https://picsum.photos/1920/1080?random=1",
    "groom": "https://picsum.photos/400/500?random=2",
    "bride": "https://picsum.photos/400/500?random=3",
  },
  "theme": {
    "primary": "#C5A059",      
    "text": "#4A4A4A",         
    "backgroundTint": "#F5F0E6" 
  },
  "fonts": {
    "en": "\"Cormorant Garamond\"",
    "ja": "\"Shippori Mincho\"",
    "my": "\"Padauk\""
  },
  "visuals": {
    "enableAnimations": true,
    "enableEnvelope": true
  }
};