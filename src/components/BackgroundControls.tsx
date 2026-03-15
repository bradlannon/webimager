import { Eraser, Undo2, AlertCircle, X, Loader2 } from 'lucide-react';
import type { useBackgroundRemoval } from '../hooks/useBackgroundRemoval';
import { useEditorStore } from '../store/editorStore';

export function BackgroundControls({ bgRemoval }: { bgRemoval: ReturnType<typeof useBackgroundRemoval> }) {
  const { status, downloadProgress, error, requestRemoval, confirmDownload, cancel, restoreBackground } =
    bgRemoval;
  const cropMode = useEditorStore((s) => s.cropMode);
  const backgroundRemoved = useEditorStore((s) => s.backgroundRemoved);

  const replacementColor = useEditorStore((s) => s.replacementColor);
  const setReplacementColor = useEditorStore((s) => s.setReplacementColor);

  // When background is removed and we're idle or done, show restore/remove toggle + color picker
  if ((status === 'idle' || status === 'done') && backgroundRemoved) {
    const presets: { label: string; value: string | null; color?: string }[] = [
      { label: 'White', value: '#ffffff', color: '#ffffff' },
      { label: 'Black', value: '#000000', color: '#000000' },
      { label: 'None', value: null },
    ];

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <button
            type="button"
            onClick={restoreBackground}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            Restore Background
          </button>
          <button
            type="button"
            onClick={requestRemoval}
            disabled={cropMode}
            className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remove again
          </button>
        </div>

        {/* Background Color Replacement */}
        <div className="space-y-2">
          <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Replace Background</span>
          <div className="flex items-center gap-2">
            {presets.map((preset) => {
              const isActive = preset.value === null
                ? replacementColor === null
                : replacementColor === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  title={preset.label}
                  onClick={() => setReplacementColor(preset.value)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    isActive
                      ? 'ring-2 ring-[#2A9D8F] ring-offset-1'
                      : 'ring-1 ring-neutral-300'
                  } ${preset.value === '#ffffff' ? 'border border-neutral-200' : ''}`}
                  style={
                    preset.color
                      ? { backgroundColor: preset.color }
                      : {
                          background:
                            'repeating-conic-gradient(#d4d4d4 0% 25%, #ffffff 0% 50%) 50% / 8px 8px',
                        }
                  }
                >
                  {preset.value === null && !isActive && (
                    <span className="flex items-center justify-center text-neutral-400 text-xs font-bold">/</span>
                  )}
                </button>
              );
            })}

            {/* Custom color picker */}
            <label className="flex flex-col items-center gap-0.5 cursor-pointer">
              <div
                className={`relative w-7 h-7 rounded-full overflow-hidden transition-all ${
                  replacementColor && replacementColor !== '#ffffff' && replacementColor !== '#000000'
                    ? 'ring-2 ring-[#2A9D8F] ring-offset-1'
                    : 'ring-1 ring-neutral-300'
                }`}
                style={{
                  background: replacementColor && replacementColor !== '#ffffff' && replacementColor !== '#000000'
                    ? replacementColor
                    : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                }}
              >
                <input
                  type="color"
                  value={replacementColor ?? '#2A9D8F'}
                  onChange={(e) => setReplacementColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="text-[10px] text-neutral-400">Custom</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  switch (status) {
    case 'idle':
      return (
        <button
          type="button"
          onClick={requestRemoval}
          disabled={cropMode}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eraser className="w-4 h-4" />
          Remove Background
        </button>
      );

    case 'confirming':
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-600 leading-relaxed">
            One-time ~45MB download. Runs entirely in your browser &mdash; your
            photo never leaves your device.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmDownload}
              className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Download &amp; Continue
            </button>
            <button
              type="button"
              onClick={cancel}
              className="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );

    case 'downloading':
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">
              Downloading model...
            </span>
            <span className="text-xs font-medium text-neutral-700">
              {Math.round(downloadProgress)}%
            </span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(downloadProgress)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        </div>
      );

    case 'inferring':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-xs text-neutral-600">
              Removing background...
            </span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-2 bg-blue-500 rounded-full animate-pulse w-full" />
          </div>
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        </div>
      );

    case 'done':
      return (
        <button
          type="button"
          onClick={restoreBackground}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
        >
          <Undo2 className="w-4 h-4" />
          Restore Background
        </button>
      );

    case 'error':
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{error || 'Something went wrong'}</p>
          </div>
          <button
            type="button"
            onClick={requestRemoval}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      );
  }
}
