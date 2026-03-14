import { useState, useEffect } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { CROP_PRESETS, constrainToAspectRatio } from '../utils/crop';

export function CropToolbar() {
  const applyCrop = useEditorStore((s) => s.applyCrop);
  const clearCrop = useEditorStore((s) => s.clearCrop);
  const cropRegion = useEditorStore((s) => s.cropRegion);
  const setCrop = useEditorStore((s) => s.setCrop);
  const cropAspectRatio = useEditorStore((s) => s.cropAspectRatio);
  const setCropAspectRatio = useEditorStore((s) => s.setCropAspectRatio);
  const sourceImage = useEditorStore((s) => s.sourceImage);
  const transforms = useEditorStore((s) => s.transforms);

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

  // Done = auto-save the crop and exit
  const handleDone = () => {
    applyCrop();
  };

  // Reset = clear the crop entirely
  const handleReset = () => {
    clearCrop();
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
        onClick={handleReset}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded-md transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Reset
      </button>

      <button
        type="button"
        onClick={handleDone}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#2A9D8F] hover:bg-[#238578] rounded-md transition-colors"
      >
        <Check className="w-4 h-4" />
        Done
      </button>
    </div>
  );
}
