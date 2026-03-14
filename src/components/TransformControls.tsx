import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

export function TransformControls() {
  const { transforms, rotateLeft, rotateRight, flipHorizontal, flipVertical, resetAll, setFreeRotation } =
    useEditorStore();

  const btnClass =
    'p-2 rounded-lg hover:bg-neutral-200 text-neutral-700 transition-colors';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btnClass}
          onClick={rotateLeft}
          aria-label="Rotate left 90°"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={rotateRight}
          aria-label="Rotate right 90°"
        >
          <RotateCw className="w-5 h-5" />
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={flipHorizontal}
          aria-label="Flip horizontal"
        >
          <FlipHorizontal className="w-5 h-5" />
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={flipVertical}
          aria-label="Flip vertical"
        >
          <FlipVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Free rotation slider for straightening */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="free-rotation"
            className="text-xs text-neutral-600 cursor-pointer select-none"
            title="Double-click to reset"
            onDoubleClick={() => setFreeRotation(0)}
          >
            Straighten
          </label>
          <span className="text-xs text-neutral-500 tabular-nums">
            {transforms.freeRotation.toFixed(1)}&deg;
          </span>
        </div>
        <input
          id="free-rotation"
          type="range"
          min={-45}
          max={45}
          step={0.1}
          value={transforms.freeRotation}
          onChange={(e) => setFreeRotation(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {(transforms.rotation !== 0 || transforms.freeRotation !== 0) && (
        <p className="text-xs text-neutral-500">
          {transforms.rotation + transforms.freeRotation !== 0
            ? `${(transforms.rotation + transforms.freeRotation).toFixed(1)}° total rotation`
            : ''}
        </p>
      )}

      <button
        type="button"
        className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
        onClick={resetAll}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Reset all
      </button>
    </div>
  );
}
