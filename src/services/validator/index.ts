/**
 * Main Validator Service
 * Orchestrates all validation modules and generates comprehensive reports
 */

import { WebAnalyzer } from '../web-analyzer';
import { FigmaAnalyzer, createFigmaAnalyzer } from '../figma-analyzer';
import { ComparisonEngine } from '../comparison-engine';
import { VisualDiffEngine } from '../visual-diff';
import { LLMIntelligenceService, createLLMService, LLMConfig } from '../llm-intelligence';
import { ExportService } from '../export';
import {
  ValidationInput,
  ValidationReport,
  ValidationProgress,
  VisualDiffResult,
  LLMAnalysisResult,
  ExportOptions,
  WebAnalysisResult,
  FigmaAnalysisResult,
} from '../../types';

export type ProgressCallback = (progress: ValidationProgress) => void;

export interface ValidatorConfig {
  figmaAccessToken?: string;
  llmConfig?: LLMConfig;
  viewport?: { width: number; height: number };
  headless?: boolean;
}

export class ValidatorService {
  private webAnalyzer: WebAnalyzer;
  private figmaAnalyzer: FigmaAnalyzer | null = null;
  private comparisonEngine: ComparisonEngine;
  private visualDiffEngine: VisualDiffEngine;
  private llmService: LLMIntelligenceService | null = null;
  private exportService: ExportService;
  private config: ValidatorConfig;

  constructor(config: ValidatorConfig = {}) {
    this.config = config;
    this.webAnalyzer = new WebAnalyzer();
    this.comparisonEngine = new ComparisonEngine();
    this.visualDiffEngine = new VisualDiffEngine();
    this.exportService = new ExportService();

    if (config.figmaAccessToken) {
      this.figmaAnalyzer = createFigmaAnalyzer(config.figmaAccessToken);
    }

    if (config.llmConfig) {
      this.llmService = createLLMService(config.llmConfig);
    }
  }

  /**
   * Run full validation pipeline
   */
  async validate(
    input: ValidationInput,
    onProgress?: ProgressCallback
  ): Promise<ValidationReport> {
    const reportId = this.generateReportId();
    
    try {
      // Stage 1: Analyze Web
      this.updateProgress(onProgress, {
        stage: 'analyzing-web',
        progress: 10,
        message: 'Analyzing web page...',
      });

      const webAnalysis = await this.analyzeWeb(input.webSource);

      // Stage 2: Analyze Figma
      this.updateProgress(onProgress, {
        stage: 'analyzing-figma',
        progress: 30,
        message: 'Analyzing Figma design...',
      });

      const figmaAnalysis = await this.analyzeFigma(input.figmaSource);

      // Stage 3: Compare
      this.updateProgress(onProgress, {
        stage: 'comparing',
        progress: 50,
        message: 'Comparing styles and design tokens...',
      });

      const comparisonResult = this.comparisonEngine.compare(webAnalysis, figmaAnalysis);

      // Stage 4: Visual Diff
      this.updateProgress(onProgress, {
        stage: 'visual-diff',
        progress: 70,
        message: 'Generating visual diff...',
      });

      let visualDiff: VisualDiffResult | undefined;
      if (webAnalysis.screenshot && figmaAnalysis.screenshot) {
        visualDiff = await this.visualDiffEngine.compare(
          webAnalysis.screenshot,
          figmaAnalysis.screenshot
        );
      }

      // Stage 5: LLM Analysis
      this.updateProgress(onProgress, {
        stage: 'llm-analysis',
        progress: 85,
        message: 'Generating AI insights...',
      });

      let llmAnalysis: LLMAnalysisResult | undefined;
      if (this.llmService && comparisonResult.mismatches.length > 0) {
        try {
          llmAnalysis = await this.llmService.analyze({
            mismatches: comparisonResult.mismatches,
            webAnalysis,
            figmaAnalysis,
            comparisonResult,
          });
        } catch (error) {
          console.error('LLM analysis failed:', error);
          // Continue without LLM analysis
        }
      }

      // Stage 6: Complete
      this.updateProgress(onProgress, {
        stage: 'complete',
        progress: 100,
        message: 'Validation complete!',
      });

      // Build report
      const report: ValidationReport = {
        id: reportId,
        createdAt: new Date().toISOString(),
        webSource: {
          type: input.webSource.type,
          value: input.webSource.url || 'screenshot-upload',
        },
        figmaSource: {
          type: input.figmaSource.type,
          value: input.figmaSource.url || 'screenshot-upload',
        },
        webAnalysis,
        figmaAnalysis,
        comparisonResult,
        visualDiff: visualDiff || {
          diffImage: '',
          matchPercentage: 0,
          mismatchedPixels: 0,
          totalPixels: 0,
          diffAreas: [],
        },
        llmAnalysis: llmAnalysis || {
          explanations: [],
          groupedSummary: [],
          suggestedFixes: [],
          testSuggestions: [],
          overallAssessment: 'LLM analysis not available.',
        },
      };

      return report;
    } catch (error) {
      this.updateProgress(onProgress, {
        stage: 'error',
        progress: 0,
        message: 'Validation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Analyze web source
   */
  private async analyzeWeb(
    source: ValidationInput['webSource']
  ): Promise<WebAnalysisResult> {
    if (source.type === 'url' && source.url) {
      return this.webAnalyzer.analyzeUrl(source.url, {
        viewport: this.config.viewport,
        headless: this.config.headless ?? true,
      });
    } else if (source.screenshotBase64) {
      return this.webAnalyzer.analyzeScreenshot(source.screenshotBase64);
    } else {
      throw new Error('Invalid web source: provide URL or screenshot');
    }
  }

  /**
   * Analyze Figma source
   */
  private async analyzeFigma(
    source: ValidationInput['figmaSource']
  ): Promise<FigmaAnalysisResult> {
    if (source.type === 'url' && source.url) {
      if (!this.figmaAnalyzer) {
        throw new Error('Figma access token not configured');
      }
      return this.figmaAnalyzer.analyzeUrl(source.url);
    } else if (source.screenshotBase64) {
      return {
        fileKey: 'screenshot-upload',
        fileName: 'Uploaded Design',
        timestamp: new Date().toISOString(),
        screenshot: source.screenshotBase64,
        designTokens: {
          colors: [],
          typography: [],
          spacing: [],
          effects: [],
          components: [],
        },
        components: [],
      };
    } else {
      throw new Error('Invalid Figma source: provide URL or screenshot');
    }
  }

  /**
   * Export report
   */
  async exportReport(
    report: ValidationReport,
    options: ExportOptions
  ): Promise<{ data: string | Blob; filename: string; mimeType: string }> {
    return this.exportService.export(report, options);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ValidatorConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.figmaAccessToken) {
      this.figmaAnalyzer = createFigmaAnalyzer(config.figmaAccessToken);
    }

    if (config.llmConfig) {
      this.llmService = createLLMService(config.llmConfig);
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      await this.webAnalyzer.close();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `report-${timestamp}-${random}`;
  }

  /**
   * Update progress callback
   */
  private updateProgress(
    callback: ProgressCallback | undefined,
    progress: ValidationProgress
  ): void {
    if (callback) {
      callback(progress);
    }
  }
}

// Factory function
export function createValidator(config: ValidatorConfig = {}): ValidatorService {
  return new ValidatorService(config);
}

export default ValidatorService;
