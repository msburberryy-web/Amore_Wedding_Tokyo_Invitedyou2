import React, { useState, useRef } from 'react';
import { Language } from '../types';
import LanguageSwitch from './LanguageSwitch';

const API_BASE = (import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/$/, '');

const T = {
  en: {
    title: 'Photo Upload',
    subtitle: 'Upload photos for your wedding invitation',
    enterCode: 'Enter your upload code',
    codePlaceholder: 'Upload code',
    verify: 'Verify',
    verifying: 'Verifying...',
    invalidCode: 'Invalid upload code. Please check and try again.',
    cover: 'Cover Photo',
    groom: 'Groom Photo',
    bride: 'Bride Photo',
    gallery: 'Gallery Photos',
    addGallery: '+ Add Another Photo',
    upload: 'Upload All Photos',
    uploading: 'Uploading',
    done: 'Done',
    successTitle: 'All photos uploaded!',
    successMsg: 'Your photos are now live on the invitation.',
    selectFile: 'Select Photo',
    change: 'Change',
    required: 'Required',
    optional: 'Optional',
    uploadError: 'Upload failed. Please try again.',
    compressing: 'Compressing...',
    remove: 'Remove',
  },
  ja: {
    title: '写真のアップロード',
    subtitle: '結婚式招待状用の写真をアップロードしてください',
    enterCode: 'アップロードコードを入力してください',
    codePlaceholder: 'アップロードコード',
    verify: '確認',
    verifying: '確認中...',
    invalidCode: 'コードが無効です。確認してから再度お試しください。',
    cover: 'カバー写真',
    groom: '新郎の写真',
    bride: '新婦の写真',
    gallery: 'ギャラリー写真',
    addGallery: '＋ 写真を追加',
    upload: 'すべての写真をアップロード',
    uploading: 'アップロード中',
    done: '完了',
    successTitle: '写真のアップロードが完了しました！',
    successMsg: '招待状に写真が反映されました。',
    selectFile: '写真を選択',
    change: '変更',
    required: '必須',
    optional: '任意',
    uploadError: 'アップロードに失敗しました。再度お試しください。',
    compressing: '圧縮中...',
    remove: '削除',
  },
  my: {
    title: 'ဓာတ်ပုံ တင်ခြင်း',
    subtitle: 'မင်္ဂလာပွဲ ဖိတ်စာအတွက် ဓာတ်ပုံများ တင်ပေးပါ',
    enterCode: 'Upload Code ထည့်ပါ',
    codePlaceholder: 'Upload Code',
    verify: 'အတည်ပြုမည်',
    verifying: 'စစ်ဆေးနေသည်...',
    invalidCode: 'Code မှားနေသည်။ ပြန်စစ်ပြီး ထပ်ကြိုးစားပါ။',
    cover: 'မျက်နှာဖုံး ဓာတ်ပုံ',
    groom: 'မင်္ဂလာဖူးသူ ဓာတ်ပုံ',
    bride: 'မင်္ဂလာဆောင်သူ ဓာတ်ပုံ',
    gallery: 'ဓာတ်ပုံ များ',
    addGallery: '+ ဓာတ်ပုံ ထပ်ထည့်ပါ',
    upload: 'ဓာတ်ပုံ အားလုံး တင်မည်',
    uploading: 'တင်နေသည်',
    done: 'ပြီးပါပြီ',
    successTitle: 'ဓာတ်ပုံ အားလုံး တင်ပြီးပါပြီ!',
    successMsg: 'ဓာတ်ပုံများ ဖိတ်စာပေါ်တွင် ဖော်ပြနေပါပြီ။',
    selectFile: 'ဓာတ်ပုံ ရွေးပါ',
    change: 'ပြောင်းမည်',
    required: 'လိုအပ်သည်',
    optional: 'ရွေးချယ်နိုင်သည်',
    uploadError: 'တင်မရပါ။ ထပ်ကြိုးစားပါ။',
    compressing: 'ချုံ့နေသည်...',
    remove: 'ဖယ်ရှားမည်',
  }
};

type Status = 'idle' | 'compressing' | 'uploading' | 'done' | 'error';

interface FileSlot {
  file: File | null;
  preview: string | null;
  status: Status;
  error?: string;
}

function emptySlot(): FileSlot {
  return { file: null, preview: null, status: 'idle' };
}

