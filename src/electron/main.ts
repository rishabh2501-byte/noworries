/**
 * Electron Main Process
 * Handles window management, IPC communication, and native integrations
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { ValidatorService, createValidator } from '../services/validator';
import { ExportService } from '../services/export';
import {
  ValidationInput,
  ValidationReport,
  ExportOptions,
  AppSettings,
  ValidationProgress,
  LocatorExtractionResult,
} from '../types';
import { WebAnalyzer } from '../services/web-analyzer';

// Initialize electron store for settings
const store = new Store<AppSettings>({
  defaults: {
    llmProvider: 'openai',
    defaultViewport: { width: 1920, height: 1080 },
    screenshotQuality: 90,
    autoSaveReports: false,
    reportsDirectory: path.join(app.getPath('documents'), 'UIValidator', 'reports'),
  },
});

let mainWindow: BrowserWindow | null = null;
let validatorService: ValidatorService | null = null;

/**
 * Create the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize validator service with current settings
 */
function initializeValidator(): void {
  const settings = store.store;
  
  validatorService = createValidator({
    figmaAccessToken: settings.figmaAccessToken,
    llmConfig: settings.llmApiKey
      ? {
          provider: settings.llmProvider,
          apiKey: settings.llmApiKey,
        }
      : undefined,
    viewport: settings.defaultViewport,
    headless: true,
  });
}

// ============================================
// IPC Handlers
// ============================================

// Validate UI
ipcMain.handle('validate', async (event, input: ValidationInput) => {
  if (!validatorService) {
    initializeValidator();
  }

  try {
    const report = await validatorService!.validate(input, (progress: ValidationProgress) => {
      // Send progress updates to renderer
      mainWindow?.webContents.send('validation-progress', progress);
    });

    // Auto-save if enabled
    const settings = store.store;
    if (settings.autoSaveReports) {
      await saveReportToFile(report);
    }

    return { success: true, report };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
});

// Export report
ipcMain.handle('export-report', async (event, report: ValidationReport, options: ExportOptions) => {
  try {
    const exportService = new ExportService();
    const result = await exportService.export(report, options);

    // Show save dialog
    const { filePath } = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: result.filename,
      filters: [
        { name: options.format.toUpperCase(), extensions: [options.format] },
      ],
    });

    if (filePath) {
      if (result.data instanceof Blob) {
        const buffer = Buffer.from(await result.data.arrayBuffer());
        fs.writeFileSync(filePath, buffer);
      } else {
        fs.writeFileSync(filePath, result.data);
      }
      return { success: true, filePath };
    }

    return { success: false, error: 'Export cancelled' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
});

// Get settings
ipcMain.handle('get-settings', async () => {
  return store.store;
});

// Update settings
ipcMain.handle('update-settings', async (event, settings: Partial<AppSettings>) => {
  try {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key as keyof AppSettings, value);
    }
    
    // Reinitialize validator with new settings
    initializeValidator();
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
    };
  }
});

// Select file dialog
ipcMain.handle('select-file', async (event, options: { filters?: { name: string; extensions: string[] }[] }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: options.filters || [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false };
  }

  const filePath = result.filePaths[0];
  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');

  return {
    success: true,
    filePath,
    base64,
    mimeType: getMimeType(filePath),
  };
});

// Select directory dialog
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false };
  }

  return { success: true, path: result.filePaths[0] };
});

// Open external URL
ipcMain.handle('open-external', async (event, url: string) => {
  await shell.openExternal(url);
  return { success: true };
});

// Read file as base64
ipcMain.handle('read-file-base64', async (event, filePath: string) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return {
      success: true,
      base64: buffer.toString('base64'),
      mimeType: getMimeType(filePath),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
    };
  }
});

// Extract locators from URL
ipcMain.handle('extract-locators', async (event, url: string) => {
  const webAnalyzer = new WebAnalyzer();
  try {
    const settings = store.store;
    const result = await webAnalyzer.extractLocators(url, {
      viewport: settings.defaultViewport,
      headless: true,
    });
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract locators',
    };
  } finally {
    await webAnalyzer.close();
  }
});

// ============================================
// Helper Functions
// ============================================

/**
 * Save report to file
 */
async function saveReportToFile(report: ValidationReport): Promise<void> {
  const settings = store.store;
  const reportsDir = settings.reportsDirectory;

  // Ensure directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `report-${report.id}.json`;
  const filePath = path.join(reportsDir, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(() => {
  createWindow();
  initializeValidator();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Cleanup
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
