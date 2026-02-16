/**
 * Results Screen Component
 * Displays validation results with match score, issues, and side-by-side comparison
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { StyleMismatch, MismatchCategory, MismatchSeverity } from '../types';

const ResultsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { report, activeTab, setActiveTab } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<MismatchCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<MismatchSeverity | 'all'>('all');

  // Redirect if no report
  if (!report) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Results Yet</h2>
        <p className="text-gray-600 mb-6">Run a validation to see results here</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Start Validation
        </button>
      </div>
    );
  }

  const { comparisonResult, visualDiff, llmAnalysis } = report;

  // Filter mismatches
  const filteredMismatches = comparisonResult.mismatches.filter((m) => {
    const categoryMatch = selectedCategory === 'all' || m.category === selectedCategory;
    const severityMatch = selectedSeverity === 'all' || m.severity === selectedSeverity;
    return categoryMatch && severityMatch;
  });

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-blue-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // Get severity badge class
  const getSeverityClass = (severity: MismatchSeverity) => {
    switch (severity) {
      case 'critical': return 'severity-critical';
      case 'major': return 'severity-major';
      case 'minor': return 'severity-minor';
      case 'info': return 'severity-info';
    }
  };

  // Handle export
  const handleExport = async (format: 'pdf' | 'json' | 'csv') => {
    if (window.electronAPI) {
      const result = await (window as any).electronAPI.exportReport(report, {
        format,
        includeScreenshots: true,
        includeDiffImage: true,
        includeRawData: format === 'json',
      });
      if (!result.success) {
        console.error('Export failed:', result.error);
      }
    } else {
      // Browser fallback - download JSON
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ui-validation-${report.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Score */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Overall Score */}
            <div className={`w-24 h-24 rounded-full ${getScoreBg(comparisonResult.overallScore)} flex items-center justify-center`}>
              <span className={`text-3xl font-bold ${getScoreColor(comparisonResult.overallScore)}`}>
                {comparisonResult.overallScore}%
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Validation Results</h2>
              <p className="text-gray-600 mt-1">
                {comparisonResult.summary.total} issues found
                {comparisonResult.summary.critical > 0 && (
                  <span className="text-red-600 ml-2">
                    ({comparisonResult.summary.critical} critical)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Generated: {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              PDF
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
            >
              CSV
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{comparisonResult.summary.critical}</div>
            <div className="text-xs text-red-700">Critical</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{comparisonResult.summary.major}</div>
            <div className="text-xs text-orange-700">Major</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{comparisonResult.summary.minor}</div>
            <div className="text-xs text-yellow-700">Minor</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{comparisonResult.summary.info}</div>
            <div className="text-xs text-blue-700">Info</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-2">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'mismatches', label: 'Mismatches', icon: '⚠️' },
              { id: 'visual-diff', label: 'Visual Diff', icon: '🖼️' },
              { id: 'ai-insights', label: 'AI Insights', icon: '🤖' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Category Scores */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Scores</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(comparisonResult.categoryScores).map(([category, score]) => (
                    <div key={category} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">{category}</span>
                        <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Match */}
              {visualDiff && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Visual Match</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Pixel Match</span>
                      <span className={`text-xl font-bold ${getScoreColor(visualDiff.matchPercentage)}`}>
                        {visualDiff.matchPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                      <div
                        className={`h-3 rounded-full ${visualDiff.matchPercentage >= 90 ? 'bg-green-500' : visualDiff.matchPercentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${visualDiff.matchPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {visualDiff.mismatchedPixels.toLocaleString()} of {visualDiff.totalPixels.toLocaleString()} pixels differ
                    </p>
                  </div>
                </div>
              )}

              {/* Top Issues */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Issues</h3>
                <div className="space-y-3">
                  {comparisonResult.mismatches.slice(0, 5).map((mismatch) => (
                    <div key={mismatch.id} className="bg-gray-50 rounded-lg p-4 flex items-start space-x-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityClass(mismatch.severity)}`}>
                        {mismatch.severity.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {mismatch.property}: {mismatch.actualValue} → {mismatch.expectedValue}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {mismatch.element.selector}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mismatches Tab */}
          {activeTab === 'mismatches' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex space-x-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="color">Color</option>
                  <option value="typography">Typography</option>
                  <option value="spacing">Spacing</option>
                  <option value="layout">Layout</option>
                  <option value="border">Border</option>
                  <option value="alignment">Alignment</option>
                  <option value="size">Size</option>
                </select>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="info">Info</option>
                </select>
                <span className="text-sm text-gray-500 self-center">
                  Showing {filteredMismatches.length} of {comparisonResult.mismatches.length}
                </span>
              </div>

              {/* Mismatch List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredMismatches.map((mismatch) => (
                  <MismatchCard key={mismatch.id} mismatch={mismatch} />
                ))}
                {filteredMismatches.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No mismatches match the selected filters
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Visual Diff Tab */}
          {activeTab === 'visual-diff' && (
            <div className="space-y-6">
              {visualDiff?.diffImage ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Difference Visualization</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Red areas indicate visual differences between the actual UI and Figma design.
                    </p>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={`data:image/png;base64,${visualDiff.diffImage}`}
                        alt="Visual diff"
                        className="w-full"
                      />
                    </div>
                  </div>
                  {visualDiff.diffAreas.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Diff Areas</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {visualDiff.diffAreas.map((area, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 text-sm">
                            <div className="font-medium text-gray-900">Area {index + 1}</div>
                            <div className="text-gray-600">
                              {area.width}x{area.height}px at ({area.x}, {area.y})
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <div className="text-4xl mb-4">🖼️</div>
                  <p>Visual diff not available</p>
                  <p className="text-sm mt-2">Upload screenshots for both sources to see visual comparison</p>
                </div>
              )}
            </div>
          )}

          {/* AI Insights Tab */}
          {activeTab === 'ai-insights' && (
            <div className="space-y-6">
              {/* Overall Assessment */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">🤖</span> AI Assessment
                </h4>
                <p className="text-gray-700">{llmAnalysis.overallAssessment}</p>
              </div>

              {/* Grouped Summary */}
              {llmAnalysis.groupedSummary.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Issue Groups</h4>
                  <div className="space-y-3">
                    {llmAnalysis.groupedSummary.map((group, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">{group.title}</h5>
                            <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityClass(group.priority)}`}>
                            {group.priority.toUpperCase()}
                          </span>
                        </div>
                        {group.affectedElements.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs text-gray-500">Affected: </span>
                            <span className="text-xs text-gray-700">
                              {group.affectedElements.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Fixes */}
              {llmAnalysis.suggestedFixes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Suggested Fixes</h4>
                  <div className="space-y-3">
                    {llmAnalysis.suggestedFixes.map((fix, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700">{fix.suggestion}</p>
                        {fix.codeSnippet && (
                          <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                            {fix.codeSnippet}
                          </pre>
                        )}
                        {fix.designToken && (
                          <p className="mt-2 text-xs text-gray-500">
                            Design Token: <code className="bg-gray-200 px-1 rounded">{fix.designToken}</code>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Suggestions */}
              {llmAnalysis.testSuggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Suggested Tests</h4>
                  <div className="space-y-3">
                    {llmAnalysis.testSuggestions.map((test, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{test.testName}</h5>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {test.testType}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{test.testDescription}</p>
                        {test.pseudoCode && (
                          <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                            {test.pseudoCode}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Back Button */}
      <div className="flex justify-center">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ← Run New Validation
        </button>
      </div>
    </div>
  );
};

// Mismatch Card Component
const MismatchCard: React.FC<{ mismatch: StyleMismatch }> = ({ mismatch }) => {
  const [expanded, setExpanded] = useState(false);

  const getSeverityClass = (severity: MismatchSeverity) => {
    switch (severity) {
      case 'critical': return 'severity-critical';
      case 'major': return 'severity-major';
      case 'minor': return 'severity-minor';
      case 'info': return 'severity-info';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start space-x-4">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityClass(mismatch.severity)}`}>
            {mismatch.severity.toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 capitalize">
                {mismatch.category} - {mismatch.property}
              </span>
              <span className="text-xs text-gray-500">
                {expanded ? '▼' : '▶'}
              </span>
            </div>
            <div className="mt-1 flex items-center space-x-2 text-sm">
              <span className="text-red-600 line-through">{mismatch.actualValue}</span>
              <span className="text-gray-400">→</span>
              <span className="text-green-600">{mismatch.expectedValue}</span>
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
          <div className="pt-3 space-y-2 text-sm">
            <div className="flex">
              <span className="text-gray-500 w-24">Element:</span>
              <code className="text-gray-700 bg-gray-200 px-1 rounded">{mismatch.element.selector}</code>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-24">Tag:</span>
              <span className="text-gray-700">{mismatch.element.tagName}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-24">Deviation:</span>
              <span className="text-gray-700">{mismatch.deviation.toFixed(2)}</span>
            </div>
            {mismatch.figmaComponent && (
              <div className="flex">
                <span className="text-gray-500 w-24">Figma:</span>
                <span className="text-gray-700">{mismatch.figmaComponent}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsScreen;
