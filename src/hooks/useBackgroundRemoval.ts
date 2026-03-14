import { useState, useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export type BackgroundRemovalStatus =
  | 'idle'
  | 'confirming'
  | 'downloading'
  | 'inferring'
  | 'done'
  | 'error';

/**
 * Extract pixel data from a source ImageBitmap at its native dimensions.
 * Used to send image data to the background removal worker.
 */
function getSourceImageData(source: ImageBitmap): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  return ctx.getImageData(0, 0, source.width, source.height);
}

export function useBackgroundRemoval() {
  const [status, setStatus] = useState<BackgroundRemovalStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelCached, setModelCached] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const cancelledRef = useRef(false);

  const createWorker = useCallback(() => {
    const worker = new Worker(
      new URL('../workers/backgroundRemoval.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onerror = (e: ErrorEvent) => {
      e.preventDefault();
      setStatus('error');
      setError(e.message || 'Background removal worker failed to load');
    };

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;

      switch (msg.type) {
        case 'download-progress':
          // progress_callback sends 0-100
          setDownloadProgress(Math.min(msg.progress ?? 0, 100));
          break;

        case 'model-ready':
          setModelCached(true);
          // Immediately start inference after model loads
          startInferenceInternal(worker);
          break;

        case 'inference-start':
          setStatus('inferring');
          break;

        case 'inference-complete':
          if (!cancelledRef.current) {
            useEditorStore.getState().setBackgroundMask(msg.maskData);
            setStatus('done');
          }
          break;

        case 'error':
          setStatus('error');
          setError(msg.message);
          break;

        case 'cancelled':
          setStatus('idle');
          break;
      }
    };

    workerRef.current = worker;
    return worker;
  }, []);

  const startInferenceInternal = useCallback((worker: Worker) => {
    const sourceImage = useEditorStore.getState().sourceImage;
    if (!sourceImage) return;

    cancelledRef.current = false;
    setStatus('inferring');

    const imageData = getSourceImageData(sourceImage);
    worker.postMessage(
      { type: 'run-inference', imageData },
      [imageData.data.buffer] as any
    );
  }, []);

  const requestRemoval = useCallback(() => {
    setError(null);
    if (modelCached) {
      // Model already loaded -- go straight to inference
      const worker = workerRef.current;
      if (worker) {
        startInferenceInternal(worker);
      }
    } else {
      // First time -- need user confirmation for download
      setStatus('confirming');
    }
  }, [modelCached, startInferenceInternal]);

  const confirmDownload = useCallback(() => {
    setError(null);
    setDownloadProgress(0);
    setStatus('downloading');

    try {
      const worker = workerRef.current ?? createWorker();
      worker.postMessage({ type: 'load-model' });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start background removal');
    }
  }, [createWorker]);

  const cancel = useCallback(() => {
    if (status === 'downloading') {
      // Terminate worker to abort download; create fresh one for next attempt
      workerRef.current?.terminate();
      workerRef.current = null;
      setModelCached(false);
    } else if (status === 'inferring') {
      // Cannot interrupt inference; discard result when it arrives
      cancelledRef.current = true;
    }
    setStatus('idle');
    setDownloadProgress(0);
    setError(null);
  }, [status]);

  const restoreBackground = useCallback(() => {
    useEditorStore.getState().toggleBackground();
  }, []);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return {
    status,
    downloadProgress,
    error,
    modelCached,
    requestRemoval,
    confirmDownload,
    cancel,
    restoreBackground,
  };
}
