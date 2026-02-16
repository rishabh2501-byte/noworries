/**
 * Core type definitions for AI UI Design Validator
 */

// ============================================
// Web Analyzer Types
// ============================================

export interface DOMElement {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes: Record<string, string>;
  computedStyles: ComputedStyleData;
  boundingBox: BoundingBox;
  children: DOMElement[];
}

export interface ComputedStyleData {
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  margin: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  padding: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  borderRadius: string;
  borderWidth: string;
  borderColor: string;
  borderStyle: string;
  width: string;
  height: string;
  display: string;
  position: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WebAnalysisResult {
  url: string;
  timestamp: string;
  screenshot: string; // Base64 encoded
  screenshotPath?: string;
  domTree: DOMElement[];
  viewport: {
    width: number;
    height: number;
  };
}

// ============================================
// Figma Analyzer Types
// ============================================

export interface FigmaDesignTokens {
  colors: FigmaColor[];
  typography: FigmaTypography[];
  spacing: FigmaSpacing[];
  effects: FigmaEffect[];
  components: FigmaComponent[];
}

export interface FigmaColor {
  name: string;
  hex: string;
  rgba: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}

export interface FigmaTypography {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | string;
  letterSpacing: number;
  textAlign?: string;
}

export interface FigmaSpacing {
  name: string;
  value: number;
}

export interface FigmaEffect {
  name: string;
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  color?: string;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
}

export interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  boundingBox: BoundingBox;
  styles: Partial<ComputedStyleData>;
  children?: FigmaComponent[];
}

export interface FigmaAnalysisResult {
  fileKey: string;
  fileName: string;
  timestamp: string;
  screenshot?: string; // Base64 encoded (if uploaded)
  designTokens: FigmaDesignTokens;
  components: FigmaComponent[];
}

// ============================================
// Comparison Engine Types
// ============================================

export type MismatchSeverity = 'critical' | 'major' | 'minor' | 'info';

export type MismatchCategory = 
  | 'color'
  | 'typography'
  | 'spacing'
  | 'layout'
  | 'border'
  | 'alignment'
  | 'size';

export interface StyleMismatch {
  id: string;
  category: MismatchCategory;
  severity: MismatchSeverity;
  property: string;
  expectedValue: string;
  actualValue: string;
  element: {
    selector: string;
    tagName: string;
    id?: string;
    className?: string;
  };
  figmaComponent?: string;
  deviation: number; // Percentage or pixel difference
}

export interface ComparisonResult {
  timestamp: string;
  overallScore: number; // 0-100
  categoryScores: Record<MismatchCategory, number>;
  mismatches: StyleMismatch[];
  summary: {
    total: number;
    critical: number;
    major: number;
    minor: number;
    info: number;
  };
}

// ============================================
// Visual Diff Types
// ============================================

export interface VisualDiffResult {
  diffImage: string; // Base64 encoded
  diffImagePath?: string;
  matchPercentage: number;
  mismatchedPixels: number;
  totalPixels: number;
  diffAreas: BoundingBox[];
}

// ============================================
// LLM Intelligence Types
// ============================================

export interface LLMAnalysisInput {
  mismatches: StyleMismatch[];
  webAnalysis: WebAnalysisResult;
  figmaAnalysis: FigmaAnalysisResult;
  comparisonResult: ComparisonResult;
}

export interface LLMExplanation {
  humanReadable: string;
  technicalDetails: string;
}

export interface LLMIssueSummary {
  category: MismatchCategory;
  title: string;
  description: string;
  affectedElements: string[];
  priority: MismatchSeverity;
}

export interface LLMSuggestedFix {
  mismatchId: string;
  suggestion: string;
  codeSnippet?: string;
  designToken?: string;
}

export interface LLMTestSuggestion {
  testName: string;
  testDescription: string;
  testType: 'visual' | 'functional' | 'accessibility';
  pseudoCode: string;
}

export interface LLMAnalysisResult {
  explanations: LLMExplanation[];
  groupedSummary: LLMIssueSummary[];
  suggestedFixes: LLMSuggestedFix[];
  testSuggestions: LLMTestSuggestion[];
  overallAssessment: string;
}

// ============================================
// Report & Export Types
// ============================================

export interface ValidationReport {
  id: string;
  createdAt: string;
  webSource: {
    type: 'url' | 'screenshot';
    value: string;
  };
  figmaSource: {
    type: 'url' | 'screenshot';
    value: string;
  };
  webAnalysis: WebAnalysisResult;
  figmaAnalysis: FigmaAnalysisResult;
  comparisonResult: ComparisonResult;
  visualDiff: VisualDiffResult;
  llmAnalysis: LLMAnalysisResult;
}

export type ExportFormat = 'pdf' | 'json' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  includeScreenshots: boolean;
  includeDiffImage: boolean;
  includeRawData: boolean;
}

// ============================================
// Application State Types
// ============================================

export interface AppSettings {
  figmaAccessToken?: string;
  llmProvider: 'openai' | 'anthropic' | 'huggingface';
  llmApiKey?: string;
  defaultViewport: {
    width: number;
    height: number;
  };
  screenshotQuality: number;
  autoSaveReports: boolean;
  reportsDirectory: string;
}

export interface ValidationInput {
  webSource: {
    type: 'url' | 'screenshot';
    url?: string;
    screenshotFile?: File;
    screenshotBase64?: string;
  };
  figmaSource: {
    type: 'url' | 'screenshot';
    url?: string;
    screenshotFile?: File;
    screenshotBase64?: string;
  };
}

export interface ValidationProgress {
  stage: 'idle' | 'analyzing-web' | 'analyzing-figma' | 'comparing' | 'visual-diff' | 'llm-analysis' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
}

// ============================================
// CLI Types
// ============================================

export interface CLIOptions {
  figma: string;
  site: string;
  output?: string;
  format?: ExportFormat;
  viewport?: string;
  headless?: boolean;
}

// ============================================
// Locator Extraction Types
// ============================================

export interface ElementLocator {
  tagName: string;
  id?: string;
  className?: string;
  name?: string;
  dataTestId?: string;
  ariaLabel?: string;
  text?: string;
  xpath: string;
  cssSelector: string;
  playwrightSelector: string;
  boundingBox: BoundingBox;
  attributes: Record<string, string>;
  isInteractive: boolean;
  elementType: 'button' | 'input' | 'link' | 'text' | 'image' | 'container' | 'form' | 'other';
}

export interface LocatorExtractionResult {
  url: string;
  timestamp: string;
  totalElements: number;
  locators: ElementLocator[];
  summary: {
    buttons: number;
    inputs: number;
    links: number;
    images: number;
    forms: number;
    containers: number;
    withId: number;
    withClass: number;
    withDataTestId: number;
  };
}
