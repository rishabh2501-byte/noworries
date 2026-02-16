/**
 * Global State Management using Zustand
 */

import { create } from 'zustand';
import {
  ValidationInput,
  ValidationReport,
  ValidationProgress,
  AppSettings,
  LocatorExtractionResult,
} from '../types';

interface AppState {
  // Validation input
  input: ValidationInput;
  setInput: (input: Partial<ValidationInput>) => void;
  resetInput: () => void;

  // Validation progress
  progress: ValidationProgress;
  setProgress: (progress: ValidationProgress) => void;

  // Validation report
  report: ValidationReport | null;
  setReport: (report: ValidationReport | null) => void;

  // Locator extraction
  locatorResult: LocatorExtractionResult | null;
  setLocatorResult: (result: LocatorExtractionResult | null) => void;
  isExtractingLocators: boolean;
  setIsExtractingLocators: (isExtracting: boolean) => void;

  // Settings
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;

  // UI state
  isValidating: boolean;
  setIsValidating: (isValidating: boolean) => void;
  
  activeTab: 'overview' | 'mismatches' | 'visual-diff' | 'ai-insights';
  setActiveTab: (tab: 'overview' | 'mismatches' | 'visual-diff' | 'ai-insights') => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
}

const initialInput: ValidationInput = {
  webSource: {
    type: 'url',
    url: '',
  },
  figmaSource: {
    type: 'url',
    url: '',
  },
};

const initialProgress: ValidationProgress = {
  stage: 'idle',
  progress: 0,
  message: '',
};

const initialSettings: AppSettings = {
  llmProvider: 'openai',
  defaultViewport: { width: 1920, height: 1080 },
  screenshotQuality: 90,
  autoSaveReports: false,
  reportsDirectory: '',
};

export const useAppStore = create<AppState>((set) => ({
  // Validation input
  input: initialInput,
  setInput: (input) =>
    set((state) => ({
      input: {
        ...state.input,
        ...input,
        webSource: input.webSource
          ? { ...state.input.webSource, ...input.webSource }
          : state.input.webSource,
        figmaSource: input.figmaSource
          ? { ...state.input.figmaSource, ...input.figmaSource }
          : state.input.figmaSource,
      },
    })),
  resetInput: () => set({ input: initialInput }),

  // Validation progress
  progress: initialProgress,
  setProgress: (progress) => set({ progress }),

  // Validation report
  report: null,
  setReport: (report) => set({ report }),

  // Locator extraction
  locatorResult: null,
  setLocatorResult: (locatorResult) => set({ locatorResult }),
  isExtractingLocators: false,
  setIsExtractingLocators: (isExtractingLocators) => set({ isExtractingLocators }),

  // Settings
  settings: initialSettings,
  setSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
    })),

  // UI state
  isValidating: false,
  setIsValidating: (isValidating) => set({ isValidating }),
  
  activeTab: 'overview',
  setActiveTab: (activeTab) => set({ activeTab }),

  // Error handling
  error: null,
  setError: (error) => set({ error }),
}));

export default useAppStore;
