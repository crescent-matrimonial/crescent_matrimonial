import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, User, Download } from 'lucide-react';

interface PhotoCarouselProps {
  photos: string[];
  name: string;
  initialIndex?: number;
  onClose: () => void;
}

export function PhotoCarousel({ photos, name, initialIndex = 0, onClose }: PhotoCarouselProps) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => {
    setIdx(initialIndex);
  }, [initialIndex]);

  const next = useCallback(() => setIdx((i) => (i + 1) % photos.length), [photos.length]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && photos.length > 1) next();
      if (e.key === 'ArrowLeft' && photos.length > 1) prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, next, prev, photos.length]);

  const downloadPhoto = useCallback(async () => {
    const url = photos[idx];
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      const ext = blob.type.split('/')[1] || 'jpg';
      a.download = `${name.replace(/[^a-zA-Z0-9]+/g, '_')}_${idx + 1}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9]+/g, '_')}_${idx + 1}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }, [photos, idx, name]);

  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={onClose}>
        <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex h-48 w-48 items-center justify-center rounded-full bg-slate-800">
            <User className="h-20 w-20 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">No photos available for {name}</p>
          <button onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="relative flex max-h-[90vh] max-w-3xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -top-2 right-0 z-10 flex items-center gap-1.5">
          <button
            onClick={downloadPhoto}
            className="rounded-full bg-slate-800/80 p-2 text-slate-300 transition hover:bg-sky-600 hover:text-white"
            title="Download photo"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-800/80 p-2 text-slate-300 transition hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <img
          src={photos[idx]}
          alt={`${name} - photo ${idx + 1}`}
          className="max-h-[80vh] max-w-full rounded-lg object-contain"
        />

        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-800/80 p-2 text-slate-200 transition hover:bg-slate-700"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-800/80 p-2 text-slate-200 transition hover:bg-slate-700"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <div className="mt-3 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition ${
                    i === idx ? 'w-6 bg-sky-400' : 'w-2 bg-slate-600 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {photos.length > 1
            ? `${idx + 1} of ${photos.length} photos`
            : `1 of ${photos.length} photo`}
        </p>
      </div>
    </div>
  );
}
