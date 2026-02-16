/**
 * LLM Intelligence Layer Service
 * Uses LLM (OpenAI/Anthropic/HuggingFace) for interpretation and explanation of mismatches
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  LLMAnalysisInput,
  LLMAnalysisResult,
  LLMExplanation,
  LLMIssueSummary,
  LLMSuggestedFix,
  LLMTestSuggestion,
  StyleMismatch,
  MismatchCategory,
} from '../../types';

export type LLMProvider = 'openai' | 'anthropic' | 'huggingface';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4-turbo-preview',
  anthropic: 'claude-3-sonnet-20240229',
  huggingface: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
};

export class LLMIntelligenceService {
  private config: LLMConfig;
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;

  constructor(config: LLMConfig) {
    this.config = {
      ...config,
      model: config.model || DEFAULT_MODELS[config.provider],
    };
    this.initializeClient();
  }

  /**
   * Initialize the appropriate LLM client
   */
  private initializeClient(): void {
    switch (this.config.provider) {
      case 'openai':
        this.openaiClient = new OpenAI({ apiKey: this.config.apiKey });
        break;
      case 'anthropic':
        this.anthropicClient = new Anthropic({ apiKey: this.config.apiKey });
        break;
      case 'huggingface':
        // HuggingFace uses HTTP API directly
        break;
    }
  }

  /**
   * Analyze mismatches and generate comprehensive insights
   */
  async analyze(input: LLMAnalysisInput): Promise<LLMAnalysisResult> {
    const { mismatches, comparisonResult } = input;

    if (mismatches.length === 0) {
      return {
        explanations: [],
        groupedSummary: [],
        suggestedFixes: [],
        testSuggestions: [],
        overallAssessment: 'No mismatches detected. The UI matches the Figma design perfectly!',
      };
    }

    // Generate all analysis components in parallel
    const [explanations, groupedSummary, suggestedFixes, testSuggestions, overallAssessment] =
      await Promise.all([
        this.generateExplanations(mismatches),
        this.generateGroupedSummary(mismatches),
        this.generateSuggestedFixes(mismatches),
        this.generateTestSuggestions(mismatches, comparisonResult.overallScore),
        this.generateOverallAssessment(input),
      ]);

    return {
      explanations,
      groupedSummary,
      suggestedFixes,
      testSuggestions,
      overallAssessment,
    };
  }

  /**
   * Generate human-readable explanations for mismatches
   */
  private async generateExplanations(mismatches: StyleMismatch[]): Promise<LLMExplanation[]> {
    const prompt = this.buildExplanationsPrompt(mismatches);
    const response = await this.callLLM(prompt);
    return this.parseExplanationsResponse(response, mismatches);
  }

  /**
   * Generate grouped issue summary
   */
  private async generateGroupedSummary(mismatches: StyleMismatch[]): Promise<LLMIssueSummary[]> {
    const prompt = this.buildGroupedSummaryPrompt(mismatches);
    const response = await this.callLLM(prompt);
    return this.parseGroupedSummaryResponse(response, mismatches);
  }

  /**
   * Generate suggested fixes for developers
   */
  private async generateSuggestedFixes(mismatches: StyleMismatch[]): Promise<LLMSuggestedFix[]> {
    const prompt = this.buildSuggestedFixesPrompt(mismatches);
    const response = await this.callLLM(prompt);
    return this.parseSuggestedFixesResponse(response, mismatches);
  }

  /**
   * Generate test case suggestions
   */
  private async generateTestSuggestions(
    mismatches: StyleMismatch[],
    overallScore: number
  ): Promise<LLMTestSuggestion[]> {
    const prompt = this.buildTestSuggestionsPrompt(mismatches, overallScore);
    const response = await this.callLLM(prompt);
    return this.parseTestSuggestionsResponse(response);
  }

  /**
   * Generate overall assessment
   */
  private async generateOverallAssessment(input: LLMAnalysisInput): Promise<string> {
    const prompt = this.buildOverallAssessmentPrompt(input);
    return this.callLLM(prompt);
  }

  /**
   * Call the LLM API based on configured provider
   */
  private async callLLM(prompt: string): Promise<string> {
    try {
      switch (this.config.provider) {
        case 'openai':
          return this.callOpenAI(prompt);
        case 'anthropic':
          return this.callAnthropic(prompt);
        case 'huggingface':
          return this.callHuggingFace(prompt);
        default:
          throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('LLM API call failed:', error);
      return this.generateFallbackResponse(prompt);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: this.config.model!,
      messages: [
        {
          role: 'system',
          content: 'You are a UI/UX expert and QA engineer specializing in design system validation. Provide clear, actionable insights about UI design mismatches.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Call Anthropic Claude API
   */
  private async callAnthropic(prompt: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropicClient.messages.create({
      model: this.config.model!,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a UI/UX expert and QA engineer specializing in design system validation. Provide clear, actionable insights about UI design mismatches.',
    });

    const textContent = response.content.find(c => c.type === 'text');
    return textContent?.type === 'text' ? textContent.text : '';
  }

  /**
   * Call HuggingFace Inference API
   */
  private async callHuggingFace(prompt: string): Promise<string> {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${this.config.model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 2000,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data[0]?.generated_text || '';
  }

  /**
   * Generate fallback response when LLM is unavailable
   */
  private generateFallbackResponse(prompt: string): string {
    // Return a basic response based on the prompt type
    if (prompt.includes('explanation')) {
      return 'Unable to generate AI explanation. Please review the mismatch details manually.';
    }
    if (prompt.includes('summary')) {
      return 'Unable to generate AI summary. Please review the categorized mismatches.';
    }
    if (prompt.includes('fix')) {
      return 'Unable to generate AI suggestions. Please consult your design system documentation.';
    }
    if (prompt.includes('test')) {
      return 'Unable to generate test suggestions. Consider adding visual regression tests for the affected components.';
    }
    return 'AI analysis unavailable. Please review the comparison results manually.';
  }

  // ============================================
  // Prompt Builders
  // ============================================

  private buildExplanationsPrompt(mismatches: StyleMismatch[]): string {
    const mismatchSummary = mismatches.slice(0, 10).map(m => 
      `- ${m.property}: expected "${m.expectedValue}", got "${m.actualValue}" (${m.severity})`
    ).join('\n');

    return `Analyze these UI design mismatches and provide human-readable explanations:

${mismatchSummary}

For each mismatch, provide:
1. A simple explanation of what's wrong
2. Technical details about the deviation

Format your response as JSON array:
[{"humanReadable": "...", "technicalDetails": "..."}]`;
  }

  private buildGroupedSummaryPrompt(mismatches: StyleMismatch[]): string {
    const byCategory = this.groupMismatchesByCategory(mismatches);
    const categorySummary = Object.entries(byCategory)
      .map(([cat, items]) => `${cat}: ${items.length} issues`)
      .join('\n');

    return `Group these UI mismatches into meaningful summaries:

Categories and counts:
${categorySummary}

Sample mismatches:
${JSON.stringify(mismatches.slice(0, 5), null, 2)}

Provide grouped summaries with:
1. Category
2. Title (e.g., "Typography inconsistencies in header")
3. Description
4. Affected elements
5. Priority

Format as JSON array:
[{"category": "...", "title": "...", "description": "...", "affectedElements": [...], "priority": "critical|major|minor|info"}]`;
  }

  private buildSuggestedFixesPrompt(mismatches: StyleMismatch[]): string {
    const mismatchDetails = mismatches.slice(0, 10).map(m => ({
      id: m.id,
      property: m.property,
      expected: m.expectedValue,
      actual: m.actualValue,
      element: m.element.selector,
    }));

    return `Suggest fixes for these UI mismatches:

${JSON.stringify(mismatchDetails, null, 2)}

For each mismatch, provide:
1. A clear suggestion for the developer
2. CSS code snippet if applicable
3. Design token recommendation if applicable

Format as JSON array:
[{"mismatchId": "...", "suggestion": "...", "codeSnippet": "...", "designToken": "..."}]`;
  }

  private buildTestSuggestionsPrompt(mismatches: StyleMismatch[], overallScore: number): string {
    const categories = [...new Set(mismatches.map(m => m.category))];

    return `Based on these UI validation results, suggest automated tests:

Overall match score: ${overallScore}%
Categories with issues: ${categories.join(', ')}
Total mismatches: ${mismatches.length}

Suggest 3-5 test cases that would help catch these issues in the future.

Format as JSON array:
[{"testName": "...", "testDescription": "...", "testType": "visual|functional|accessibility", "pseudoCode": "..."}]`;
  }

  private buildOverallAssessmentPrompt(input: LLMAnalysisInput): string {
    const { mismatches, comparisonResult } = input;

    return `Provide a brief overall assessment of this UI validation:

Match Score: ${comparisonResult.overallScore}%
Total Issues: ${mismatches.length}
Critical: ${comparisonResult.summary.critical}
Major: ${comparisonResult.summary.major}
Minor: ${comparisonResult.summary.minor}

Category Scores:
${Object.entries(comparisonResult.categoryScores)
  .map(([cat, score]) => `- ${cat}: ${score}%`)
  .join('\n')}

Write a 2-3 sentence assessment suitable for a QA report summary.`;
  }

  // ============================================
  // Response Parsers
  // ============================================

  private parseExplanationsResponse(response: string, mismatches: StyleMismatch[]): LLMExplanation[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback to generated explanations
    }

    // Generate basic explanations if parsing fails
    return mismatches.slice(0, 10).map(m => ({
      humanReadable: `The ${m.property} is ${m.actualValue} instead of ${m.expectedValue}`,
      technicalDetails: `Element: ${m.element.selector}, Deviation: ${m.deviation.toFixed(2)}`,
    }));
  }

  private parseGroupedSummaryResponse(response: string, mismatches: StyleMismatch[]): LLMIssueSummary[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback to basic grouping
    }

    // Generate basic grouped summary
    const byCategory = this.groupMismatchesByCategory(mismatches);
    return Object.entries(byCategory).map(([category, items]) => ({
      category: category as MismatchCategory,
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} inconsistencies detected`,
      description: `Found ${items.length} ${category} mismatches that need attention`,
      affectedElements: items.slice(0, 5).map(m => m.element.selector),
      priority: items.some(m => m.severity === 'critical') ? 'critical' as const : 'major' as const,
    }));
  }

  private parseSuggestedFixesResponse(response: string, mismatches: StyleMismatch[]): LLMSuggestedFix[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback to basic suggestions
    }

    // Generate basic fix suggestions
    return mismatches.slice(0, 10).map(m => ({
      mismatchId: m.id,
      suggestion: `Update ${m.property} from ${m.actualValue} to ${m.expectedValue}`,
      codeSnippet: `${m.element.selector} { ${m.property}: ${m.expectedValue}; }`,
    }));
  }

  private parseTestSuggestionsResponse(response: string): LLMTestSuggestion[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback to basic test suggestions
    }

    // Return default test suggestions
    return [
      {
        testName: 'Visual Regression Test',
        testDescription: 'Compare screenshots against baseline',
        testType: 'visual',
        pseudoCode: 'await expect(page).toHaveScreenshot("baseline.png")',
      },
      {
        testName: 'Color Consistency Test',
        testDescription: 'Verify colors match design tokens',
        testType: 'functional',
        pseudoCode: 'expect(getComputedStyle(element).color).toBe(designToken.color)',
      },
    ];
  }

  // ============================================
  // Utility Methods
  // ============================================

  private groupMismatchesByCategory(mismatches: StyleMismatch[]): Record<string, StyleMismatch[]> {
    return mismatches.reduce((acc, mismatch) => {
      const category = mismatch.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(mismatch);
      return acc;
    }, {} as Record<string, StyleMismatch[]>);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.apiKey || config.provider) {
      this.initializeClient();
    }
  }
}

// Factory function
export function createLLMService(config: LLMConfig): LLMIntelligenceService {
  return new LLMIntelligenceService(config);
}

export default LLMIntelligenceService;
