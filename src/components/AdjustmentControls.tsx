import { Palette } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import type { Adjustments } from '../types/editor';

const sliders: { key: keyof Omit<Adjustments, 'greyscale'>; label: string }[] = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'saturation', label: 'Saturation' },
];

export function AdjustmentControls() {
  const { adjustments, setAdjustment, toggleGreyscale } = useEditorStore();

  return (
    <div className="space-y-3">
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
