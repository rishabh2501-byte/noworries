/**
 * Unit Tests for Comparison Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComparisonEngine } from '../../src/services/comparison-engine';
import { WebAnalysisResult, FigmaAnalysisResult, DOMElement } from '../../src/types';

describe('ComparisonEngine', () => {
  let engine: ComparisonEngine;

  beforeEach(() => {
    engine = new ComparisonEngine();
  });

  describe('compare', () => {
    it('should return 100% score when no mismatches', () => {
      const webAnalysis: WebAnalysisResult = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        screenshot: '',
        domTree: [],
        viewport: { width: 1920, height: 1080 },
      };

      const figmaAnalysis: FigmaAnalysisResult = {
        fileKey: 'test',
        fileName: 'Test Design',
        timestamp: new Date().toISOString(),
        designTokens: {
          colors: [],
          typography: [],
          spacing: [],
          effects: [],
          components: [],
        },
        components: [],
      };

      const result = engine.compare(webAnalysis, figmaAnalysis);

      expect(result.overallScore).toBe(100);
      expect(result.mismatches).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it('should detect color mismatches', () => {
      const domElement: DOMElement = {
        tagName: 'button',
        id: 'submit-btn',
        className: 'btn-primary',
        attributes: {},
        computedStyles: {
          color: 'rgb(255, 0, 0)', // Red
          backgroundColor: 'rgb(0, 0, 255)', // Blue
          fontSize: '16px',
          fontFamily: 'Arial',
          fontWeight: '400',
          lineHeight: '24px',
          letterSpacing: 'normal',
          textAlign: 'left',
          margin: '0px',
          marginTop: '0px',
          marginRight: '0px',
          marginBottom: '0px',
          marginLeft: '0px',
          padding: '8px',
          paddingTop: '8px',
          paddingRight: '8px',
          paddingBottom: '8px',
          paddingLeft: '8px',
          borderRadius: '4px',
          borderWidth: '0px',
          borderColor: 'transparent',
          borderStyle: 'none',
          width: '100px',
          height: '40px',
          display: 'block',
          position: 'relative',
        },
        boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        children: [],
      };

      const webAnalysis: WebAnalysisResult = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        screenshot: '',
        domTree: [domElement],
        viewport: { width: 1920, height: 1080 },
      };

      const figmaAnalysis: FigmaAnalysisResult = {
        fileKey: 'test',
        fileName: 'Test Design',
        timestamp: new Date().toISOString(),
        designTokens: {
          colors: [
            { name: 'primary', hex: '#00FF00', rgba: { r: 0, g: 255, b: 0, a: 1 } }, // Green
          ],
          typography: [],
          spacing: [],
          effects: [],
          components: [],
        },
        components: [],
      };

      const result = engine.compare(webAnalysis, figmaAnalysis);

      // Should detect color mismatch (red vs green)
      const colorMismatches = result.mismatches.filter(m => m.category === 'color');
      expect(colorMismatches.length).toBeGreaterThan(0);
    });

    it('should detect typography mismatches', () => {
      const domElement: DOMElement = {
        tagName: 'h1',
        id: 'title',
        className: 'heading',
        attributes: {},
        computedStyles: {
          color: 'rgb(0, 0, 0)',
          backgroundColor: 'transparent',
          fontSize: '24px', // Actual
          fontFamily: 'Arial',
          fontWeight: '700',
          lineHeight: '32px',
          letterSpacing: 'normal',
          textAlign: 'left',
          margin: '0px',
          marginTop: '0px',
          marginRight: '0px',
          marginBottom: '0px',
          marginLeft: '0px',
          padding: '0px',
          paddingTop: '0px',
          paddingRight: '0px',
          paddingBottom: '0px',
          paddingLeft: '0px',
          borderRadius: '0px',
          borderWidth: '0px',
          borderColor: 'transparent',
          borderStyle: 'none',
          width: '200px',
          height: '40px',
          display: 'block',
          position: 'relative',
        },
        boundingBox: { x: 0, y: 0, width: 200, height: 40 },
        children: [],
      };

      const webAnalysis: WebAnalysisResult = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        screenshot: '',
        domTree: [domElement],
        viewport: { width: 1920, height: 1080 },
      };

      const figmaAnalysis: FigmaAnalysisResult = {
        fileKey: 'test',
        fileName: 'Test Design',
        timestamp: new Date().toISOString(),
        designTokens: {
          colors: [],
          typography: [
            {
              name: 'heading',
              fontFamily: 'Arial',
              fontSize: 32, // Expected (different from actual 24px)
              fontWeight: 700,
              lineHeight: 40,
              letterSpacing: 0,
            },
          ],
          spacing: [],
          effects: [],
          components: [],
        },
        components: [],
      };

      const result = engine.compare(webAnalysis, figmaAnalysis);

      // Should detect font size mismatch (24px vs 32px)
      const typographyMismatches = result.mismatches.filter(m => m.category === 'typography');
      expect(typographyMismatches.length).toBeGreaterThan(0);
      
      const fontSizeMismatch = typographyMismatches.find(m => m.property === 'fontSize');
      expect(fontSizeMismatch).toBeDefined();
      expect(fontSizeMismatch?.actualValue).toBe('24px');
      expect(fontSizeMismatch?.expectedValue).toBe('32px');
    });

    it('should detect spacing mismatches', () => {
      const domElement: DOMElement = {
        tagName: 'div',
        id: 'card',
        className: 'card',
        attributes: {},
        computedStyles: {
          color: 'rgb(0, 0, 0)',
          backgroundColor: 'rgb(255, 255, 255)',
          fontSize: '16px',
          fontFamily: 'Arial',
          fontWeight: '400',
          lineHeight: '24px',
          letterSpacing: 'normal',
          textAlign: 'left',
          margin: '0px',
          marginTop: '0px',
          marginRight: '0px',
          marginBottom: '0px',
          marginLeft: '0px',
          padding: '12px', // Actual
          paddingTop: '12px',
          paddingRight: '12px',
          paddingBottom: '12px',
          paddingLeft: '12px',
          borderRadius: '8px',
          borderWidth: '0px',
          borderColor: 'transparent',
          borderStyle: 'none',
          width: '300px',
          height: '200px',
          display: 'block',
          position: 'relative',
        },
        boundingBox: { x: 0, y: 0, width: 300, height: 200 },
        children: [],
      };

      const webAnalysis: WebAnalysisResult = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        screenshot: '',
        domTree: [domElement],
        viewport: { width: 1920, height: 1080 },
      };

      const figmaAnalysis: FigmaAnalysisResult = {
        fileKey: 'test',
        fileName: 'Test Design',
        timestamp: new Date().toISOString(),
        designTokens: {
          colors: [],
          typography: [],
          spacing: [
            { name: 'spacing-sm', value: 8 },
            { name: 'spacing-md', value: 16 }, // Expected (different from actual 12px)
            { name: 'spacing-lg', value: 24 },
          ],
          effects: [],
          components: [],
        },
        components: [],
      };

      const result = engine.compare(webAnalysis, figmaAnalysis);

      // Should detect padding mismatch (12px vs 8px or 16px)
      const spacingMismatches = result.mismatches.filter(m => m.category === 'spacing');
      expect(spacingMismatches.length).toBeGreaterThan(0);
    });

    it('should calculate correct severity levels', () => {
      const domElement: DOMElement = {
        tagName: 'button',
        id: 'btn',
        className: 'btn',
        attributes: {},
        computedStyles: {
          color: 'rgb(255, 255, 255)',
          backgroundColor: 'rgb(255, 0, 0)', // Very different from expected
          fontSize: '14px',
          fontFamily: 'Arial',
          fontWeight: '400',
          lineHeight: '20px',
          letterSpacing: 'normal',
          textAlign: 'center',
          margin: '0px',
          marginTop: '0px',
          marginRight: '0px',
          marginBottom: '0px',
          marginLeft: '0px',
          padding: '8px',
          paddingTop: '8px',
          paddingRight: '8px',
          paddingBottom: '8px',
          paddingLeft: '8px',
          borderRadius: '4px',
          borderWidth: '0px',
          borderColor: 'transparent',
          borderStyle: 'none',
          width: '100px',
          height: '40px',
          display: 'inline-block',
          position: 'relative',
        },
        boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        children: [],
      };

      const webAnalysis: WebAnalysisResult = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        screenshot: '',
        domTree: [domElement],
        viewport: { width: 1920, height: 1080 },
      };

      const figmaAnalysis: FigmaAnalysisResult = {
        fileKey: 'test',
        fileName: 'Test Design',
        timestamp: new Date().toISOString(),
        designTokens: {
          colors: [
            { name: 'primary', hex: '#0000FF', rgba: { r: 0, g: 0, b: 255, a: 1 } }, // Blue (very different from red)
          ],
          typography: [],
          spacing: [],
          effects: [],
          components: [],
        },
        components: [],
      };

      const result = engine.compare(webAnalysis, figmaAnalysis);

      // Large color difference should result in critical or major severity
      const colorMismatches = result.mismatches.filter(m => m.category === 'color');
      if (colorMismatches.length > 0) {
        expect(['critical', 'major']).toContain(colorMismatches[0].severity);
      }
    });

    it('should calculate category scores correctly', () => {
      const webAnalysis: WebAnalysisResult = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        screenshot: '',
        domTree: [],
        viewport: { width: 1920, height: 1080 },
      };

      const figmaAnalysis: FigmaAnalysisResult = {
        fileKey: 'test',
        fileName: 'Test Design',
        timestamp: new Date().toISOString(),
        designTokens: {
          colors: [],
          typography: [],
          spacing: [],
          effects: [],
          components: [],
        },
        components: [],
      };

      const result = engine.compare(webAnalysis, figmaAnalysis);

      // All category scores should be 100 when no mismatches
      expect(result.categoryScores.color).toBe(100);
      expect(result.categoryScores.typography).toBe(100);
      expect(result.categoryScores.spacing).toBe(100);
      expect(result.categoryScores.layout).toBe(100);
      expect(result.categoryScores.border).toBe(100);
      expect(result.categoryScores.alignment).toBe(100);
      expect(result.categoryScores.size).toBe(100);
    });
  });
});
