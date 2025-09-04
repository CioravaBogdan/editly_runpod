// Fast Presets pentru optimizare viteză
export interface FastPreset {
  name: string;
  description: string;
  settings: {
    width: number;
    height: number;
    fps: number;
    videoEncoder?: string;
    encoderPreset?: string;
    crf?: number;
    customOutputArgs?: string[];
  };
}

export const FAST_PRESETS: Record<string, FastPreset> = {
  'ultra-fast-720p': {
    name: 'Ultra Fast 720p',
    description: 'Fastest possible - 720p 24fps, low quality',
    settings: {
      width: 1280,
      height: 720,
      fps: 24,
      videoEncoder: 'h264_nvenc',
      encoderPreset: 'p1',
      crf: 35,
      customOutputArgs: [
        '-tune', 'zerolatency',
        '-bf', '0',
        '-refs', '1',
        '-g', '30'
      ]
    }
  },
  'fast-720p': {
    name: 'Fast 720p',
    description: 'Fast processing - 720p 30fps, medium quality',
    settings: {
      width: 1280,
      height: 720,
      fps: 30,
      videoEncoder: 'h264_nvenc',
      encoderPreset: 'p3',
      crf: 30
    }
  },
  'balanced-1080p': {
    name: 'Balanced 1080p',
    description: 'Balanced - 1080p 30fps, good quality',
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      videoEncoder: 'h264_nvenc',
      encoderPreset: 'p4',
      crf: 28
    }
  },
  'cpu-ultra-fast': {
    name: 'CPU Ultra Fast',
    description: 'CPU only - fastest settings',
    settings: {
      width: 1280,
      height: 720,
      fps: 24,
      customOutputArgs: [
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '32',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-bf', '0',
        '-refs', '1',
        '-g', '30'
      ]
    }
  }
};

export function getPreset(name: string): FastPreset | undefined {
  return FAST_PRESETS[name];
}

export function applyPreset(editSpec: any, presetName: string): any {
  const preset = getPreset(presetName);
  if (!preset) return editSpec;

  return {
    ...editSpec,
    width: preset.settings.width,
    height: preset.settings.height,
    fps: preset.settings.fps,
    ...(preset.settings.customOutputArgs && {
      customOutputArgs: preset.settings.customOutputArgs
    })
  };
}