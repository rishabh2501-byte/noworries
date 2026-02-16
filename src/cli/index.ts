#!/usr/bin/env node

/**
 * CLI Interface for AI UI Design Validator
 * Usage: validate-ui --figma URL --site URL [options]
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ValidatorService, createValidator } from '../services/validator';
import { ExportService } from '../services/export';
import { ValidationInput, ExportFormat, ValidationProgress } from '../types';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

const program = new Command();

// CLI version and description
program
  .name('validate-ui')
  .description('AI UI Design Validator - Compare actual UI against Figma designs')
  .version('1.0.0');

// Main validate command
program
  .option('-s, --site <url>', 'Website URL to validate')
  .option('-f, --figma <url>', 'Figma design URL')
  .option('--site-screenshot <path>', 'Path to website screenshot')
  .option('--figma-screenshot <path>', 'Path to Figma design screenshot')
  .option('-o, --output <path>', 'Output directory for reports', './reports')
  .option('--format <format>', 'Export format: pdf, json, csv', 'json')
  .option('--viewport <size>', 'Viewport size (e.g., 1920x1080)', '1920x1080')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--no-headless', 'Run browser with visible window')
  .option('--figma-token <token>', 'Figma API access token (or use FIGMA_ACCESS_TOKEN env)')
  .option('--llm-provider <provider>', 'LLM provider: openai, anthropic, huggingface', 'openai')
  .option('--llm-key <key>', 'LLM API key (or use OPENAI_API_KEY, ANTHROPIC_API_KEY env)')
  .option('--no-llm', 'Skip LLM analysis')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    await runValidation(options);
  });

// Parse arguments
program.parse();

/**
 * Run the validation process
 */
