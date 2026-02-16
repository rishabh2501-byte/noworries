/**
 * Locator Screen Component
 * Extracts and displays all CSS selectors, IDs, and locators from a URL
 */

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ElementLocator } from '../types';

type FilterType = 'all' | 'button' | 'input' | 'link' | 'image' | 'container' | 'text' | 'form' | 'other';
type LocatorType = 'id' | 'css' | 'xpath' | 'playwright' | 'name' | 'class';

const LocatorScreen: React.FC = () => {
  const {
    locatorResult,
    setLocatorResult,
    isExtractingLocators,
    setIsExtractingLocators,
    error,
    setError,
  } = useAppStore();

  const [url, setUrl] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyInteractive, setShowOnlyInteractive] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedLocatorType, setSelectedLocatorType] = useState<LocatorType>('css');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setError(null);
    setIsExtractingLocators(true);
    setLocatorResult(null);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.extractLocators(url);
        if (result.success && result.result) {
          setLocatorResult(result.result);
        } else {
          setError(result.error || 'Failed to extract locators');
        }
      } else {
        // Browser mode - call API server
        await extractViaAPI();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsExtractingLocators(false);
    }
  };

  const extractViaAPI = async () => {
    try {
      // Use authenticated endpoint if logged in
      const baseUrl = (import.meta as any).env?.VITE_API_URL || '';
      const endpoint = isLoggedIn 
        ? `${baseUrl}/api/extract-authenticated` 
        : `${baseUrl}/api/extract-locators`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success && data.result) {
        setLocatorResult(data.result);
      } else {
        setError(data.error || 'Failed to extract locators');
      }
    } catch (err) {
      setError('API server not running. Start with: npm run dev');
    }
  };

  const handleLoginFirst = async () => {
    if (!url.trim()) {
      setError('Please enter a URL first');
      return;
    }

    setError(null);
    setLoginMessage('Opening browser...');

    try {
      const baseUrl = (import.meta as any).env?.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/start-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        setIsLoggedIn(true);
        setLoginMessage('Browser opened! Login in the browser, then click "Extract After Login"');
      } else {
        setError(data.error || 'Failed to open browser');
        setLoginMessage('');
      }
    } catch (err) {
      setError('API server not running. Start with: npm run dev');
      setLoginMessage('');
    }
  };

  const handleCloseSession = async () => {
    try {
      const baseUrl = (import.meta as any).env?.VITE_API_URL || '';
      await fetch(`${baseUrl}/api/close-session`, { method: 'POST' });
      setIsLoggedIn(false);
      setLoginMessage('');
    } catch (err) {
      // Ignore errors
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getLocatorValue = (loc: ElementLocator): string => {
    switch (selectedLocatorType) {
      case 'id':
        return loc.id ? `#${loc.id}` : 'N/A';
      case 'css':
        return loc.cssSelector;
      case 'xpath':
        return loc.xpath;
      case 'playwright':
        return loc.playwrightSelector;
      case 'name':
        return loc.name ? `[name="${loc.name}"]` : 'N/A';
      case 'class':
        return loc.className ? `.${loc.className.split(' ')[0]}` : 'N/A';
      default:
        return loc.cssSelector;
    }
  };

  const getFieldName = (loc: ElementLocator): string => {
    if (loc.id) return loc.id;
    if (loc.name) return loc.name;
    if (loc.dataTestId) return loc.dataTestId;
    if (loc.className) return loc.className.split(' ')[0];
    return loc.tagName;
  };

  const filteredLocators = locatorResult?.locators.filter(loc => {
    if (filter !== 'all' && loc.elementType !== filter) return false;
    if (showOnlyInteractive && !loc.isInteractive) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        loc.tagName.toLowerCase().includes(query) ||
        loc.id?.toLowerCase().includes(query) ||
        loc.className?.toLowerCase().includes(query) ||
        loc.text?.toLowerCase().includes(query) ||
        loc.cssSelector.toLowerCase().includes(query)
      );
    }
    return true;
  }) || [];

  const getElementTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      button: 'bg-blue-100 text-blue-700',
      input: 'bg-green-100 text-green-700',
      link: 'bg-purple-100 text-purple-700',
      image: 'bg-yellow-100 text-yellow-700',
      container: 'bg-gray-100 text-gray-700',
      text: 'bg-pink-100 text-pink-700',
      form: 'bg-orange-100 text-orange-700',
      other: 'bg-slate-100 text-slate-700',
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 text-sm font-medium mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Locator Extractor
        </div>
        <h2 className="text-3xl font-extrabold text-gradient mb-2">Extract Page Locators</h2>
        <p className="text-gray-500">Get all CSS selectors, IDs, XPaths, and Playwright locators from any URL</p>
      </div>

      {/* URL Input */}
      <div className="card-modern">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                className="input-modern"
                disabled={isExtractingLocators}
              />
            </div>
            
            {/* Login First Button - for protected pages */}
            {!isLoggedIn && (
              <button
                onClick={handleLoginFirst}
                disabled={isExtractingLocators || !url.trim()}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  isExtractingLocators || !url.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
                title="Open browser to login first (for protected pages)"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Login First
                </span>
              </button>
            )}

            {/* Close Session Button */}
            {isLoggedIn && (
              <button
                onClick={handleCloseSession}
                className="px-4 py-3 rounded-xl font-semibold bg-red-500 hover:bg-red-600 text-white transition-all"
                title="Close browser session"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </span>
              </button>
            )}

            {/* Extract Button */}
            <button
              onClick={handleExtract}
              disabled={isExtractingLocators || !url.trim()}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                isExtractingLocators || !url.trim()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {isExtractingLocators ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Extracting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {isLoggedIn ? 'Extract After Login' : 'Extract'}
                </span>
              )}
            </button>
          </div>

          {/* Login Message */}
          {loginMessage && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {loginMessage}
              </span>
            </div>
          )}

          {/* Session Active Indicator */}
          {isLoggedIn && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Browser session active - You can navigate and login in the browser, then extract
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Results */}
      {locatorResult && (
        <>
          {/* Summary */}
          <div className="card-modern">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 rounded-xl bg-gray-50">
                <p className="text-2xl font-bold text-gray-800">{locatorResult.totalElements}</p>
                <p className="text-xs text-gray-500">Total Elements</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-blue-50">
                <p className="text-2xl font-bold text-blue-600">{locatorResult.summary.buttons}</p>
                <p className="text-xs text-gray-500">Buttons</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-green-50">
                <p className="text-2xl font-bold text-green-600">{locatorResult.summary.inputs}</p>
                <p className="text-xs text-gray-500">Inputs</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-purple-50">
                <p className="text-2xl font-bold text-purple-600">{locatorResult.summary.links}</p>
                <p className="text-xs text-gray-500">Links</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-indigo-50">
                <p className="text-2xl font-bold text-indigo-600">{locatorResult.summary.withId}</p>
                <p className="text-xs text-gray-500">With ID</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-amber-50">
                <p className="text-2xl font-bold text-amber-600">{locatorResult.summary.withDataTestId}</p>
                <p className="text-xs text-gray-500">With data-testid</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card-modern">
            <div className="flex flex-wrap items-center gap-4">
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Element:</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterType)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All</option>
                  <option value="button">Buttons</option>
                  <option value="input">Inputs</option>
                  <option value="link">Links</option>
                  <option value="image">Images</option>
                  <option value="container">Containers</option>
                  <option value="text">Text</option>
                  <option value="form">Forms</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Locator Type Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Locator:</span>
                <select
                  value={selectedLocatorType}
                  onChange={(e) => setSelectedLocatorType(e.target.value as LocatorType)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50 font-medium"
                >
                  <option value="id">ID</option>
                  <option value="name">Name</option>
                  <option value="class">Class</option>
                  <option value="css">CSS Selector</option>
                  <option value="xpath">XPath</option>
                  <option value="playwright">Playwright</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search by ID, class, text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Interactive Only */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyInteractive}
                  onChange={(e) => setShowOnlyInteractive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">Interactive only</span>
              </label>

              <span className="text-sm text-gray-400">
                {filteredLocators.length} elements
              </span>
            </div>
          </div>

          {/* Table View */}
          <div className="card-modern overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Field Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Text</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Locator ({selectedLocatorType.toUpperCase()})
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLocators.map((loc, index) => {
                    const locatorValue = getLocatorValue(loc);
                    const isNA = locatorValue === 'N/A';
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getElementTypeColor(loc.elementType)}`}>
                            {loc.elementType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-mono">
                              &lt;{loc.tagName}&gt;
                            </code>
                            <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
                              {getFieldName(loc)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 truncate block max-w-[200px]" title={loc.text}>
                            {loc.text || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <code className={`text-sm font-mono truncate block max-w-[300px] ${isNA ? 'text-gray-400 italic' : 'text-indigo-600'}`} title={locatorValue}>
                            {locatorValue}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {!isNA && (
                            <button
                              onClick={() => copyToClipboard(locatorValue, index)}
                              className="p-2 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center justify-center"
                              title="Copy locator"
                            >
                              {copiedIndex === index ? (
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-gray-400 hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredLocators.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No elements match your filters</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!locatorResult && !isExtractingLocators && (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Enter a URL to get started</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            We'll extract all CSS selectors, IDs, XPaths, and Playwright-compatible locators from the page
          </p>
        </div>
      )}
    </div>
  );
};

export default LocatorScreen;
