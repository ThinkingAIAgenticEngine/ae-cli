export type AppType =
  | 'web-react' | 'web-vue' | 'web-nextjs' | 'web-vanilla' | 'web-astro'
  | 'ios' | 'android' | 'mini-program' | 'unity'
  | 'node-server' | 'python-server' | 'go-server' | 'java-server'
  | 'unknown';

export type Mode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface DetectResult {
  appType: AppType;
  subPath?: string;
  entryFiles: string[];
  existingTracking: string[];
  recommendedModes: Mode[];
}
