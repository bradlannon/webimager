import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { CROP_PRESETS, constrainToAspectRatio } from '../utils/crop';

export function CropToolbar() {
  const applyCrop = useEditorStore((s) => s.applyCrop);
  const exitCropMode = useEditorStore((s) => s.exitCropMode);
  const clearCrop = useEditorStore((s) => s.clearCrop);
  const cropRegion = useEditorStore((s) => s.cropRegion);
  const setCrop = useEditorStore((s) => s.setCrop);
  const cropAspectRatio = useEditorStore((s) => s.cropAspectRatio);
  const setCropAspectRatio = useEditorStore((s) => s.setCropAspectRatio);
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const transforms = useEditorStore((s) => s.transforms);

  // Track whether a crop existed before entering crop mode
  const [hadCropBefore] = useState(() => {
    const region = useEditorStore.getState().cropRegion;
    return region !== null && !(region.x === 0 && region.y === 0 && region.width === 100 && region.height === 100);
  });

  // Get source dimensions (post-rotation)
  const isRotated90 = transforms.rotation === 90 || transforms.rotation === 270;
  const sourceW = sourceImage ? (isRotated90 ? sourceImage.height : sourceImage.width) : 1;
  const sourceH = sourceImage ? (isRotated90 ? sourceImage.width : sourceImage.height) : 1;

  const [presetIndex, setPresetIndex] = useState(0);

  // Sync preset index with store aspect ratio
  useEffect(() => {
    if (cropAspectRatio === null) {
      setPresetIndex(0);
    } else {
      const idx = CROP_PRESETS.findIndex((p) => p.ratio !== null && Math.abs(p.ratio - cropAspectRatio) < 0.001);
      if (idx >= 0) setPresetIndex(idx);
    }
  }, [cropAspectRatio]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    setPresetIndex(idx);
    const preset = CROP_PRESETS[idx];
    setCropAspectRatio(preset.ratio);

    // Immediately constrain current crop to the new ratio
    if (preset.ratio !== null && cropRegion) {
      const constrained = constrainToAspectRatio(
        cropRegion.width,
        cropRegion.height,
        preset.ratio,
        sourceW,
        sourceH
      );
      setCrop({
        ...cropRegion,
        width: constrained.width,
        height: constrained.height,
      });
    }
  };

  const handleApply = () => {
    applyCrop();
  };

  const handleCancel = () => {
    if (!hadCropBefore) {
      clearCrop();
    } else {
      exitCropMode();
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-neutral-50 border-b border-neutral-200 shrink-0">
      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        Crop
      </span>

      <select
        value={presetIndex}
        onChange={handlePresetChange}
        className="px-2 py-1 text-sm bg-white border border-neutral-300 rounded-md text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {CROP_PRESETS.map((preset, i) => (
          <option key={`${preset.label}-${i}`} value={i}>
            {preset.label}
          </option>
        ))}
      </select>

      <div className="flex-1" />

      <button
        type="button"
        onClick={handleCancel}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded-md transition-colors"
      >
        <X className="w-4 h-4" />
        Cancel
      </button>

      <button
        type="button"
        onClick={handleApply}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
      >
        <Check className="w-4 h-4" />
        Apply
      </button>
    </div>
  );
}
