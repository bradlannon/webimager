import { Type, Bold, Italic } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { TEXT_FONTS, TEXT_COLORS } from '../utils/text';

export function TextControls() {
  const textMode = useEditorStore((s) => s.textMode);
  const draftText = useEditorStore((s) => s.draftText);
  const enterTextMode = useEditorStore((s) => s.enterTextMode);
  const setDraftText = useEditorStore((s) => s.setDraftText);
  const setDraftStyle = useEditorStore((s) => s.setDraftStyle);

  if (!textMode || !draftText) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={enterTextMode}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg bg-[#2A9D8F] text-white hover:bg-[#248F82] transition-colors"
        >
          <Type className="w-4 h-4" />
          Add Text
        </button>
      </div>
    );
  }

  const { style } = draftText;

  const handleHexChange = (value: string) => {
    const hex = value.startsWith('#') ? value : `#${value}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setDraftStyle({ color: hex });
    }
  };

  return (
    <div className="space-y-3">
      {/* Text input */}
      <div>
        <label htmlFor="text-content" className="text-xs text-neutral-600 block mb-1">
          Text
        </label>
        <input
          id="text-content"
          type="text"
          value={draftText.content}
          onChange={(e) => setDraftText({ content: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
          placeholder="Enter text..."
        />
      </div>

      {/* Font selector */}
      <div>
        <label htmlFor="text-font" className="text-xs text-neutral-600 block mb-1">
          Font
        </label>
        <select
          id="text-font"
          value={style.fontFamily}
          onChange={(e) => setDraftStyle({ fontFamily: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
        >
          {TEXT_FONTS.map((font) => (
            <option key={font.id} value={font.family} style={{ fontFamily: font.family }}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Size slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="text-size" className="text-xs text-neutral-600">
            Size
          </label>
          <span className="text-xs text-neutral-500 tabular-nums">{style.fontSize}px</span>
        </div>
        <input
          id="text-size"
          type="range"
          min={12}
          max={120}
          step={1}
          value={style.fontSize}
          onChange={(e) => setDraftStyle({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Bold/Italic toggles */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDraftStyle({ bold: !style.bold })}
          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
            style.bold
              ? 'bg-[#2A9D8F] text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setDraftStyle({ italic: !style.italic })}
          className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
            style.italic
              ? 'bg-[#2A9D8F] text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
      </div>

      {/* Color swatches */}
      <div>
        <label className="text-xs text-neutral-600 block mb-1">Color</label>
        <div className="flex flex-wrap gap-2">
          {TEXT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setDraftStyle({ color })}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                style.color === color
                  ? 'border-[#2A9D8F] ring-2 ring-[#2A9D8F]/30'
                  : 'border-neutral-300 hover:border-neutral-400'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Hex input */}
      <div>
        <label htmlFor="text-hex" className="text-xs text-neutral-600 block mb-1">
          Custom Color
        </label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-neutral-500">#</span>
          <input
            id="text-hex"
            type="text"
            value={style.color.replace('#', '')}
            onChange={(e) => handleHexChange(e.target.value)}
            onBlur={(e) => handleHexChange(e.target.value)}
            maxLength={6}
            className="w-24 px-2 py-1 text-sm font-mono border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
            placeholder="000000"
          />
          <div
            className="w-6 h-6 rounded border border-neutral-300"
            style={{ backgroundColor: style.color }}
          />
        </div>
      </div>
    </div>
  );
}
