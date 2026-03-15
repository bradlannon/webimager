import { PRESETS, presetToCssFilter } from '../utils/presets';

interface PresetGridProps {
  thumbnailUrl: string | null;
  activePreset: string | null;
  onSelect: (presetId: string) => void;
}

export function PresetGrid({ thumbnailUrl, activePreset, onSelect }: PresetGridProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {PRESETS.map((preset) => {
        const isActive =
          preset.id === 'none'
            ? activePreset === null
            : activePreset === preset.id;

        const filterStyle = presetToCssFilter(preset.adjustments);

        return (
          <button
            key={preset.id}
            type="button"
            className={`flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-lg transition-shadow ${
              isActive ? 'ring-2 ring-[#2A9D8F]' : ''
            }`}
            onClick={() => onSelect(preset.id)}
          >
            <div className="w-14 h-14 rounded overflow-hidden bg-neutral-100">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={preset.label}
                  className="w-full h-full object-cover"
                  style={{ filter: filterStyle !== 'none' ? filterStyle : undefined }}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
            <span className="text-[10px] text-neutral-600 leading-tight">
              {preset.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
