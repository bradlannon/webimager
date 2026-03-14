import { useRef, useState, useEffect } from 'react';
import { Canvas } from './Canvas';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { ZoomControls } from './ZoomControls';

export function Editor() {
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setContainerRect({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    setContainerRect({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <TopBar />
      {/* Spacer for fixed top bar (64px) */}
      <div style={{ height: '64px' }} className="shrink-0" />
      {/* Canvas area fills between top bar and fixed bottom bar */}
      <div ref={canvasAreaRef} className="relative flex flex-col flex-1 overflow-hidden" style={{ marginBottom: '48px' }}>
        <Canvas />
        <ZoomControls containerRect={containerRect} />
      </div>
      <BottomBar />
    </div>
  );
}