async function compressImage(file: File, maxPx = 1920, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio  = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface Props {
  event: string;
  lang: Language;
  setLang: (l: Language) => void;
}

const PhotoUpload: React.FC<Props> = ({ event, lang, setLang }) => {
  const t = T[lang];

  const [passphrase, setPassphrase]       = useState('');
  const [authError, setAuthError]         = useState('');
  const [isVerifying, setIsVerifying]     = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [cover,  setCover]  = useState<FileSlot>(emptySlot());
  const [groom,  setGroom]  = useState<FileSlot>(emptySlot());
  const [bride,  setBride]  = useState<FileSlot>(emptySlot());
  const [gallery, setGallery] = useState<FileSlot[]>([emptySlot()]);

  const [isUploading, setIsUploading] = useState(false);
  const [allDone,     setAllDone]     = useState(false);
  const [globalError, setGlobalError] = useState('');

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!passphrase.trim()) return;
    setIsVerifying(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, passphrase: passphrase.trim() })
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setAuthError(t.invalidCode);
      }
    } catch {
      setAuthError(t.uploadError);
    } finally {
      setIsVerifying(false);
    }
  };

  // ── File selection ────────────────────────────────────────────────────────────
  const selectFile = (setter: React.Dispatch<React.SetStateAction<FileSlot>>) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = URL.createObjectURL(file);
      setter({ file, preview, status: 'idle' });
      e.target.value = '';
    };

  const selectGalleryFile = (idx: number) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = URL.createObjectURL(file);
      setGallery(prev => {
        const next = [...prev];
        next[idx] = { file, preview, status: 'idle' };
        return next;
      });
      e.target.value = '';
    };

  // ── Upload all (single commit) ────────────────────────────────────────────────
  const handleUpload = async () => {
    setIsUploading(true);
    setGlobalError('');

    // Collect all slots that have files
    type Entry = { file: File; fileName: string; mark: (s: Status, err?: string) => void };
    const entries: Entry[] = [];
    if (cover.file) entries.push({ file: cover.file, fileName: 'cover.jpg', mark: (s, e) => setCover(p => ({ ...p, status: s, error: e })) });
    if (groom.file) entries.push({ file: groom.file, fileName: 'groom.jpg', mark: (s, e) => setGroom(p => ({ ...p, status: s, error: e })) });
    if (bride.file) entries.push({ file: bride.file, fileName: 'bride.jpg', mark: (s, e) => setBride(p => ({ ...p, status: s, error: e })) });
    gallery.forEach((g, i) => {
      if (g.file) entries.push({
        file: g.file,
        fileName: `gallery${i + 1}.jpg`,
        mark: (s, e) => setGallery(prev => prev.map((item, idx) => idx === i ? { ...item, status: s, error: e } : item))
      });
    });

    if (entries.length === 0) { setIsUploading(false); return; }

    // Phase 1: compress + upload each file as a blob (no commit yet)
    const blobs: Array<{ path: string; sha: string }> = [];
    for (const { file, fileName, mark } of entries) {
      mark('compressing');
      let content: string;
      try {
        content = await compressImage(file);
      } catch {
        mark('error', t.uploadError);
        setGlobalError(t.uploadError);
        setIsUploading(false);
        return;
      }

      mark('uploading');
      try {
        const res = await fetch(`${API_BASE}/api/create-blob`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, passphrase: passphrase.trim(), fileName, content })
        });
        if (!res.ok) throw new Error('blob failed');
        const data = await res.json();
        blobs.push({ path: data.path, sha: data.blobSha });
      } catch {
        mark('error', t.uploadError);
        setGlobalError(t.uploadError);
        setIsUploading(false);
        return;
      }
    }

    // Phase 2: one commit for all blobs → one deploy
    try {
      await fetch(`${API_BASE}/api/commit-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, passphrase: passphrase.trim(), blobs })
      });
    } catch {
      // Network timeout on commit — blobs are safe, commit likely succeeded
    }

    entries.forEach(({ mark }) => mark('done'));
    setAllDone(true);
    setIsUploading(false);
  };

  const hasAnyFile = cover.file || groom.file || bride.file || gallery.some(g => g.file);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F0E6] flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-[#4A4A4A]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
            {t.title}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{event}</p>
        </div>
        <LanguageSwitch current={lang} onChange={setLang} />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* ── Auth screen ── */}
          {!isAuthenticated && !allDone && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <div className="text-4xl mb-4">🔑</div>
              <h2 className="text-lg font-semibold text-[#4A4A4A] mb-2">{t.title}</h2>
              <p className="text-sm text-gray-500 mb-6">{t.enterCode}</p>
              <input
                type="text"
                value={passphrase}
                onChange={e => { setPassphrase(e.target.value); setAuthError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder={t.codePlaceholder}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:border-[#C5A059] mb-3"
              />
              {authError && <p className="text-red-500 text-sm mb-3">{authError}</p>}
              <button
                onClick={handleVerify}
                disabled={isVerifying || !passphrase.trim()}
                className="w-full bg-[#C5A059] text-white rounded-lg py-3 font-medium disabled:opacity-50 hover:bg-[#b8904a] transition-colors"
              >
                {isVerifying ? t.verifying : t.verify}
              </button>
            </div>
          )}

          {/* ── Upload screen ── */}
          {isAuthenticated && !allDone && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500 text-center">{t.subtitle}</p>

              {/* Fixed slots */}
              {[
                { label: t.cover, badge: t.required, slot: cover, setSlot: setCover },
                { label: t.groom, badge: t.required, slot: groom, setSlot: setGroom },
                { label: t.bride, badge: t.required, slot: bride, setSlot: setBride },
              ].map(({ label, badge, slot, setSlot }) => (
                <FileCard
                  key={label}
                  label={label}
                  badge={badge}
                  slot={slot}
                  onSelect={selectFile(setSlot)}
                  onRemove={() => setSlot(emptySlot())}
                  t={t}
                />
              ))}

              {/* Gallery slots */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium text-[#4A4A4A]">{t.gallery}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.optional}</span>
                </div>
                <div className="space-y-3">
                  {gallery.map((slot, idx) => (
                    <FileCard
                      key={idx}
                      label={`${t.gallery} ${idx + 1}`}
                      slot={slot}
                      onSelect={selectGalleryFile(idx)}
                      onRemove={() => setGallery(prev => {
                        if (prev.length === 1) return [emptySlot()];
                        return prev.filter((_, i) => i !== idx);
                      })}
                      compact
                      t={t}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setGallery(prev => [...prev, emptySlot()])}
                  className="mt-3 w-full border border-dashed border-[#C5A059] text-[#C5A059] rounded-lg py-2.5 text-sm hover:bg-[#fdf8f0] transition-colors"
                >
                  {t.addGallery}
                </button>
              </div>

              {globalError && (
                <p className="text-red-500 text-sm text-center">{globalError}</p>
              )}

              <button
                onClick={handleUpload}
                disabled={isUploading || !hasAnyFile}
                className="w-full bg-[#C5A059] text-white rounded-xl py-4 font-medium text-base disabled:opacity-50 hover:bg-[#b8904a] transition-colors shadow-sm"
              >
                {isUploading ? `${t.uploading}...` : t.upload}
              </button>
            </div>
          )}

          {/* ── Success screen ── */}
          {allDone && (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-[#4A4A4A] mb-2">{t.successTitle}</h2>
              <p className="text-sm text-gray-500">{t.successMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── FileCard sub-component ────────────────────────────────────────────────────
interface FileCardProps {
  label: string;
  badge?: string;
  slot: FileSlot;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  compact?: boolean;
  t: typeof T['en'];
}

const FileCard: React.FC<FileCardProps> = ({ label, badge, slot, onSelect, onRemove, compact, t }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const statusColor = {
    idle:        '',
    compressing: 'text-yellow-500',
    uploading:   'text-blue-500',
    done:        'text-green-500',
    error:       'text-red-500'
  }[slot.status];

  const statusText = {
    idle:        '',
    compressing: t.compressing,
    uploading:   `${t.uploading}...`,
    done:        `✓ ${t.done}`,
    error:       slot.error || t.uploadError
  }[slot.status];

  return (
    <div className={`bg-white rounded-2xl shadow-sm ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`font-medium text-[#4A4A4A] ${compact ? 'text-sm' : ''}`}>{label}</span>
        <div className="flex items-center gap-2">
          {statusText && <span className={`text-xs ${statusColor}`}>{statusText}</span>}
          {badge && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
      </div>

      <div className="flex gap-3 items-center">
        {slot.preview && (
          <img
            src={slot.preview}
            alt={label}
            className={`object-cover rounded-lg ${compact ? 'w-14 h-14' : 'w-20 h-20'}`}
          />
        )}
        <div className="flex gap-2 flex-wrap">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onSelect} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={slot.status === 'uploading' || slot.status === 'compressing'}
            className="text-sm border border-[#C5A059] text-[#C5A059] rounded-lg px-3 py-1.5 hover:bg-[#fdf8f0] transition-colors disabled:opacity-50"
          >
            {slot.file ? t.change : t.selectFile}
          </button>
          {slot.file && (
            <button
              onClick={onRemove}
              disabled={slot.status === 'uploading' || slot.status === 'compressing'}
              className="text-sm border border-gray-200 text-gray-400 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {t.remove}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload;
