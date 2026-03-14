import { useEditorStore } from '../store/editorStore';
import { Canvas } from './Canvas';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { CropToolbar } from './CropToolbar';

export function Editor() {
  const cropMode = useEditorStore((s) => s.cropMode);

  return (
    <div className="flex flex-col h-screen bg-neutral-100">
      <TopBar />
      <div style={{ height: '64px' }} className="shrink-0" />
      {cropMode && <CropToolbar />}
      <div className="relative flex-1 overflow-hidden pb-[48px] md:pb-[56px]">
        <Canvas />
      </div>
      <BottomBar />
    </div>
  );
}
