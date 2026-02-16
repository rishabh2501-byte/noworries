/**
 * Comparison Engine Service
 * Rule-based comparison of web UI styles against Figma design tokens
 */

import chroma from 'chroma-js';
import {
  WebAnalysisResult,
  FigmaAnalysisResult,
  ComparisonResult,
  StyleMismatch,
  MismatchCategory,
  MismatchSeverity,
  DOMElement,
  FigmaComponent,
  ComputedStyleData,
} from '../../types';

// Tolerance thresholds for comparisons
const THRESHOLDS = {
  color: {
    deltaE: 5, // Color difference threshold (CIE Delta E)
    critical: 20,
    major: 10,
  },
  fontSize: {
    pixels: 2, // Pixel difference threshold
    critical: 8,
    major: 4,
  },
  spacing: {
    pixels: 4, // Pixel difference threshold
    critical: 16,
    major: 8,
  },
  borderRadius: {
    pixels: 2,
    critical: 8,
    major: 4,
  },
  lineHeight: {
    ratio: 0.1, // 10% difference threshold
    critical: 0.3,
    major: 0.2,
  },
};

export class ComparisonEngine {
  private mismatches: StyleMismatch[] = [];
  private mismatchIdCounter = 0;

  /**
   * Compare web analysis results against Figma design tokens
   */
  compare(
    webAnalysis: WebAnalysisResult,
    figmaAnalysis: FigmaAnalysisResult
  ): ComparisonResult {
    this.mismatches = [];
    this.mismatchIdCounter = 0;

    const { designTokens, components } = figmaAnalysis;
    const { domTree } = webAnalysis;

    // Compare colors
    this.compareColors(domTree, designTokens.colors);

    // Compare typography
    this.compareTypography(domTree, designTokens.typography);

    // Compare spacing
    this.compareSpacing(domTree, designTokens.spacing);

    // Compare components if available
    if (components.length > 0 && domTree.length > 0) {
      this.compareComponents(domTree, components);
    }

    // Calculate scores
    const categoryScores = this.calculateCategoryScores();
    const overallScore = this.calculateOverallScore(categoryScores);
    const summary = this.calculateSummary();

    return {
      timestamp: new Date().toISOString(),
      overallScore,
      categoryScores,
      mismatches: this.mismatches,
      summary,
    };
  }

  /**
   * Compare colors from DOM elements against Figma color tokens
   */
  private compareColors(domTree: DOMElement[], figmaColors: { hex: string; name: string }[]): void {
    if (figmaColors.length === 0) return;

    const processElement = (element: DOMElement, path: string = ''): void => {
      const selector = this.buildSelector(element, path);
      const styles = element.computedStyles;

      // Check text color
      if (styles.color) {
        const colorMismatch = this.findColorMismatch(styles.color, figmaColors, 'color');
        if (colorMismatch) {
          this.addMismatch({
            category: 'color',
            property: 'color',
            expectedValue: colorMismatch.expected,
            actualValue: colorMismatch.actual,
            element: {
              selector,
              tagName: element.tagName,
              id: element.id,
              className: element.className,
            },
            deviation: colorMismatch.deviation,
            severity: this.getColorSeverity(colorMismatch.deviation),
          });
        }
      }

      // Check background color
      if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const bgMismatch = this.findColorMismatch(styles.backgroundColor, figmaColors, 'backgroundColor');
        if (bgMismatch) {
          this.addMismatch({
            category: 'color',
            property: 'backgroundColor',
            expectedValue: bgMismatch.expected,
            actualValue: bgMismatch.actual,
            element: {
              selector,
              tagName: element.tagName,
              id: element.id,
              className: element.className,
            },
            deviation: bgMismatch.deviation,
            severity: this.getColorSeverity(bgMismatch.deviation),
          });
        }
      }

      // Check border color
      if (styles.borderColor && styles.borderWidth !== '0px') {
        const borderMismatch = this.findColorMismatch(styles.borderColor, figmaColors, 'borderColor');
        if (borderMismatch) {
          this.addMismatch({
            category: 'border',
            property: 'borderColor',
            expectedValue: borderMismatch.expected,
            actualValue: borderMismatch.actual,
            element: {
              selector,
              tagName: element.tagName,
              id: element.id,
              className: element.className,
            },
            deviation: borderMismatch.deviation,
            severity: this.getColorSeverity(borderMismatch.deviation),
          });
        }
      }

      // Process children
      element.children.forEach((child, index) => {
        processElement(child, `${selector} > :nth-child(${index + 1})`);
      });
    };

