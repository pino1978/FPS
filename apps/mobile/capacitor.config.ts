import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.fps.foresight',
  appName: 'FPS Foresight',
  webDir: 'dist',
  server: { androidScheme: 'https' },
};

export default config;
