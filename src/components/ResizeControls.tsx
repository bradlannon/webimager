import { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Loader2, AlertTriangle } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { calcResizeDimensions, cropToPixels } from '../utils/crop';

export function ResizeControls() {
  const { sourceImage, cropRegion, cropMode, applyResize } = useEditorStore();

  // Derive current (post-crop) dimensions
  const getCurrentDimensions = useCallback(() => {
    if (!sourceImage) return { w: 0, h: 0 };
    const w = sourceImage.width;
    const h = sourceImage.height;
    if (cropRegion && !cropMode) {
      const px = cropToPixels(cropRegion, w, h);
      return { w: px.sw, h: px.sh };
    }
    return { w, h };
  }, [sourceImage, cropRegion, cropMode]);

  const current = getCurrentDimensions();

  const [targetWidth, setTargetWidth] = useState(current.w);
  const [targetHeight, setTargetHeight] = useState(current.h);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [isPercentage, setIsPercentage] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Re-initialize when source image or crop changes
  useEffect(() => {
    const dims = getCurrentDimensions();
    if (isPercentage) {
      setTargetWidth(100);
      setTargetHeight(100);
    } else {
      setTargetWidth(dims.w);
      setTargetHeight(dims.h);
    }
  }, [sourceImage, getCurrentDimensions, isPercentage]);

  if (!sourceImage) return null;

  const displayWidth = isPercentage
    ? targetWidth
    : targetWidth;
  const displayHeight = isPercentage
    ? targetHeight
    : targetHeight;

  // Check upscale
  const pixelW = isPercentage ? Math.round(current.w * targetWidth / 100) : targetWidth;
  const pixelH = isPercentage ? Math.round(current.h * targetHeight / 100) : targetHeight;
  const isUpscale = pixelW > current.w || pixelH > current.h;

  // Dimensions unchanged check
  const unchanged = pixelW === current.w && pixelH === current.h;

  const handleWidthChange = (val: number) => {
    setTargetWidth(val);
    if (aspectLocked) {
      const result = calcResizeDimensions(
        current.w, current.h,
        isPercentage ? val : val,
        isPercentage ? val : targetHeight,
        true, isPercentage
      );
      if (isPercentage) {
        // In percentage mode, width percentage drives both
        setTargetHeight(val);
      } else {
        setTargetHeight(result.height);
      }
    }
  };

  const handleHeightChange = (val: number) => {
    setTargetHeight(val);
    if (aspectLocked) {
      if (isPercentage) {
        setTargetWidth(val);
      } else {
        const result = calcResizeDimensions(
          current.w, current.h,
          targetWidth,
          val,
          true, false
        );
        setTargetWidth(result.width);
      }
    }
  };

  const togglePercentage = () => {
    if (isPercentage) {
      // Switching to pixels
      setTargetWidth(pixelW);
      setTargetHeight(pixelH);
    } else {
      // Switching to percentage
      const pctW = current.w > 0 ? Math.round((targetWidth / current.w) * 100) : 100;
      const pctH = current.h > 0 ? Math.round((targetHeight / current.h) * 100) : 100;
      setTargetWidth(pctW);
      setTargetHeight(pctH);
    }
    setIsPercentage(!isPercentage);
  };

  const handleApply = async () => {
    if (unchanged || isApplying) return;
    setIsApplying(true);
    try {
      await applyResize(pixelW, pixelH);
      // After resize, dimensions will update via useEffect on sourceImage change
    } finally {
      setIsApplying(false);
    }
  };

  const inputClass =
    'w-full px-2 py-1 text-sm bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 tabular-nums';

  const unitLabel = isPercentage ? '%' : 'px';

  return (
    <div className="space-y-3">
      {/* Current dimensions display */}
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Current: {current.w} x {current.h} px
      </p>

      {/* Width input */}
      <div>
        <label
          htmlFor="resize-width"
          className="text-xs text-neutral-600 dark:text-neutral-400"
        >
          W ({unitLabel})
        </label>
        <input
          id="resize-width"
          type="number"
          min={isPercentage ? 1 : 1}
          max={isPercentage ? 10000 : 10000}
          value={displayWidth}
          onChange={(e) => handleWidthChange(Number(e.target.value))}
          className={inputClass}
        />
      </div>

      {/* Lock toggle */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-400 transition-colors"
          onClick={() => setAspectLocked(!aspectLocked)}
          aria-label={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          title={aspectLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
        >
          {aspectLocked ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Height input */}
      <div>
        <label
          htmlFor="resize-height"
          className="text-xs text-neutral-600 dark:text-neutral-400"
        >
          H ({unitLabel})
        </label>
        <input
          id="resize-height"
          type="number"
          min={isPercentage ? 1 : 1}
          max={isPercentage ? 10000 : 10000}
          value={displayHeight}
          onChange={(e) => handleHeightChange(Number(e.target.value))}
          className={inputClass}
        />
      </div>

      {/* Pixel/Percentage toggle */}
      <div className="flex rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-600">
        <button
          type="button"
          className={`flex-1 px-2 py-1 text-xs transition-colors ${
            !isPercentage
              ? 'bg-blue-500 text-white'
              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600'
          }`}
          onClick={() => isPercentage && togglePercentage()}
        >
          Pixels
        </button>
        <button
          type="button"
          className={`flex-1 px-2 py-1 text-xs transition-colors ${
            isPercentage
              ? 'bg-blue-500 text-white'
              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600'
          }`}
          onClick={() => !isPercentage && togglePercentage()}
        >
          Percent
        </button>
      </div>

      {/* Upscale warning */}
      {isUpscale && (
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs">Enlarging may reduce quality</span>
        </div>
      )}

      {/* Apply button */}
      <button
        type="button"
        disabled={unchanged || isApplying}
        className={`flex items-center justify-center gap-2 w-full px-3 py-1.5 text-sm rounded-lg transition-colors ${
          unchanged || isApplying
            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
        onClick={handleApply}
      >
        {isApplying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Resizing...
          </>
        ) : (
          <>Apply Resize</>
        )}
      </button>

      {/* Result dimensions preview */}
      {!unchanged && !isApplying && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          {pixelW} x {pixelH} px
        </p>
      )}
    </div>
  );
}
