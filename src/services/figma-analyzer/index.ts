/**
 * Figma Analyzer Service
 * Extracts design tokens, colors, typography, spacing, and components from Figma files
 */

import axios, { AxiosInstance } from 'axios';
import {
  FigmaAnalysisResult,
  FigmaDesignTokens,
  FigmaColor,
  FigmaTypography,
  FigmaSpacing,
  FigmaEffect,
  FigmaComponent,
  ComputedStyleData,
} from '../../types';

interface FigmaAPINode {
  id: string;
  name: string;
  type: string;
  children?: FigmaAPINode[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fills?: Array<{
    type: string;
    color?: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
  }>;
  strokes?: Array<{
    type: string;
    color?: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
  }>;
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    lineHeightPx?: number;
    lineHeightPercent?: number;
    letterSpacing?: number;
    textAlignHorizontal?: string;
  };
  effects?: Array<{
    type: string;
    color?: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
    offset?: {
      x: number;
      y: number;
    };
    radius?: number;
    spread?: number;
  }>;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  layoutMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
}

interface FigmaFileResponse {
  name: string;
  document: FigmaAPINode;
  components: Record<string, { name: string; description: string }>;
  styles: Record<string, { name: string; styleType: string }>;
}

export class FigmaAnalyzer {
  private apiClient: AxiosInstance;

