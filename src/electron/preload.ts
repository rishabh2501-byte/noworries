/**
 * Electron Preload Script
 * Exposes safe IPC methods to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  ValidationInput,
  ValidationReport,
  ExportOptions,
  AppSettings,
  ValidationProgress,
  LocatorExtractionResult,
} from '../types';

// Define the API exposed to the renderer
const electronAPI = {
  // Validation
  validate: (input: ValidationInput): Promise<{ success: boolean; report?: ValidationReport; error?: string }> => {
    return ipcRenderer.invoke('validate', input);
  },

  // Progress listener
  onValidationProgress: (callback: (progress: ValidationProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: ValidationProgress) => {
      callback(progress);
    };
    ipcRenderer.on('validation-progress', listener);
    return () => {
      ipcRenderer.removeListener('validation-progress', listener);
    };
  },

  // Export
  exportReport: (
    report: ValidationReport,
    options: ExportOptions
  ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    return ipcRenderer.invoke('export-report', report, options);
  },

  // Settings
  getSettings: (): Promise<AppSettings> => {
    return ipcRenderer.invoke('get-settings');
  },

  updateSettings: (
    settings: Partial<AppSettings>
  ): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('update-settings', settings);
  },

  // File operations
  selectFile: (options?: {
    filters?: { name: string; extensions: string[] }[];
  }): Promise<{
    success: boolean;
    filePath?: string;
    base64?: string;
    mimeType?: string;
  }> => {
    return ipcRenderer.invoke('select-file', options || {});
  },

  selectDirectory: (): Promise<{ success: boolean; path?: string }> => {
    return ipcRenderer.invoke('select-directory');
  },

  readFileBase64: (
    filePath: string
  ): Promise<{ success: boolean; base64?: string; mimeType?: string; error?: string }> => {
    return ipcRenderer.invoke('read-file-base64', filePath);
  },

  // External links
  openExternal: (url: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('open-external', url);
  },

  // Platform info
  platform: process.platform,

  // Locator extraction
  extractLocators: (url: string): Promise<{ success: boolean; result?: LocatorExtractionResult; error?: string }> => {
    return ipcRenderer.invoke('extract-locators', url);
  },
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the renderer
export type ElectronAPI = typeof electronAPI;