    domTree.forEach((element, index) => {
      processElement(element, `body > :nth-child(${index + 1})`);
    });
  }

  /**
   * Find color mismatch against Figma colors
   */
  private findColorMismatch(
    actualColor: string,
    figmaColors: { hex: string; name: string }[],
    _property: string
  ): { expected: string; actual: string; deviation: number } | null {
    try {
      const actualChroma = chroma(actualColor);
      let closestColor = figmaColors[0];
      let minDeltaE = Infinity;

      for (const figmaColor of figmaColors) {
        try {
          const figmaChroma = chroma(figmaColor.hex);
          const deltaE = chroma.deltaE(actualChroma, figmaChroma);
          if (deltaE < minDeltaE) {
            minDeltaE = deltaE;
            closestColor = figmaColor;
          }
        } catch {
          continue;
        }
      }

      // If the color is close enough, no mismatch
      if (minDeltaE <= THRESHOLDS.color.deltaE) {
        return null;
      }

      return {
        expected: closestColor.hex,
        actual: actualChroma.hex().toUpperCase(),
        deviation: minDeltaE,
      };
    } catch {
      return null;
    }
  }

  /**
   * Compare typography from DOM elements against Figma typography tokens
   */
  private compareTypography(
    domTree: DOMElement[],
    figmaTypography: { fontFamily: string; fontSize: number; fontWeight: number; lineHeight: number | string }[]
  ): void {
    if (figmaTypography.length === 0) return;

    const processElement = (element: DOMElement, path: string = ''): void => {
      const selector = this.buildSelector(element, path);
      const styles = element.computedStyles;

      // Check font size
      if (styles.fontSize) {
        const actualSize = parseFloat(styles.fontSize);
        const closestTypo = this.findClosestTypography(actualSize, figmaTypography, 'fontSize');
        
        if (closestTypo && Math.abs(actualSize - closestTypo.fontSize) > THRESHOLDS.fontSize.pixels) {
          this.addMismatch({
            category: 'typography',
            property: 'fontSize',
            expectedValue: `${closestTypo.fontSize}px`,
            actualValue: styles.fontSize,
            element: {
              selector,
              tagName: element.tagName,
              id: element.id,
              className: element.className,
            },
            deviation: Math.abs(actualSize - closestTypo.fontSize),
            severity: this.getFontSizeSeverity(Math.abs(actualSize - closestTypo.fontSize)),
          });
        }
      }

      // Check font weight
      if (styles.fontWeight) {
        const actualWeight = parseInt(styles.fontWeight, 10);
        const closestTypo = this.findClosestTypography(actualWeight, figmaTypography, 'fontWeight');
        
        if (closestTypo && actualWeight !== closestTypo.fontWeight) {
          this.addMismatch({
            category: 'typography',
            property: 'fontWeight',
            expectedValue: `${closestTypo.fontWeight}`,
            actualValue: styles.fontWeight,
            element: {
              selector,
              tagName: element.tagName,
              id: element.id,
              className: element.className,
            },
            deviation: Math.abs(actualWeight - closestTypo.fontWeight),
            severity: 'minor',
          });
        }
      }

      // Check line height
      if (styles.lineHeight && styles.lineHeight !== 'normal') {
        const actualLineHeight = parseFloat(styles.lineHeight);
        const fontSize = parseFloat(styles.fontSize) || 16;
        const actualRatio = actualLineHeight / fontSize;

        for (const typo of figmaTypography) {
          const expectedLineHeight = typeof typo.lineHeight === 'number' ? typo.lineHeight : fontSize * 1.5;
          const expectedRatio = expectedLineHeight / typo.fontSize;
          
          if (Math.abs(actualRatio - expectedRatio) > THRESHOLDS.lineHeight.ratio) {
            this.addMismatch({
              category: 'typography',
              property: 'lineHeight',
              expectedValue: `${expectedLineHeight}px`,
              actualValue: styles.lineHeight,
              element: {
                selector,
                tagName: element.tagName,
                id: element.id,
                className: element.className,
              },
              deviation: Math.abs(actualRatio - expectedRatio) * 100,
              severity: this.getLineHeightSeverity(Math.abs(actualRatio - expectedRatio)),
            });
            break;
          }
        }
      }

      // Process children
      element.children.forEach((child, index) => {
        processElement(child, `${selector} > :nth-child(${index + 1})`);
      });
    };

    domTree.forEach((element, index) => {
      processElement(element, `body > :nth-child(${index + 1})`);
    });
  }

  /**
   * Find closest typography token
   */
  private findClosestTypography(
    value: number,
    typography: { fontFamily: string; fontSize: number; fontWeight: number }[],
    property: 'fontSize' | 'fontWeight'
  ): { fontFamily: string; fontSize: number; fontWeight: number } | null {
    if (typography.length === 0) return null;

    let closest = typography[0];
    let minDiff = Math.abs(value - closest[property]);

    for (const typo of typography) {
      const diff = Math.abs(value - typo[property]);
      if (diff < minDiff) {
        minDiff = diff;
        closest = typo;
      }
    }

    return closest;
  }

  /**
   * Compare spacing from DOM elements against Figma spacing tokens
   */
  private compareSpacing(
    domTree: DOMElement[],
    figmaSpacing: { name: string; value: number }[]
  ): void {
    if (figmaSpacing.length === 0) return;

    const spacingValues = figmaSpacing.map(s => s.value);

    const processElement = (element: DOMElement, path: string = ''): void => {
      const selector = this.buildSelector(element, path);
      const styles = element.computedStyles;

      // Check padding
      const paddingProps = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;
      for (const prop of paddingProps) {
        const value = parseFloat(styles[prop]) || 0;
        if (value > 0) {
          const mismatch = this.findSpacingMismatch(value, spacingValues);
          if (mismatch) {
            this.addMismatch({
              category: 'spacing',
              property: prop,
              expectedValue: `${mismatch.expected}px`,
              actualValue: `${value}px`,
              element: {
                selector,
                tagName: element.tagName,
                id: element.id,
                className: element.className,
              },
              deviation: mismatch.deviation,
              severity: this.getSpacingSeverity(mismatch.deviation),
            });
          }
        }
      }

      // Check margin
      const marginProps = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const;
      for (const prop of marginProps) {
        const value = parseFloat(styles[prop]) || 0;
        if (value > 0) {
          const mismatch = this.findSpacingMismatch(value, spacingValues);
          if (mismatch) {
            this.addMismatch({
              category: 'spacing',
              property: prop,
              expectedValue: `${mismatch.expected}px`,
              actualValue: `${value}px`,
              element: {
                selector,
                tagName: element.tagName,
                id: element.id,
                className: element.className,
              },
              deviation: mismatch.deviation,
              severity: this.getSpacingSeverity(mismatch.deviation),
            });
          }
        }
      }

      // Check gap
      if (styles.gap) {
        const value = parseFloat(styles.gap) || 0;
        if (value > 0) {
          const mismatch = this.findSpacingMismatch(value, spacingValues);
          if (mismatch) {
            this.addMismatch({
              category: 'spacing',
              property: 'gap',
              expectedValue: `${mismatch.expected}px`,
              actualValue: `${value}px`,
              element: {
                selector,
                tagName: element.tagName,
                id: element.id,
                className: element.className,
              },
              deviation: mismatch.deviation,
              severity: this.getSpacingSeverity(mismatch.deviation),
            });
          }
        }
      }

      // Check border radius
      if (styles.borderRadius) {
        const value = parseFloat(styles.borderRadius) || 0;
        if (value > 0) {
          const mismatch = this.findSpacingMismatch(value, spacingValues);
          if (mismatch && mismatch.deviation > THRESHOLDS.borderRadius.pixels) {
            this.addMismatch({
              category: 'border',
              property: 'borderRadius',
              expectedValue: `${mismatch.expected}px`,
              actualValue: `${value}px`,
              element: {
                selector,
                tagName: element.tagName,
                id: element.id,
                className: element.className,
              },
              deviation: mismatch.deviation,
              severity: this.getBorderRadiusSeverity(mismatch.deviation),
            });
          }
        }
      }

      // Process children
      element.children.forEach((child, index) => {
        processElement(child, `${selector} > :nth-child(${index + 1})`);
      });
    };

    domTree.forEach((element, index) => {
      processElement(element, `body > :nth-child(${index + 1})`);
    });
  }

  /**
   * Find spacing mismatch
   */
  private findSpacingMismatch(
    actual: number,
    spacingValues: number[]
  ): { expected: number; deviation: number } | null {
    if (spacingValues.length === 0) return null;

    let closest = spacingValues[0];
    let minDiff = Math.abs(actual - closest);

    for (const value of spacingValues) {
      const diff = Math.abs(actual - value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = value;
      }
    }

    if (minDiff <= THRESHOLDS.spacing.pixels) {
      return null;
    }

    return {
      expected: closest,
      deviation: minDiff,
    };
  }

  /**
   * Compare DOM components against Figma components
   */
  private compareComponents(domTree: DOMElement[], figmaComponents: FigmaComponent[]): void {
    // This is a simplified component comparison
    // In a real implementation, you would use more sophisticated matching algorithms
    
    for (const figmaComponent of figmaComponents) {
      const matchingElement = this.findMatchingElement(domTree, figmaComponent);
      
      if (matchingElement && figmaComponent.styles) {
        this.compareElementStyles(matchingElement, figmaComponent);
      }
    }
  }

  /**
   * Find matching DOM element for a Figma component
   */
  private findMatchingElement(domTree: DOMElement[], figmaComponent: FigmaComponent): DOMElement | null {
    // Simple matching based on name similarity
    const componentName = figmaComponent.name.toLowerCase();
    
    const findInTree = (elements: DOMElement[]): DOMElement | null => {
      for (const element of elements) {
        const elementId = element.id?.toLowerCase() || '';
        const elementClass = element.className?.toLowerCase() || '';
        
        if (elementId.includes(componentName) || elementClass.includes(componentName)) {
          return element;
        }
        
        const found = findInTree(element.children);
        if (found) return found;
      }
      return null;
    };

    return findInTree(domTree);
  }

  /**
   * Compare element styles against Figma component styles
   */
  private compareElementStyles(element: DOMElement, figmaComponent: FigmaComponent): void {
    const selector = this.buildSelector(element, '');
    const actualStyles = element.computedStyles;
    const expectedStyles = figmaComponent.styles;

    // Compare each style property
    const styleProps: (keyof ComputedStyleData)[] = [
      'fontSize', 'fontWeight', 'lineHeight', 'padding', 'margin', 'borderRadius'
    ];

    for (const prop of styleProps) {
      if (expectedStyles[prop] && actualStyles[prop]) {
        const expected = parseFloat(expectedStyles[prop] as string) || 0;
        const actual = parseFloat(actualStyles[prop] as string) || 0;
        
        if (Math.abs(expected - actual) > THRESHOLDS.spacing.pixels) {
          this.addMismatch({
            category: this.getCategoryForProperty(prop),
            property: prop,
            expectedValue: expectedStyles[prop] as string,
            actualValue: actualStyles[prop] as string,
            element: {
              selector,
              tagName: element.tagName,
              id: element.id,
              className: element.className,
            },
            figmaComponent: figmaComponent.name,
            deviation: Math.abs(expected - actual),
            severity: 'major',
          });
        }
      }
    }
  }

  /**
   * Build CSS selector for an element
   */
  private buildSelector(element: DOMElement, path: string): string {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className) {
      const firstClass = element.className.split(' ')[0];
      if (firstClass) {
        return `.${firstClass}`;
      }
    }
    return path || element.tagName;
  }

  /**
   * Add a mismatch to the list
   */
  private addMismatch(mismatch: Omit<StyleMismatch, 'id'>): void {
    this.mismatches.push({
      ...mismatch,
      id: `mismatch-${++this.mismatchIdCounter}`,
    });
  }

  /**
   * Get category for a style property
   */
  private getCategoryForProperty(property: string): MismatchCategory {
    if (['color', 'backgroundColor'].includes(property)) return 'color';
    if (['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing'].includes(property)) return 'typography';
    if (['margin', 'padding', 'gap'].includes(property) || property.startsWith('margin') || property.startsWith('padding')) return 'spacing';
    if (['borderRadius', 'borderWidth', 'borderColor'].includes(property)) return 'border';
    if (['width', 'height'].includes(property)) return 'size';
    if (['textAlign', 'justifyContent', 'alignItems'].includes(property)) return 'alignment';
    return 'layout';
  }

  /**
   * Severity calculation methods
   */
  private getColorSeverity(deltaE: number): MismatchSeverity {
    if (deltaE >= THRESHOLDS.color.critical) return 'critical';
    if (deltaE >= THRESHOLDS.color.major) return 'major';
    return 'minor';
  }

  private getFontSizeSeverity(diff: number): MismatchSeverity {
    if (diff >= THRESHOLDS.fontSize.critical) return 'critical';
    if (diff >= THRESHOLDS.fontSize.major) return 'major';
    return 'minor';
  }

  private getSpacingSeverity(diff: number): MismatchSeverity {
    if (diff >= THRESHOLDS.spacing.critical) return 'critical';
    if (diff >= THRESHOLDS.spacing.major) return 'major';
    return 'minor';
  }

  private getBorderRadiusSeverity(diff: number): MismatchSeverity {
    if (diff >= THRESHOLDS.borderRadius.critical) return 'critical';
    if (diff >= THRESHOLDS.borderRadius.major) return 'major';
    return 'minor';
  }

  private getLineHeightSeverity(diff: number): MismatchSeverity {
    if (diff >= THRESHOLDS.lineHeight.critical) return 'critical';
    if (diff >= THRESHOLDS.lineHeight.major) return 'major';
    return 'minor';
  }

  /**
   * Calculate scores per category
   */
  private calculateCategoryScores(): Record<MismatchCategory, number> {
    const categories: MismatchCategory[] = ['color', 'typography', 'spacing', 'layout', 'border', 'alignment', 'size'];
    const scores: Record<MismatchCategory, number> = {} as Record<MismatchCategory, number>;

    for (const category of categories) {
      const categoryMismatches = this.mismatches.filter(m => m.category === category);
      if (categoryMismatches.length === 0) {
        scores[category] = 100;
      } else {
        // Deduct points based on severity
        let deduction = 0;
        for (const mismatch of categoryMismatches) {
          switch (mismatch.severity) {
            case 'critical': deduction += 15; break;
            case 'major': deduction += 10; break;
            case 'minor': deduction += 5; break;
            case 'info': deduction += 2; break;
          }
        }
        scores[category] = Math.max(0, 100 - deduction);
      }
    }

    return scores;
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(categoryScores: Record<MismatchCategory, number>): number {
    const weights: Record<MismatchCategory, number> = {
      color: 0.2,
      typography: 0.2,
      spacing: 0.15,
      layout: 0.15,
      border: 0.1,
      alignment: 0.1,
      size: 0.1,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [category, score] of Object.entries(categoryScores)) {
      const weight = weights[category as MismatchCategory] || 0.1;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(): ComparisonResult['summary'] {
    return {
      total: this.mismatches.length,
      critical: this.mismatches.filter(m => m.severity === 'critical').length,
      major: this.mismatches.filter(m => m.severity === 'major').length,
      minor: this.mismatches.filter(m => m.severity === 'minor').length,
      info: this.mismatches.filter(m => m.severity === 'info').length,
    };
  }
}

// Export singleton instance
export const comparisonEngine = new ComparisonEngine();

export default ComparisonEngine;