  constructor(accessToken: string) {
    this.apiClient = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': accessToken,
      },
    });
  }

  /**
   * Parse Figma URL to extract file key and node ID
   */
  static parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } {
    // Figma URL formats:
    // https://www.figma.com/file/FILEKEY/FileName
    // https://www.figma.com/file/FILEKEY/FileName?node-id=NODEID
    // https://www.figma.com/design/FILEKEY/FileName
    const fileMatch = url.match(/figma\.com\/(file|design)\/([a-zA-Z0-9]+)/);
    const nodeMatch = url.match(/node-id=([^&]+)/);

    if (!fileMatch) {
      throw new Error('Invalid Figma URL format');
    }

    return {
      fileKey: fileMatch[2],
      nodeId: nodeMatch ? decodeURIComponent(nodeMatch[1]) : undefined,
    };
  }

  /**
   * Analyze a Figma file by URL
   */
  async analyzeUrl(figmaUrl: string): Promise<FigmaAnalysisResult> {
    const { fileKey, nodeId } = FigmaAnalyzer.parseFigmaUrl(figmaUrl);
    return this.analyzeFile(fileKey, nodeId);
  }

  /**
   * Analyze a Figma file by file key
   */
  async analyzeFile(fileKey: string, nodeId?: string): Promise<FigmaAnalysisResult> {
    try {
      // Fetch file data
      const endpoint = nodeId 
        ? `/files/${fileKey}?ids=${nodeId}`
        : `/files/${fileKey}`;
      
      const response = await this.apiClient.get<FigmaFileResponse>(endpoint);
      const fileData = response.data;

      // Extract design tokens
      const designTokens = this.extractDesignTokens(fileData.document);

      // Extract components
      const components = this.extractComponents(fileData.document);

      return {
        fileKey,
        fileName: fileData.name,
        timestamp: new Date().toISOString(),
        designTokens,
        components,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new Error('Invalid Figma access token or insufficient permissions');
        }
        if (error.response?.status === 404) {
          throw new Error('Figma file not found');
        }
        throw new Error(`Figma API error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Analyze from an uploaded screenshot
   */
  async analyzeScreenshot(screenshotBase64: string): Promise<FigmaAnalysisResult> {
    // For screenshot uploads, we return a minimal result
    // The visual diff engine will handle the comparison
    return {
      fileKey: 'screenshot-upload',
      fileName: 'Uploaded Design',
      timestamp: new Date().toISOString(),
      screenshot: screenshotBase64,
      designTokens: {
        colors: [],
        typography: [],
        spacing: [],
        effects: [],
        components: [],
      },
      components: [],
    };
  }

  /**
   * Extract design tokens from Figma document
   */
  private extractDesignTokens(document: FigmaAPINode): FigmaDesignTokens {
    const colors: FigmaColor[] = [];
    const typography: FigmaTypography[] = [];
    const spacing: FigmaSpacing[] = [];
    const effects: FigmaEffect[] = [];
    const components: FigmaComponent[] = [];

    const colorSet = new Set<string>();
    const typographySet = new Set<string>();
    const spacingSet = new Set<string>();

    const processNode = (node: FigmaAPINode): void => {
      // Extract colors from fills
      if (node.fills) {
        for (const fill of node.fills) {
          if (fill.type === 'SOLID' && fill.color) {
            const hex = this.rgbaToHex(fill.color);
            if (!colorSet.has(hex)) {
              colorSet.add(hex);
              colors.push({
                name: `color-${colors.length + 1}`,
                hex,
                rgba: {
                  r: Math.round(fill.color.r * 255),
                  g: Math.round(fill.color.g * 255),
                  b: Math.round(fill.color.b * 255),
                  a: fill.color.a,
                },
              });
            }
          }
        }
      }

      // Extract colors from strokes
      if (node.strokes) {
        for (const stroke of node.strokes) {
          if (stroke.type === 'SOLID' && stroke.color) {
            const hex = this.rgbaToHex(stroke.color);
            if (!colorSet.has(hex)) {
              colorSet.add(hex);
              colors.push({
                name: `stroke-color-${colors.length + 1}`,
                hex,
                rgba: {
                  r: Math.round(stroke.color.r * 255),
                  g: Math.round(stroke.color.g * 255),
                  b: Math.round(stroke.color.b * 255),
                  a: stroke.color.a,
                },
              });
            }
          }
        }
      }

      // Extract typography
      if (node.style && node.style.fontFamily) {
        const typographyKey = `${node.style.fontFamily}-${node.style.fontSize}-${node.style.fontWeight}`;
        if (!typographySet.has(typographyKey)) {
          typographySet.add(typographyKey);
          typography.push({
            name: node.name || `typography-${typography.length + 1}`,
            fontFamily: node.style.fontFamily,
            fontSize: node.style.fontSize || 16,
            fontWeight: node.style.fontWeight || 400,
            lineHeight: node.style.lineHeightPx || node.style.lineHeightPercent || 'normal',
            letterSpacing: node.style.letterSpacing || 0,
            textAlign: node.style.textAlignHorizontal?.toLowerCase(),
          });
        }
      }

      // Extract spacing
      if (node.paddingLeft !== undefined || node.paddingTop !== undefined || node.itemSpacing !== undefined) {
        const spacingValues = [
          node.paddingLeft,
          node.paddingRight,
          node.paddingTop,
          node.paddingBottom,
          node.itemSpacing,
        ].filter((v): v is number => v !== undefined);

        for (const value of spacingValues) {
          const spacingKey = `${value}`;
          if (!spacingSet.has(spacingKey) && value > 0) {
            spacingSet.add(spacingKey);
            spacing.push({
              name: `spacing-${value}`,
              value,
            });
          }
        }
      }

      // Extract effects
      if (node.effects) {
        for (const effect of node.effects) {
          effects.push({
            name: `${effect.type.toLowerCase()}-${effects.length + 1}`,
            type: effect.type as FigmaEffect['type'],
            color: effect.color ? this.rgbaToHex(effect.color) : undefined,
            offset: effect.offset,
            radius: effect.radius,
            spread: effect.spread,
          });
        }
      }

      // Process children
      if (node.children) {
        for (const child of node.children) {
          processNode(child);
        }
      }
    };

    processNode(document);

    // Sort spacing values
    spacing.sort((a, b) => a.value - b.value);

    return {
      colors,
      typography,
      spacing,
      effects,
      components,
    };
  }

  /**
   * Extract components from Figma document
   */
  private extractComponents(document: FigmaAPINode): FigmaComponent[] {
    const components: FigmaComponent[] = [];

    const processNode = (node: FigmaAPINode, depth: number = 0): void => {
      // Limit depth to prevent excessive recursion
      if (depth > 5) return;

      // Extract component-like nodes (FRAME, COMPONENT, INSTANCE)
      if (['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'].includes(node.type)) {
        const component: FigmaComponent = {
          id: node.id,
          name: node.name,
          type: node.type,
          boundingBox: node.absoluteBoundingBox || { x: 0, y: 0, width: 0, height: 0 },
          styles: this.extractNodeStyles(node),
          children: [],
        };

        // Process children for nested components
        if (node.children) {
          for (const child of node.children) {
            const childComponent = this.processComponentNode(child, depth + 1);
            if (childComponent) {
              component.children!.push(childComponent);
            }
          }
        }

        components.push(component);
      }

      // Continue processing children
      if (node.children) {
        for (const child of node.children) {
          processNode(child, depth + 1);
        }
      }
    };

    processNode(document);
    return components;
  }

  /**
   * Process a single component node
   */
  private processComponentNode(node: FigmaAPINode, depth: number): FigmaComponent | null {
    if (depth > 5) return null;

    const component: FigmaComponent = {
      id: node.id,
      name: node.name,
      type: node.type,
      boundingBox: node.absoluteBoundingBox || { x: 0, y: 0, width: 0, height: 0 },
      styles: this.extractNodeStyles(node),
    };

    return component;
  }

  /**
   * Extract styles from a Figma node
   */
  private extractNodeStyles(node: FigmaAPINode): Partial<ComputedStyleData> {
    const styles: Partial<ComputedStyleData> = {};

    // Background color
    if (node.fills && node.fills.length > 0) {
      const solidFill = node.fills.find(f => f.type === 'SOLID' && f.color);
      if (solidFill?.color) {
        styles.backgroundColor = this.rgbaToHex(solidFill.color);
      }
    }

    // Border
    if (node.strokes && node.strokes.length > 0) {
      const solidStroke = node.strokes.find(s => s.type === 'SOLID' && s.color);
      if (solidStroke?.color) {
        styles.borderColor = this.rgbaToHex(solidStroke.color);
      }
    }
    if (node.strokeWeight) {
      styles.borderWidth = `${node.strokeWeight}px`;
    }

    // Border radius
    if (node.cornerRadius) {
      styles.borderRadius = `${node.cornerRadius}px`;
    } else if (node.rectangleCornerRadii) {
      styles.borderRadius = node.rectangleCornerRadii.map(r => `${r}px`).join(' ');
    }

    // Typography
    if (node.style) {
      if (node.style.fontFamily) styles.fontFamily = node.style.fontFamily;
      if (node.style.fontSize) styles.fontSize = `${node.style.fontSize}px`;
      if (node.style.fontWeight) styles.fontWeight = `${node.style.fontWeight}`;
      if (node.style.lineHeightPx) styles.lineHeight = `${node.style.lineHeightPx}px`;
      if (node.style.letterSpacing) styles.letterSpacing = `${node.style.letterSpacing}px`;
      if (node.style.textAlignHorizontal) styles.textAlign = node.style.textAlignHorizontal.toLowerCase();
    }

    // Padding
    if (node.paddingTop !== undefined) styles.paddingTop = `${node.paddingTop}px`;
    if (node.paddingRight !== undefined) styles.paddingRight = `${node.paddingRight}px`;
    if (node.paddingBottom !== undefined) styles.paddingBottom = `${node.paddingBottom}px`;
    if (node.paddingLeft !== undefined) styles.paddingLeft = `${node.paddingLeft}px`;

    // Layout
    if (node.layoutMode) {
      styles.display = 'flex';
      styles.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
    }
    if (node.itemSpacing !== undefined) {
      styles.gap = `${node.itemSpacing}px`;
    }

    // Size
    if (node.absoluteBoundingBox) {
      styles.width = `${node.absoluteBoundingBox.width}px`;
      styles.height = `${node.absoluteBoundingBox.height}px`;
    }

    return styles;
  }

  /**
   * Convert RGBA color to hex string
   */
  private rgbaToHex(color: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  /**
   * Get file thumbnail/preview image
   */
  async getFileImage(fileKey: string, nodeIds?: string[]): Promise<Record<string, string>> {
    try {
      const params: Record<string, string> = {
        format: 'png',
        scale: '1',
      };
      
      if (nodeIds && nodeIds.length > 0) {
        params.ids = nodeIds.join(',');
      }

      const response = await this.apiClient.get(`/images/${fileKey}`, { params });
      return response.data.images || {};
    } catch (error) {
      console.error('Failed to get Figma images:', error);
      return {};
    }
  }

  /**
   * Update access token
   */
  setAccessToken(token: string): void {
    this.apiClient.defaults.headers['X-Figma-Token'] = token;
  }
}

// Factory function to create analyzer instance
export function createFigmaAnalyzer(accessToken: string): FigmaAnalyzer {
  return new FigmaAnalyzer(accessToken);
}

export default FigmaAnalyzer;
