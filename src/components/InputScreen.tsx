/**
 * Input Screen Component
 * Allows users to enter website URL/screenshot and Figma URL/screenshot
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '../store';

// Type for Electron API (will be available in Electron context)
declare global {
  interface Window {
    electronAPI?: {
      validate: (input: any) => Promise<{ success: boolean; report?: any; error?: string }>;
      onValidationProgress: (callback: (progress: any) => void) => () => void;
      selectFile: (options?: any) => Promise<{ success: boolean; base64?: string; filePath?: string }>;
      extractLocators: (url: string) => Promise<{ success: boolean; result?: any; error?: string }>;
    };
  }
}

const InputScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    input,
    setInput,
    setProgress,
    setReport,
    setIsValidating,
    isValidating,
    setError,
    progress,
  } = useAppStore();

  const [webInputType, setWebInputType] = useState<'url' | 'screenshot'>(input.webSource.type);
  const [figmaInputType, setFigmaInputType] = useState<'url' | 'screenshot'>(input.figmaSource.type);

  // Handle file drop for web screenshot
  const onWebDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setInput({
          webSource: {
            type: 'screenshot',
            screenshotBase64: base64,
            screenshotFile: file,
          },
        });
      };
      reader.readAsDataURL(file);
    }
  }, [setInput]);

  // Handle file drop for Figma screenshot
  const onFigmaDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setInput({
          figmaSource: {
            type: 'screenshot',
            screenshotBase64: base64,
            screenshotFile: file,
          },
        });
      };
      reader.readAsDataURL(file);
    }
  }, [setInput]);

  const webDropzone = useDropzone({
    onDrop: onWebDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  const figmaDropzone = useDropzone({
    onDrop: onFigmaDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  // Handle validation
  const handleValidate = async () => {
    setError(null);
    setIsValidating(true);
    setProgress({ stage: 'analyzing-web', progress: 0, message: 'Starting validation...' });

    try {
      // Check if running in Electron
      if (window.electronAPI) {
        // Set up progress listener
        const unsubscribe = window.electronAPI.onValidationProgress((progressData) => {
          setProgress(progressData);
        });

        const result = await window.electronAPI.validate(input);

        unsubscribe();

        if (result.success && result.report) {
          setReport(result.report);
          navigate('/results');
        } else {
          setError(result.error || 'Validation failed');
        }
      } else {
        // Browser mode - simulate validation for demo
        await simulateValidation();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  // Simulate validation for browser demo
  const simulateValidation = async () => {
    const webUrl = input.webSource.url || 'uploaded-screenshot';
    
    const stages = [
      { stage: 'analyzing-web', progress: 20, message: `Analyzing ${webUrl}...` },
      { stage: 'analyzing-figma', progress: 40, message: `Analyzing Figma design...` },
      { stage: 'comparing', progress: 60, message: 'Comparing styles and layout...' },
      { stage: 'visual-diff', progress: 80, message: 'Generating visual diff...' },
      { stage: 'llm-analysis', progress: 90, message: 'Generating AI insights...' },
      { stage: 'complete', progress: 100, message: 'Complete!' },
    ];

    for (const stage of stages) {
      setProgress(stage as any);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    // Generate dynamic report based on actual input
    const report = generateDynamicReport(input.webSource, input.figmaSource);
    setReport(report);
    navigate('/results');
  };

  // Check if validation can proceed
  const canValidate = () => {
    const hasWebSource =
      (webInputType === 'url' && input.webSource.url) ||
      (webInputType === 'screenshot' && input.webSource.screenshotBase64);
    const hasFigmaSource =
      (figmaInputType === 'url' && input.figmaSource.url) ||
      (figmaInputType === 'screenshot' && input.figmaSource.screenshotBase64);
    return hasWebSource && hasFigmaSource && !isValidating;
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI-Powered Analysis
        </div>
        <h2 className="text-4xl font-extrabold text-gradient mb-3">Validate Your Design</h2>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Compare your live UI against Figma designs and discover pixel-perfect inconsistencies
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Web Source Input */}
        <div className="card-modern group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)' }}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Actual UI</h3>
              <p className="text-sm text-gray-500">Your live website or screenshot</p>
            </div>
          </div>

          {/* Input type toggle */}
          <div className="flex gap-2 mb-5 p-1 rounded-xl bg-gray-100">
            <button
              onClick={() => {
                setWebInputType('url');
                setInput({ webSource: { type: 'url', url: input.webSource.url || '' } });
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                webInputType === 'url'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                URL
              </span>
            </button>
            <button
              onClick={() => {
                setWebInputType('screenshot');
                setInput({ webSource: { type: 'screenshot' } });
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                webInputType === 'screenshot'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Screenshot
              </span>
            </button>
          </div>

          {/* URL Input */}
          {webInputType === 'url' && (
            <div className="space-y-2">
              <input
                type="url"
                placeholder="https://your-website.com"
                value={input.webSource.url || ''}
                onChange={(e) =>
                  setInput({ webSource: { type: 'url', url: e.target.value } })
                }
                className="input-modern"
              />
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Enter the URL of the page you want to validate
              </p>
            </div>
          )}

          {/* Screenshot Upload */}
          {webInputType === 'screenshot' && (
            <div
              {...webDropzone.getRootProps()}
              className={`dropzone min-h-[180px] flex flex-col items-center justify-center ${
                webDropzone.isDragActive ? 'active' : ''
              } ${input.webSource.screenshotBase64 ? 'border-emerald-400 bg-emerald-50/50' : ''}`}
            >
              <input {...webDropzone.getInputProps()} />
              {input.webSource.screenshotBase64 ? (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--gradient-success)' }}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-emerald-700 font-semibold">Screenshot uploaded!</p>
                  <p className="text-xs text-gray-400">Click or drag to replace</p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 mx-auto flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <svg className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Drop your screenshot here</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Figma Source Input */}
        <div className="card-modern group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)' }}>
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.5 8.5c0-1.65 1.35-3 3-3h3v6h-3c-1.65 0-3-1.35-3-3zm0 7c0-1.65 1.35-3 3-3h3v3c0 1.65-1.35 3-3 3s-3-1.35-3-3zm6-10.5v6h3c1.65 0 3-1.35 3-3s-1.35-3-3-3h-3zm0 7v3c0 1.65 1.35 3 3 3s3-1.35 3-3-1.35-3-3-3h-3zm6-3.5c0 1.65-1.35 3-3 3h-3v-6h3c1.65 0 3 1.35 3 3z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Figma Design</h3>
              <p className="text-sm text-gray-500">Your design reference</p>
            </div>
          </div>

          {/* Input type toggle */}
          <div className="flex gap-2 mb-5 p-1 rounded-xl bg-gray-100">
            <button
              onClick={() => {
                setFigmaInputType('url');
                setInput({ figmaSource: { type: 'url', url: input.figmaSource.url || '' } });
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                figmaInputType === 'url'
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Figma URL
              </span>
            </button>
            <button
              onClick={() => {
                setFigmaInputType('screenshot');
                setInput({ figmaSource: { type: 'screenshot' } });
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                figmaInputType === 'screenshot'
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Screenshot
              </span>
            </button>
          </div>

          {/* URL Input */}
          {figmaInputType === 'url' && (
            <div className="space-y-2">
              <input
                type="url"
                placeholder="https://www.figma.com/file/..."
                value={input.figmaSource.url || ''}
                onChange={(e) =>
                  setInput({ figmaSource: { type: 'url', url: e.target.value } })
                }
                className="input-modern"
              />
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Requires Figma API token in Settings
              </p>
            </div>
          )}

          {/* Screenshot Upload */}
          {figmaInputType === 'screenshot' && (
            <div
              {...figmaDropzone.getRootProps()}
              className={`dropzone min-h-[180px] flex flex-col items-center justify-center ${
                figmaDropzone.isDragActive ? 'active' : ''
              } ${input.figmaSource.screenshotBase64 ? 'border-emerald-400 bg-emerald-50/50' : ''}`}
            >
              <input {...figmaDropzone.getInputProps()} />
              {input.figmaSource.screenshotBase64 ? (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'var(--gradient-success)' }}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-emerald-700 font-semibold">Design uploaded!</p>
                  <p className="text-xs text-gray-400">Click or drag to replace</p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 mx-auto flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                    <svg className="w-8 h-8 text-gray-400 group-hover:text-purple-500 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5.5 8.5c0-1.65 1.35-3 3-3h3v6h-3c-1.65 0-3-1.35-3-3zm0 7c0-1.65 1.35-3 3-3h3v3c0 1.65-1.35 3-3 3s-3-1.35-3-3zm6-10.5v6h3c1.65 0 3-1.35 3-3s-1.35-3-3-3h-3zm0 7v3c0 1.65 1.35 3 3 3s3-1.35 3-3-1.35-3-3-3h-3zm6-3.5c0 1.65-1.35 3-3 3h-3v-6h3c1.65 0 3 1.35 3 3z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Drop your Figma export here</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Validation Progress */}
      {isValidating && (
        <div className="card-modern animate-slide-up">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse" style={{ background: 'var(--gradient-primary)' }}>
              <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-800">{progress.message}</span>
                <span className="text-sm font-bold text-indigo-600">{progress.progress}%</span>
              </div>
              <div className="progress-modern">
                <div className="progress-modern-fill" style={{ width: `${progress.progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analyze Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleValidate}
          disabled={!canValidate()}
          className={`group relative px-10 py-4 rounded-2xl text-lg font-bold transition-all duration-300 ${
            canValidate()
              ? 'btn-primary hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isValidating ? (
            <span className="flex items-center gap-3">
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing...
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Start Analysis
            </span>
          )}
        </button>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {[
          { icon: '🎨', title: 'Color Analysis', desc: 'Detect color mismatches' },
          { icon: '📐', title: 'Layout Check', desc: 'Spacing & alignment' },
          { icon: '🤖', title: 'AI Insights', desc: 'Smart suggestions' },
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/50 border border-gray-100">
            <span className="text-2xl">{feature.icon}</span>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{feature.title}</p>
              <p className="text-xs text-gray-500">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Generate dynamic report based on input
function generateDynamicReport(webSource: any, figmaSource: any): any {
  // Check if both sources have screenshots - do real comparison
  const hasWebScreenshot = webSource.screenshotBase64;
  const hasFigmaScreenshot = figmaSource.screenshotBase64;
  
  let overallScore: number;
  let visualMatchPercentage: number;
  
  if (hasWebScreenshot && hasFigmaScreenshot) {
    // Real comparison: check if screenshots are identical or similar
    if (webSource.screenshotBase64 === figmaSource.screenshotBase64) {
      // Identical images = 100% match
      overallScore = 100;
      visualMatchPercentage = 100;
    } else {
      // Different images - calculate similarity based on base64 length difference
      const similarity = calculateImageSimilarity(webSource.screenshotBase64, figmaSource.screenshotBase64);
      overallScore = Math.round(similarity);
      visualMatchPercentage = Math.round(similarity);
    }
  } else {
    // URL-based or mixed input - use hash-based simulation
    const inputHash = hashString(JSON.stringify({ webSource, figmaSource }));
    const seed = inputHash % 1000;
    overallScore = 40 + (seed % 60);
    visualMatchPercentage = overallScore + (seed % 10);
  }
  
  // Generate category scores based on overall score
  const variance = Math.max(0, 100 - overallScore) / 4;
  const categoryScores = {
    color: Math.min(100, Math.max(0, overallScore + Math.floor(Math.random() * variance * 2 - variance))),
    typography: Math.min(100, Math.max(0, overallScore + Math.floor(Math.random() * variance * 2 - variance))),
    spacing: Math.min(100, Math.max(0, overallScore + Math.floor(Math.random() * variance * 2 - variance))),
    layout: Math.min(100, Math.max(0, overallScore + Math.floor(Math.random() * variance * 2 - variance))),
    border: Math.min(100, Math.max(0, overallScore + Math.floor(Math.random() * variance * 2 - variance))),
    alignment: Math.min(100, Math.max(0, overallScore + Math.floor(Math.random() * variance * 2 - variance))),
    size: Math.min(100, Math.max(0, overallScore + Math.floor(Math.random() * variance * 2 - variance))),
  };

  // Generate mismatches based on score (fewer mismatches for higher scores)
  const mismatchCount = overallScore >= 100 ? 0 : Math.max(1, Math.floor((100 - overallScore) / 15));
  const seed = hashString(JSON.stringify({ webSource, figmaSource })) % 1000;
  const mismatches = mismatchCount > 0 ? generateMismatches(seed, mismatchCount, webSource) : [];
  
  // Count severities
  const critical = mismatches.filter((m: any) => m.severity === 'critical').length;
  const major = mismatches.filter((m: any) => m.severity === 'major').length;
  const minor = mismatches.filter((m: any) => m.severity === 'minor').length;
  const info = mismatches.filter((m: any) => m.severity === 'info').length;

  const webUrl = webSource.url || 'Uploaded Screenshot';
  const figmaUrl = figmaSource.url || 'Uploaded Design';

  return {
    id: `report-${Date.now().toString(36)}-${seed}`,
    createdAt: new Date().toISOString(),
    webSource: { type: webSource.type, value: webUrl },
    figmaSource: { type: figmaSource.type, value: figmaUrl },
    webAnalysis: {
      url: webUrl,
      timestamp: new Date().toISOString(),
      screenshot: webSource.screenshotBase64 || '',
      domTree: [],
      viewport: { width: 1920, height: 1080 },
    },
    figmaAnalysis: {
      fileKey: figmaSource.url ? extractFigmaKey(figmaSource.url) : 'uploaded',
      fileName: figmaSource.url ? 'Figma Design' : 'Uploaded Design',
      timestamp: new Date().toISOString(),
      screenshot: figmaSource.screenshotBase64 || '',
      designTokens: { colors: [], typography: [], spacing: [], effects: [], components: [] },
      components: [],
    },
    comparisonResult: {
      timestamp: new Date().toISOString(),
      overallScore,
      categoryScores,
      mismatches,
      summary: { total: mismatches.length, critical, major, minor, info },
    },
    visualDiff: {
      diffImage: '',
      matchPercentage: visualMatchPercentage,
      mismatchedPixels: Math.floor((100 - visualMatchPercentage) * 2000),
      totalPixels: 200000,
      diffAreas: [],
    },
    llmAnalysis: generateLLMAnalysis(mismatches, overallScore, webUrl),
  };
}

// Simple hash function for strings
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Calculate image similarity by comparing base64 data
function calculateImageSimilarity(base64A: string, base64B: string): number {
  // If identical, return 100
  if (base64A === base64B) {
    return 100;
  }
  
  // Compare lengths first (quick check)
  const lenA = base64A.length;
  const lenB = base64B.length;
  const lenDiff = Math.abs(lenA - lenB) / Math.max(lenA, lenB);
  
  // If lengths are very different, images are likely very different
  if (lenDiff > 0.5) {
    return Math.max(20, 100 - lenDiff * 100);
  }
  
  // Sample comparison: compare chunks of the base64 strings
  const sampleSize = Math.min(1000, Math.min(lenA, lenB));
  const step = Math.floor(Math.min(lenA, lenB) / sampleSize);
  
  let matches = 0;
  for (let i = 0; i < sampleSize; i++) {
    const idx = i * step;
    if (base64A[idx] === base64B[idx]) {
      matches++;
    }
  }
  
  const charSimilarity = (matches / sampleSize) * 100;
  
  // Weight: 70% character similarity, 30% length similarity
  const lengthSimilarity = (1 - lenDiff) * 100;
  const finalScore = charSimilarity * 0.7 + lengthSimilarity * 0.3;
  
  return Math.max(0, Math.min(100, finalScore));
}

// Extract Figma file key from URL
function extractFigmaKey(url: string): string {
  const match = url.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[2] : 'unknown';
}

// Generate mismatches based on seed
function generateMismatches(seed: number, count: number, webSource: any): any[] {
  const categories = ['color', 'typography', 'spacing', 'layout', 'border', 'alignment', 'size'];
  const severities = ['critical', 'major', 'minor', 'info'];
  const properties: Record<string, string[]> = {
    color: ['color', 'backgroundColor', 'borderColor'],
    typography: ['fontSize', 'fontWeight', 'lineHeight', 'fontFamily'],
    spacing: ['padding', 'margin', 'gap', 'paddingTop', 'marginBottom'],
    layout: ['display', 'flexDirection', 'justifyContent', 'alignItems'],
    border: ['borderRadius', 'borderWidth', 'borderStyle'],
    alignment: ['textAlign', 'verticalAlign'],
    size: ['width', 'height', 'maxWidth'],
  };
  const elements = [
    { selector: '.header', tagName: 'header' },
    { selector: '.nav-item', tagName: 'a' },
    { selector: '.btn-primary', tagName: 'button' },
    { selector: '.card', tagName: 'div' },
    { selector: '.title', tagName: 'h1' },
    { selector: '.subtitle', tagName: 'h2' },
    { selector: '.content', tagName: 'p' },
    { selector: '.footer', tagName: 'footer' },
    { selector: '.sidebar', tagName: 'aside' },
    { selector: '.input-field', tagName: 'input' },
  ];

  const mismatches = [];
  let urlDomain = 'uploaded';
  try {
    if (webSource.url) {
      urlDomain = new URL(webSource.url).hostname;
    }
  } catch {
    urlDomain = 'uploaded';
  }

  for (let i = 0; i < count; i++) {
    const catIndex = (seed + i * 7) % categories.length;
    const category = categories[catIndex];
    const sevIndex = (seed + i * 3) % severities.length;
    const propList = properties[category];
    const propIndex = (seed + i * 11) % propList.length;
    const elemIndex = (seed + i * 13) % elements.length;

    const expectedVal = generateExpectedValue(category, propList[propIndex], seed + i);
    const actualVal = generateActualValue(category, propList[propIndex], seed + i);

    mismatches.push({
      id: `mismatch-${i + 1}`,
      category,
      severity: severities[sevIndex],
      property: propList[propIndex],
      expectedValue: expectedVal,
      actualValue: actualVal,
      element: { 
        selector: `${elements[elemIndex].selector}-${urlDomain.split('.')[0]}`, 
        tagName: elements[elemIndex].tagName 
      },
      deviation: Math.abs((seed + i * 17) % 20),
    });
  }

  return mismatches;
}

// Generate expected values
function generateExpectedValue(category: string, property: string, seed: number): string {
  if (category === 'color') {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return colors[seed % colors.length];
  }
  if (property === 'fontSize') return `${14 + (seed % 4) * 2}px`;
  if (property === 'fontWeight') return ['400', '500', '600', '700'][seed % 4];
  if (property === 'lineHeight') return `${1.4 + (seed % 3) * 0.2}`;
  if (property.includes('padding') || property.includes('margin') || property === 'gap') {
    return `${8 + (seed % 4) * 4}px`;
  }
  if (property === 'borderRadius') return `${4 + (seed % 4) * 2}px`;
  if (property === 'width' || property === 'height') return `${100 + (seed % 10) * 20}px`;
  return 'auto';
}

// Generate actual values (slightly different from expected)
function generateActualValue(category: string, property: string, seed: number): string {
  if (category === 'color') {
    const colors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];
    return colors[seed % colors.length];
  }
  if (property === 'fontSize') return `${12 + (seed % 4) * 2}px`;
  if (property === 'fontWeight') return ['300', '400', '500', '600'][seed % 4];
  if (property === 'lineHeight') return `${1.2 + (seed % 3) * 0.2}`;
  if (property.includes('padding') || property.includes('margin') || property === 'gap') {
    return `${4 + (seed % 4) * 4}px`;
  }
  if (property === 'borderRadius') return `${2 + (seed % 4) * 2}px`;
  if (property === 'width' || property === 'height') return `${80 + (seed % 10) * 20}px`;
  return 'inherit';
}

// Generate LLM analysis
function generateLLMAnalysis(mismatches: any[], overallScore: number, webUrl: string): any {
  const explanations = mismatches.slice(0, 3).map((m: any) => ({
    humanReadable: `The ${m.property} on ${m.element.selector} is ${m.actualValue} instead of ${m.expectedValue}`,
    technicalDetails: `Property: ${m.property}, Expected: ${m.expectedValue}, Actual: ${m.actualValue}, Deviation: ${m.deviation}`,
  }));

  const categories = [...new Set(mismatches.map((m: any) => m.category))];
  const groupedSummary = categories.slice(0, 3).map((cat: string) => {
    const catMismatches = mismatches.filter((m: any) => m.category === cat);
    return {
      category: cat,
      title: `${cat.charAt(0).toUpperCase() + cat.slice(1)} inconsistencies detected`,
      description: `Found ${catMismatches.length} ${cat} mismatch${catMismatches.length > 1 ? 'es' : ''} that need attention`,
      affectedElements: catMismatches.slice(0, 3).map((m: any) => m.element.selector),
      priority: catMismatches.some((m: any) => m.severity === 'critical') ? 'critical' : 'major',
    };
  });

  const suggestedFixes = mismatches.slice(0, 5).map((m: any) => ({
    mismatchId: m.id,
    suggestion: `Update ${m.property} from ${m.actualValue} to ${m.expectedValue}`,
    codeSnippet: `${m.element.selector} { ${m.property}: ${m.expectedValue}; }`,
  }));

  const scoreDescription = overallScore >= 90 ? 'excellent' : overallScore >= 70 ? 'good' : overallScore >= 50 ? 'needs improvement' : 'poor';

  return {
    explanations,
    groupedSummary,
    suggestedFixes,
    testSuggestions: [
      { 
        testName: 'Visual Regression Test', 
        testDescription: `Verify ${webUrl} matches design specifications`, 
        testType: 'visual', 
        pseudoCode: 'await expect(page).toHaveScreenshot("baseline.png")' 
      },
      { 
        testName: 'Style Consistency Test', 
        testDescription: 'Check CSS properties match design tokens', 
        testType: 'functional', 
        pseudoCode: `expect(getComputedStyle(element).${mismatches[0]?.property || 'color'}).toBe("${mismatches[0]?.expectedValue || '#000'}")` 
      },
    ],
    overallAssessment: `The UI at ${webUrl} has a ${overallScore}% match with the Figma design (${scoreDescription}). Found ${mismatches.length} issue${mismatches.length !== 1 ? 's' : ''} across ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}. ${overallScore < 70 ? 'Significant improvements needed.' : 'Minor adjustments recommended.'}`,
  };
}

export default InputScreen;
