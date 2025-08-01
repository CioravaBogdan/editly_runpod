import { cpus } from "os";
import pMap from "p-map";
import type { DebugOptions } from "./configuration.js";
import type { ProcessedClip } from "./parseConfig.js";
import { FrameBufferManager } from "./frameBufferPool.js";
import { createFabricCanvas, renderFabricCanvas, rgbaToFabricImage } from "./sources/fabric.js";
import { createLayerSource } from "./sources/index.js";

const CPU_CORES = cpus().length;

type FrameSourceOptions = DebugOptions & {
  clip: ProcessedClip;
  clipIndex: number;
  width: number;
  height: number;
  channels: number;
  framerateStr: string;
};

export async function createFrameSource({
  clip,
  clipIndex,
  width,
  height,
  channels,
  verbose,
  logTimes,
  framerateStr,
}: FrameSourceOptions) {
  const { layers, duration } = clip;
  const frameBufferPool = FrameBufferManager.getPool(width, height, channels);

  const visualLayers = layers.filter((layer) => layer.type !== "audio");

  const layerFrameSources = await pMap(
    visualLayers,
    async (layer, layerIndex) => {
      if (verbose)
        console.log("createFrameSource", layer.type, "clip", clipIndex, "layer", layerIndex);
      const options = {
        width,
        height,
        duration,
        channels,
        verbose,
        logTimes,
        framerateStr,
        params: layer,
      };
      return createLayerSource(options);
    },
    { concurrency: Math.min(CPU_CORES, visualLayers.length) },
  );

  async function readNextFrame({ time }: { time: number }) {
    const canvas = createFabricCanvas({ width, height });

    // Parallelize layer frame generation
    const layerResults = await pMap(
      layerFrameSources,
      async (frameSource, index) => {
        if (logTimes) console.time(`frameSource.readNextFrame.${index}`);
        const rgba = await frameSource.readNextFrame(time, canvas);
        if (logTimes) console.timeEnd(`frameSource.readNextFrame.${index}`);
        return { rgba, index };
      },
      { concurrency: Math.min(CPU_CORES, layerFrameSources.length) }
    );

    // Process results in order
    for (const { rgba, index } of layerResults) {
      // Frame sources can either render to the provided canvas and return nothing
      // OR return an raw RGBA blob which will be drawn onto the canvas
      if (rgba) {
        // Optimization: Don't need to draw to canvas if there's only one layer
        if (layerFrameSources.length === 1) return rgba;

        if (logTimes) console.time(`rgbaToFabricImage.${index}`);
        const img = await rgbaToFabricImage({ width, height, rgba });
        if (logTimes) console.timeEnd(`rgbaToFabricImage.${index}`);
        canvas.add(img);
      } else {
        // Assume this frame source has drawn its content to the canvas
      }
    }
    // if (verbose) console.time('Merge frames');

    if (logTimes) console.time("renderFabricCanvas");
    const rgba = await renderFabricCanvas(canvas);
    if (logTimes) console.timeEnd("renderFabricCanvas");
    return rgba;
  }

  async function close() {
    await pMap(layerFrameSources, (frameSource) => frameSource.close?.());
    // Clear buffer pool to free memory
    frameBufferPool.clear();
  }

  return {
    readNextFrame,
    close,
  };
}

export default {
  createFrameSource,
};
