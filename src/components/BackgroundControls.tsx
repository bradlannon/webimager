import { Eraser, Undo2, AlertCircle, X, Loader2 } from 'lucide-react';
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval';
import { useEditorStore } from '../store/editorStore';

export function BackgroundControls() {
  const { status, downloadProgress, error, requestRemoval, confirmDownload, cancel, restoreBackground } =
    useBackgroundRemoval();
  const cropMode = useEditorStore((s) => s.cropMode);
  const backgroundRemoved = useEditorStore((s) => s.backgroundRemoved);

  // When background is removed and we're idle or done, show restore/remove toggle
  if ((status === 'idle' || status === 'done') && backgroundRemoved) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={restoreBackground}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
        >
          <Undo2 className="w-4 h-4" />
          Restore Background
        </button>
        <button
          type="button"
          onClick={requestRemoval}
          disabled={cropMode}
          className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Remove again
        </button>
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
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eraser className="w-4 h-4" />
          Remove Background
        </button>
      );

    case 'confirming':
      return (
        <div className="space-y-3">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
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
              className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
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
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Downloading model...
            </span>
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {Math.round(downloadProgress)}%
            </span>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-600 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(downloadProgress)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
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
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Removing background...
            </span>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-600 rounded-full overflow-hidden">
            <div className="h-2 bg-blue-500 rounded-full animate-pulse w-full" />
          </div>
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
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
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
        >
          <Undo2 className="w-4 h-4" />
          Restore Background
        </button>
      );

    case 'error':
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{error || 'Something went wrong'}</p>
          </div>
          <button
            type="button"
            onClick={requestRemoval}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      );
  }
}
