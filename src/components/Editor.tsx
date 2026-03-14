import { useEditorStore } from '../store/editorStore';
import { Canvas } from './Canvas';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { CropToolbar } from './CropToolbar';

export function Editor() {
  const cropMode = useEditorStore((s) => s.cropMode);

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      {/* Spacer for fixed top bar (64px) */}
      <div style={{ height: '64px' }} className="shrink-0" />
      {cropMode && <CropToolbar />}
      {/* Canvas area fills between top bar and fixed bottom bar */}
      <div className="relative flex-1 overflow-hidden" style={{ marginBottom: '48px' }}>
        <Canvas />
      </div>
      <BottomBar />
    </div>
  );
}
