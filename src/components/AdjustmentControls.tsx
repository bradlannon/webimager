import { useState, useEffect, useMemo } from 'react';
import { Palette } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { PresetGrid } from './PresetGrid';
import type { Adjustments } from '../types/editor';

const sliders: { key: keyof Omit<Adjustments, 'greyscale' | 'blur' | 'sharpen'>; label: string }[] = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'saturation', label: 'Saturation' },
];

export function AdjustmentControls() {
  const { adjustments, setAdjustment, toggleGreyscale, sourceImage, activePreset, setPreset } = useEditorStore();

  // Thumbnail for preset previews
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceImage) {
      setThumbnailUrl(null);
      return;
    }
    const size = 64;
    const canvas = document.createElement('canvas');
    const aspect = sourceImage.width / sourceImage.height;
    canvas.width = aspect >= 1 ? size : Math.round(size * aspect);
    canvas.height = aspect >= 1 ? Math.round(size / aspect) : size;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.6));
  }, [sourceImage]);

  // Local state for debounced blur/sharpen sliders
  const [localBlur, setLocalBlur] = useState(adjustments.blur);
  const [localSharpen, setLocalSharpen] = useState(adjustments.sharpen);

  // Sync local state when store changes externally (e.g., reset)
  useEffect(() => setLocalBlur(adjustments.blur), [adjustments.blur]);
  useEffect(() => setLocalSharpen(adjustments.sharpen), [adjustments.sharpen]);

  // Debounced store updates (150ms delay)
  const debouncedSetBlur = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (v: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => setAdjustment('blur', v), 150);
    };
  }, [setAdjustment]);

  const debouncedSetSharpen = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (v: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => setAdjustment('sharpen', v), 150);
    };
  }, [setAdjustment]);

  return (
    <div className="space-y-3">
      <PresetGrid thumbnailUrl={thumbnailUrl} activePreset={activePreset} onSelect={setPreset} />
      <hr className="border-neutral-200" />
      {sliders.map(({ key, label }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={`slider-${key}`}
              className="text-xs text-neutral-600 cursor-pointer select-none"
              title="Double-click to reset"
              onDoubleClick={() => setAdjustment(key, 100)}
            >
              {label}
            </label>
            <span className="text-xs text-neutral-500 tabular-nums">
              {adjustments[key]}%
            </span>
          </div>
          <input
            id={`slider-${key}`}
            type="range"
            min={0}
            max={200}
            step={1}
            value={adjustments[key]}
            onChange={(e) => setAdjustment(key, Number(e.target.value))}
            className="w-full"
          />
        </div>
      ))}

      {/* Blur slider (0-20px, debounced) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="slider-blur"
            className="text-xs text-neutral-600 cursor-pointer select-none"
            title="Double-click to reset"
            onDoubleClick={() => { setLocalBlur(0); setAdjustment('blur', 0); }}
          >
            Blur
          </label>
          <span className="text-xs text-neutral-500 tabular-nums">
            {localBlur}px
          </span>
        </div>
        <input
          id="slider-blur"
          type="range"
          min={0}
          max={20}
          step={1}
          value={localBlur}
          onChange={(e) => {
            const v = Number(e.target.value);
            setLocalBlur(v);
            debouncedSetBlur(v);
          }}
          className="w-full"
        />
      </div>

      {/* Sharpen slider (0-100%, debounced) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="slider-sharpen"
            className="text-xs text-neutral-600 cursor-pointer select-none"
            title="Double-click to reset"
            onDoubleClick={() => { setLocalSharpen(0); setAdjustment('sharpen', 0); }}
          >
            Sharpen
          </label>
          <span className="text-xs text-neutral-500 tabular-nums">
            {localSharpen}%
          </span>
        </div>
        <input
          id="slider-sharpen"
          type="range"
          min={0}
          max={100}
          step={1}
          value={localSharpen}
          onChange={(e) => {
            const v = Number(e.target.value);
            setLocalSharpen(v);
            debouncedSetSharpen(v);
          }}
          className="w-full"
        />
      </div>

      <button
        type="button"
        className={`mt-3 flex items-center justify-center gap-2 w-full px-3 py-1.5 text-sm rounded-lg transition-colors ${
          adjustments.greyscale
            ? 'bg-blue-500 text-white'
            : 'hover:bg-neutral-200 text-neutral-700'
        }`}
        onClick={toggleGreyscale}
      >
        <Palette className="w-4 h-4" />
        Greyscale
      </button>
    </div>
  );
}