async function runValidation(options: any): Promise<void> {
  const verbose = options.verbose;

  // Validate inputs
  if (!options.site && !options.siteScreenshot) {
    console.error('Error: Either --site URL or --site-screenshot path is required');
    process.exit(1);
  }

  if (!options.figma && !options.figmaScreenshot) {
    console.error('Error: Either --figma URL or --figma-screenshot path is required');
    process.exit(1);
  }

  // Get API tokens
  const figmaToken = options.figmaToken || process.env.FIGMA_ACCESS_TOKEN;
  const llmKey = options.llmKey || getLLMKey(options.llmProvider);

  if (options.figma && !figmaToken) {
    console.error('Error: Figma API token required. Use --figma-token or set FIGMA_ACCESS_TOKEN env');
    process.exit(1);
  }

  // Parse viewport
  const [width, height] = options.viewport.split('x').map(Number);
  if (!width || !height) {
    console.error('Error: Invalid viewport format. Use WIDTHxHEIGHT (e.g., 1920x1080)');
    process.exit(1);
  }

  // Create output directory
  const outputDir = path.resolve(options.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('\n🔍 AI UI Design Validator\n');
  console.log('━'.repeat(50));

  // Build validation input
  const input: ValidationInput = {
    webSource: options.site
      ? { type: 'url', url: options.site }
      : { type: 'screenshot', screenshotBase64: readFileAsBase64(options.siteScreenshot) },
    figmaSource: options.figma
      ? { type: 'url', url: options.figma }
      : { type: 'screenshot', screenshotBase64: readFileAsBase64(options.figmaScreenshot) },
  };

  if (verbose) {
    console.log('Web Source:', options.site || options.siteScreenshot);
    console.log('Figma Source:', options.figma || options.figmaScreenshot);
    console.log('Viewport:', `${width}x${height}`);
    console.log('Output:', outputDir);
    console.log('Format:', options.format);
    console.log('━'.repeat(50));
  }

  // Create validator
  const validator = createValidator({
    figmaAccessToken: figmaToken,
    llmConfig: options.llm !== false && llmKey
      ? { provider: options.llmProvider, apiKey: llmKey }
      : undefined,
    viewport: { width, height },
    headless: options.headless,
  });

  // Progress callback
  const onProgress = (progress: ValidationProgress) => {
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const spinnerChar = spinner[Math.floor(Date.now() / 100) % spinner.length];
    process.stdout.write(`\r${spinnerChar} ${progress.message} (${progress.progress}%)`);
  };

  try {
    // Run validation
    const report = await validator.validate(input, onProgress);

    // Clear progress line
    process.stdout.write('\r' + ' '.repeat(60) + '\r');

    // Print results summary
    console.log('\n✅ Validation Complete!\n');
    console.log('━'.repeat(50));
    printResultsSummary(report);

    // Export report
    const exportService = new ExportService();
    const format = options.format as ExportFormat;
    const exportResult = await exportService.export(report, {
      format,
      includeScreenshots: format === 'json',
      includeDiffImage: format === 'json',
      includeRawData: format === 'json',
    });

    // Save to file
    const outputPath = path.join(outputDir, exportResult.filename);
    if (exportResult.data instanceof Blob) {
      const buffer = Buffer.from(await exportResult.data.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
    } else {
      fs.writeFileSync(outputPath, exportResult.data);
    }

    console.log(`\n📄 Report saved: ${outputPath}`);

    // Exit with appropriate code
    if (report.comparisonResult.summary.critical > 0) {
      process.exit(2); // Critical issues found
    } else if (report.comparisonResult.summary.major > 0) {
      process.exit(1); // Major issues found
    }
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Validation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Print results summary to console
 */
function printResultsSummary(report: any): void {
  const { comparisonResult, visualDiff, llmAnalysis } = report;

  // Overall score
  const score = comparisonResult.overallScore;
  const scoreEmoji = score >= 90 ? '🟢' : score >= 70 ? '🟡' : score >= 50 ? '🟠' : '🔴';
  console.log(`${scoreEmoji} Overall Match Score: ${score}%\n`);

  // Summary stats
  console.log('Issue Summary:');
  console.log(`  Critical: ${comparisonResult.summary.critical}`);
  console.log(`  Major:    ${comparisonResult.summary.major}`);
  console.log(`  Minor:    ${comparisonResult.summary.minor}`);
  console.log(`  Info:     ${comparisonResult.summary.info}`);
  console.log(`  Total:    ${comparisonResult.summary.total}`);

  // Category scores
  console.log('\nCategory Scores:');
  for (const [category, categoryScore] of Object.entries(comparisonResult.categoryScores)) {
    const bar = createProgressBar(categoryScore as number, 20);
    console.log(`  ${category.padEnd(12)} ${bar} ${categoryScore}%`);
  }

  // Visual diff
  if (visualDiff && visualDiff.matchPercentage > 0) {
    console.log(`\nVisual Match: ${visualDiff.matchPercentage}%`);
  }

  // LLM assessment
  if (llmAnalysis && llmAnalysis.overallAssessment) {
    console.log('\n🤖 AI Assessment:');
    console.log(`  ${llmAnalysis.overallAssessment}`);
  }

  // Top issues
  if (comparisonResult.mismatches.length > 0) {
    console.log('\nTop Issues:');
    comparisonResult.mismatches.slice(0, 5).forEach((m: any, i: number) => {
      const severityIcon = {
        critical: '🔴',
        major: '🟠',
        minor: '🟡',
        info: '🔵',
      }[m.severity] || '⚪';
      console.log(`  ${i + 1}. ${severityIcon} ${m.property}: ${m.actualValue} → ${m.expectedValue}`);
      console.log(`     Element: ${m.element.selector}`);
    });
  }

  console.log('\n' + '━'.repeat(50));
}

/**
 * Create ASCII progress bar
 */
function createProgressBar(percentage: number, width: number): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Read file as base64
 */
function readFileAsBase64(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }
  const buffer = fs.readFileSync(absolutePath);
  return buffer.toString('base64');
}

/**
 * Get LLM API key from environment
 */
function getLLMKey(provider: string): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'huggingface':
      return process.env.HUGGINGFACE_API_KEY;
    default:
      return undefined;
  }
}
