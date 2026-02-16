/**
 * Settings Screen Component
 * Configure API tokens, LLM provider, and application preferences
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { AppSettings } from '../types';

const SettingsScreen: React.FC = () => {
  const { settings, setSettings } = useAppStore();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [showFigmaToken, setShowFigmaToken] = useState(false);
  const [showLLMKey, setShowLLMKey] = useState(false);

  useEffect(() => {
    // Load settings from Electron store if available
    if (window.electronAPI) {
      (window as any).electronAPI.getSettings().then((s: AppSettings) => {
        setLocalSettings(s);
        setSettings(s);
      });
    }
  }, [setSettings]);

  const handleSave = async () => {
    setSettings(localSettings);
    
    if (window.electronAPI) {
      const result = await (window as any).electronAPI.updateSettings(localSettings);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleSelectDirectory = async () => {
    if (window.electronAPI) {
      const result = await (window as any).electronAPI.selectDirectory();
      if (result.success && result.path) {
        setLocalSettings({ ...localSettings, reportsDirectory: result.path });
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-gray-600">Configure your API tokens and preferences</p>
      </div>

      {/* Figma API Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mr-3">
            🎨
          </span>
          Figma API
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal Access Token
            </label>
            <div className="relative">
              <input
                type={showFigmaToken ? 'text' : 'password'}
                value={localSettings.figmaAccessToken || ''}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, figmaAccessToken: e.target.value })
                }
                placeholder="figd_xxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none pr-20"
              />
              <button
                type="button"
                onClick={() => setShowFigmaToken(!showFigmaToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
              >
                {showFigmaToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Get your token from{' '}
              <a
                href="https://www.figma.com/developers/api#access-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
                onClick={(e) => {
                  if (window.electronAPI) {
                    e.preventDefault();
                    (window as any).electronAPI.openExternal('https://www.figma.com/developers/api#access-tokens');
                  }
                }}
              >
                Figma Settings → Personal Access Tokens
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* LLM Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">
            🤖
          </span>
          AI / LLM Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LLM Provider
            </label>
            <select
              value={localSettings.llmProvider}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  llmProvider: e.target.value as 'openai' | 'anthropic' | 'huggingface',
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="openai">OpenAI (GPT-4)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="huggingface">HuggingFace</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showLLMKey ? 'text' : 'password'}
                value={localSettings.llmApiKey || ''}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, llmApiKey: e.target.value })
                }
                placeholder={
                  localSettings.llmProvider === 'openai'
                    ? 'sk-xxxxxxxxxxxxxxxxx'
                    : localSettings.llmProvider === 'anthropic'
                    ? 'sk-ant-xxxxxxxxxxxxxxxxx'
                    : 'hf_xxxxxxxxxxxxxxxxx'
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none pr-20"
              />
              <button
                type="button"
                onClick={() => setShowLLMKey(!showLLMKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
              >
                {showLLMKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {localSettings.llmProvider === 'openai' && 'Get your key from OpenAI Dashboard'}
              {localSettings.llmProvider === 'anthropic' && 'Get your key from Anthropic Console'}
              {localSettings.llmProvider === 'huggingface' && 'Get your key from HuggingFace Settings'}
            </p>
          </div>
        </div>
      </div>

      {/* Viewport Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mr-3">
            📐
          </span>
          Default Viewport
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Width (px)
            </label>
            <input
              type="number"
              value={localSettings.defaultViewport?.width || 1920}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  defaultViewport: {
                    ...localSettings.defaultViewport,
                    width: parseInt(e.target.value) || 1920,
                    height: localSettings.defaultViewport?.height || 1080,
                  },
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Height (px)
            </label>
            <input
              type="number"
              value={localSettings.defaultViewport?.height || 1080}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  defaultViewport: {
                    ...localSettings.defaultViewport,
                    width: localSettings.defaultViewport?.width || 1920,
                    height: parseInt(e.target.value) || 1080,
                  },
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: '1920x1080', w: 1920, h: 1080 },
            { label: '1440x900', w: 1440, h: 900 },
            { label: '1366x768', w: 1366, h: 768 },
            { label: '1280x720', w: 1280, h: 720 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  defaultViewport: { width: preset.w, height: preset.h },
                })
              }
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Storage Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center mr-3">
            💾
          </span>
          Storage
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Auto-save Reports
              </label>
              <p className="text-xs text-gray-500">Automatically save validation reports</p>
            </div>
            <button
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  autoSaveReports: !localSettings.autoSaveReports,
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.autoSaveReports ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.autoSaveReports ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reports Directory
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={localSettings.reportsDirectory || ''}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, reportsDirectory: e.target.value })
                }
                placeholder="/path/to/reports"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <button
                onClick={handleSelectDirectory}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Browse
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-4">
        {saved && (
          <span className="self-center text-green-600 text-sm animate-fade-in">
            ✓ Settings saved
          </span>
        )}
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
        >
          Save Settings
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Security Note</h4>
        <p className="text-sm text-blue-700">
          API keys are stored locally on your machine and are never sent to any external servers
          except the respective API providers (Figma, OpenAI, Anthropic, HuggingFace).
        </p>
      </div>
    </div>
  );
};

export default SettingsScreen;
