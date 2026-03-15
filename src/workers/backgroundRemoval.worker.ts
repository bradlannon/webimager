import {
  env,
  AutoModel,
  AutoProcessor,
  RawImage,
} from '@huggingface/transformers';

env.allowLocalModels = false;

// Use single-threaded WASM to avoid SharedArrayBuffer requirement
// (SharedArrayBuffer needs COOP/COEP headers which may not be available)
env.backends.onnx.wasm!.numThreads = 1;

const MODEL_ID = 'briaai/RMBG-1.4';

let model: any = null;
let processor: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  try {
    switch (type) {
      case 'load-model':
        await loadModel();
        break;
      case 'run-inference':
        await runInference(e.data.imageData);
        break;
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

async function loadModel() {
  model = await AutoModel.from_pretrained(MODEL_ID, {
    config: { model_type: 'custom' } as any,
    progress_callback: (info: any) => {
      if (info.status === 'progress') {
        self.postMessage({
          type: 'download-progress',
          progress: info.progress ?? 0,
          loaded: info.loaded ?? 0,
          total: info.total ?? 0,
        });
      }
    },
  });

  processor = await AutoProcessor.from_pretrained(MODEL_ID, {
    config: {
      do_normalize: true,
      do_pad: false,
      do_rescale: true,
      do_resize: true,
      image_mean: [0.5, 0.5, 0.5],
      image_std: [1, 1, 1],
      feature_extractor_type: 'ImageFeatureExtractor',
      resample: 2,
      rescale_factor: 0.00392156862745098,
      size: { width: 1024, height: 1024 },
    },
  });

  self.postMessage({ type: 'model-ready' });
}

async function runInference(imageData: ImageData) {
  if (!model || !processor) throw new Error('Model not loaded');

  self.postMessage({ type: 'inference-start' });

  const image = new RawImage(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
    4,
  );

  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });

  const mask = await RawImage.fromTensor(
    output[0].mul(255).to('uint8'),
  ).resize(imageData.width, imageData.height);

  // Build RGBA ImageData from grayscale mask
  const resultData = new ImageData(imageData.width, imageData.height);
  for (let i = 0; i < mask.data.length; i++) {
    resultData.data[i * 4] = 255;     // R
    resultData.data[i * 4 + 1] = 255; // G
    resultData.data[i * 4 + 2] = 255; // B
    resultData.data[i * 4 + 3] = mask.data[i]; // A from mask
  }

  self.postMessage(
    { type: 'inference-complete', maskData: resultData },
    [resultData.data.buffer] as any,
  );
}
