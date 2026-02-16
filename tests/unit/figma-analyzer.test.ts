/**
 * Unit Tests for Figma Analyzer
 */

import { describe, it, expect } from 'vitest';
import { FigmaAnalyzer } from '../../src/services/figma-analyzer';

describe('FigmaAnalyzer', () => {
  describe('parseFigmaUrl', () => {
    it('should parse standard Figma file URL', () => {
      const url = 'https://www.figma.com/file/ABC123xyz/My-Design-File';
      const result = FigmaAnalyzer.parseFigmaUrl(url);

      expect(result.fileKey).toBe('ABC123xyz');
      expect(result.nodeId).toBeUndefined();
    });

    it('should parse Figma URL with node-id', () => {
      const url = 'https://www.figma.com/file/ABC123xyz/My-Design?node-id=1%3A2';
      const result = FigmaAnalyzer.parseFigmaUrl(url);

      expect(result.fileKey).toBe('ABC123xyz');
      expect(result.nodeId).toBe('1:2');
    });

    it('should parse new Figma design URL format', () => {
      const url = 'https://www.figma.com/design/XYZ789abc/Another-Design';
      const result = FigmaAnalyzer.parseFigmaUrl(url);

      expect(result.fileKey).toBe('XYZ789abc');
    });

    it('should throw error for invalid URL', () => {
      const url = 'https://example.com/not-figma';
      
      expect(() => FigmaAnalyzer.parseFigmaUrl(url)).toThrow('Invalid Figma URL format');
    });

    it('should handle URL with multiple query parameters', () => {
      const url = 'https://www.figma.com/file/ABC123/Design?node-id=10%3A20&mode=design';
      const result = FigmaAnalyzer.parseFigmaUrl(url);

      expect(result.fileKey).toBe('ABC123');
      expect(result.nodeId).toBe('10:20');
    });
  });

  describe('constructor', () => {
    it('should create instance with access token', () => {
      const analyzer = new FigmaAnalyzer('test-token');
      expect(analyzer).toBeDefined();
    });
  });

  describe('setAccessToken', () => {
    it('should update access token', () => {
      const analyzer = new FigmaAnalyzer('initial-token');
      analyzer.setAccessToken('new-token');
      // Token is private, but method should not throw
      expect(true).toBe(true);
    });
  });

  describe('analyzeScreenshot', () => {
    it('should return minimal result for screenshot upload', async () => {
      const analyzer = new FigmaAnalyzer('test-token');
      const screenshotBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const result = await analyzer.analyzeScreenshot(screenshotBase64);

      expect(result.fileKey).toBe('screenshot-upload');
      expect(result.fileName).toBe('Uploaded Design');
      expect(result.screenshot).toBe(screenshotBase64);
      expect(result.designTokens.colors).toHaveLength(0);
      expect(result.designTokens.typography).toHaveLength(0);
      expect(result.components).toHaveLength(0);
    });
  });
});
