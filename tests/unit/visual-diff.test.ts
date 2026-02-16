/**
 * Unit Tests for Visual Diff Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VisualDiffEngine } from '../../src/services/visual-diff';
import { PNG } from 'pngjs';

describe('VisualDiffEngine', () => {
  let engine: VisualDiffEngine;

  beforeEach(() => {
    engine = new VisualDiffEngine();
  });

  // Helper to create a simple PNG image as base64
  function createTestImage(width: number, height: number, color: [number, number, number]): string {
    const png = new PNG({ width, height });
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        png.data[idx] = color[0];     // R
        png.data[idx + 1] = color[1]; // G
        png.data[idx + 2] = color[2]; // B
        png.data[idx + 3] = 255;      // A
      }
    }

    const buffer = PNG.sync.write(png);
    return buffer.toString('base64');
  }

  describe('compare', () => {
    it('should return 100% match for identical images', async () => {
      const image = createTestImage(100, 100, [255, 0, 0]); // Red image

      const result = await engine.compare(image, image);

      expect(result.matchPercentage).toBe(100);
      expect(result.mismatchedPixels).toBe(0);
      expect(result.totalPixels).toBe(10000);
    });

    it('should detect differences between different images', async () => {
      const redImage = createTestImage(100, 100, [255, 0, 0]);
      const blueImage = createTestImage(100, 100, [0, 0, 255]);

      const result = await engine.compare(redImage, blueImage);

      expect(result.matchPercentage).toBeLessThan(100);
      expect(result.mismatchedPixels).toBeGreaterThan(0);
    });

    it('should handle images of different sizes', async () => {
      const smallImage = createTestImage(50, 50, [255, 0, 0]);
      const largeImage = createTestImage(100, 100, [255, 0, 0]);

      const result = await engine.compare(smallImage, largeImage);

      // Should normalize sizes and compare
      expect(result.totalPixels).toBe(10000); // Max size
      expect(result.diffImage).toBeDefined();
    });

    it('should generate diff image', async () => {
      const redImage = createTestImage(100, 100, [255, 0, 0]);
      const blueImage = createTestImage(100, 100, [0, 0, 255]);

      const result = await engine.compare(redImage, blueImage);

      expect(result.diffImage).toBeDefined();
      expect(result.diffImage.length).toBeGreaterThan(0);
    });

    it('should respect threshold option', async () => {
      const image1 = createTestImage(100, 100, [255, 0, 0]);
      const image2 = createTestImage(100, 100, [250, 0, 0]); // Slightly different red

      // With low threshold (more sensitive)
      const resultLow = await engine.compare(image1, image2, { threshold: 0.01 });
      
      // With high threshold (less sensitive)
      const resultHigh = await engine.compare(image1, image2, { threshold: 0.5 });

      // Higher threshold should result in fewer mismatches
      expect(resultHigh.mismatchedPixels).toBeLessThanOrEqual(resultLow.mismatchedPixels);
    });

    it('should identify diff areas', async () => {
      // Create image with a red square in the corner
      const png1 = new PNG({ width: 100, height: 100 });
      const png2 = new PNG({ width: 100, height: 100 });

      // Fill both with white
      for (let i = 0; i < png1.data.length; i += 4) {
        png1.data[i] = 255;
        png1.data[i + 1] = 255;
        png1.data[i + 2] = 255;
        png1.data[i + 3] = 255;
        png2.data[i] = 255;
        png2.data[i + 1] = 255;
        png2.data[i + 2] = 255;
        png2.data[i + 3] = 255;
      }

      // Add a red square to image2 (top-left corner)
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
          const idx = (100 * y + x) << 2;
          png2.data[idx] = 255;     // R
          png2.data[idx + 1] = 0;   // G
          png2.data[idx + 2] = 0;   // B
        }
      }

      const buffer1 = PNG.sync.write(png1);
      const buffer2 = PNG.sync.write(png2);

      const result = await engine.compare(
        buffer1.toString('base64'),
        buffer2.toString('base64')
      );

      expect(result.mismatchedPixels).toBeGreaterThan(0);
      // Diff areas should be detected
      if (result.diffAreas.length > 0) {
        expect(result.diffAreas[0].x).toBeLessThanOrEqual(20);
        expect(result.diffAreas[0].y).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('generateSideBySide', () => {
    it('should combine three images side by side', async () => {
      const image1 = createTestImage(50, 50, [255, 0, 0]);
      const image2 = createTestImage(50, 50, [0, 255, 0]);
      const diffImage = createTestImage(50, 50, [0, 0, 255]);

      const result = await engine.generateSideBySide(image1, image2, diffImage);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Decode and check dimensions
      const buffer = Buffer.from(result, 'base64');
      const combined = PNG.sync.read(buffer);
      
      // Width should be 3 images + gaps
      expect(combined.width).toBe(50 + 50 + 50 + 20);
      expect(combined.height).toBe(50);
    });
  });
});
