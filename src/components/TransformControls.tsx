import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

export function TransformControls() {
  const { transforms, rotateLeft, rotateRight, flipHorizontal, flipVertical, resetAll } =
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
          aria-label="Rotate left"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={rotateRight}
          aria-label="Rotate right"
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

      {transforms.rotation !== 0 && (
        <p className="text-xs text-neutral-500">
          {transforms.rotation}&deg; rotated
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
