import { useEditorStore } from '../store/editorStore';
import { Canvas } from './Canvas';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { CropToolbar } from './CropToolbar';

export function Editor() {
  const cropMode = useEditorStore((s) => s.cropMode);

  return (
    <div className="flex flex-col h-screen bg-neutral-100 dark:bg-neutral-900">
      <TopBar />
      {cropMode && <CropToolbar />}
      <div className="relative flex-1 overflow-hidden">
        <Canvas />
      </div>
      <BottomBar />
    </div>
  );
}
