import { useEditorStore } from '../store/editorStore';
import { Canvas } from './Canvas';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';

export function Editor() {
  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      {/* Spacer for fixed top bar (64px) */}
      <div style={{ height: '64px' }} className="shrink-0" />
      {/* Canvas area fills between top bar and fixed bottom bar */}
      <div className="flex flex-col flex-1 overflow-hidden" style={{ marginBottom: '48px' }}>
        <Canvas />
      </div>
      <BottomBar />
    </div>
  );
}
