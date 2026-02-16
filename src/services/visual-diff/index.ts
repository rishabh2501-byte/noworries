/**
 * Visual Diff Engine Service
 * Pixel-level comparison using pixelmatch
 */

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { VisualDiffResult, BoundingBox } from '../../types';

export interface VisualDiffOptions {
  threshold?: number; // Matching threshold (0 to 1). Smaller = more sensitive
  includeAA?: boolean; // Include anti-aliased pixels in diff
  alpha?: number; // Blending factor of unchanged pixels
  diffColor?: [number, number, number]; // Color of differing pixels [R, G, B]
  diffColorAlt?: [number, number, number]; // Alternative color for anti-aliased pixels
}

const DEFAULT_OPTIONS: VisualDiffOptions = {
  threshold: 0.1,
  includeAA: false,
  alpha: 0.1,
  diffColor: [255, 0, 0], // Red
  diffColorAlt: [255, 255, 0], // Yellow
};

export class VisualDiffEngine {
  /**
   * Compare two images and generate a diff
   */
  async compare(
    image1Base64: string,
    image2Base64: string,
    options: VisualDiffOptions = {}
  ): Promise<VisualDiffResult> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // Decode images
    const img1 = await this.decodeBase64Image(image1Base64);
    const img2 = await this.decodeBase64Image(image2Base64);

    // Resize images to match dimensions if needed
    const { width, height, resizedImg1, resizedImg2 } = this.normalizeImageSizes(img1, img2);

    // Create diff image
    const diff = new PNG({ width, height });

    // Run pixelmatch comparison
    const mismatchedPixels = pixelmatch(
      resizedImg1.data,
      resizedImg2.data,
      diff.data,
      width,
      height,
      {
        threshold: mergedOptions.threshold,
        includeAA: mergedOptions.includeAA,
        alpha: mergedOptions.alpha,
        diffColor: mergedOptions.diffColor,
        diffColorAlt: mergedOptions.diffColorAlt,
      }
    );

    const totalPixels = width * height;
    const matchPercentage = ((totalPixels - mismatchedPixels) / totalPixels) * 100;

    // Encode diff image to base64
    const diffImageBase64 = await this.encodeImageToBase64(diff);

    // Find diff areas (bounding boxes of mismatched regions)
    const diffAreas = this.findDiffAreas(diff, mismatchedPixels);

    return {
      diffImage: diffImageBase64,
      matchPercentage: Math.round(matchPercentage * 100) / 100,
      mismatchedPixels,
      totalPixels,
      diffAreas,
    };
  }

  /**
   * Decode base64 image to PNG
   */
  private async decodeBase64Image(base64: string): Promise<PNG> {
    return new Promise((resolve, reject) => {
      // Remove data URL prefix if present
      const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      const png = new PNG();
      png.parse(buffer, (error, data) => {
        if (error) {
          reject(new Error(`Failed to parse image: ${error.message}`));
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * Encode PNG to base64
   */
  private async encodeImageToBase64(png: PNG): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      png.pack()
        .on('data', (chunk: Buffer) => chunks.push(chunk))
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString('base64'));
        })
        .on('error', (error: Error) => {
          reject(new Error(`Failed to encode image: ${error.message}`));
        });
    });
  }

  /**
   * Normalize image sizes to match
   */
  private normalizeImageSizes(
    img1: PNG,
    img2: PNG
  ): { width: number; height: number; resizedImg1: PNG; resizedImg2: PNG } {
    const width = Math.max(img1.width, img2.width);
    const height = Math.max(img1.height, img2.height);

    // If images are already the same size, return as-is
    if (img1.width === img2.width && img1.height === img2.height) {
      return { width, height, resizedImg1: img1, resizedImg2: img2 };
    }

    // Create new images with normalized size
    const resizedImg1 = this.resizeImage(img1, width, height);
    const resizedImg2 = this.resizeImage(img2, width, height);

    return { width, height, resizedImg1, resizedImg2 };
  }

  /**
   * Resize image to target dimensions (simple nearest-neighbor)
   */
  private resizeImage(img: PNG, targetWidth: number, targetHeight: number): PNG {
    if (img.width === targetWidth && img.height === targetHeight) {
      return img;
    }

    const resized = new PNG({ width: targetWidth, height: targetHeight });

    // Fill with white background
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const idx = (targetWidth * y + x) << 2;
        resized.data[idx] = 255; // R
        resized.data[idx + 1] = 255; // G
        resized.data[idx + 2] = 255; // B
        resized.data[idx + 3] = 255; // A
      }
    }

    // Copy original image data
    for (let y = 0; y < img.height && y < targetHeight; y++) {
      for (let x = 0; x < img.width && x < targetWidth; x++) {
        const srcIdx = (img.width * y + x) << 2;
        const dstIdx = (targetWidth * y + x) << 2;
        resized.data[dstIdx] = img.data[srcIdx];
        resized.data[dstIdx + 1] = img.data[srcIdx + 1];
        resized.data[dstIdx + 2] = img.data[srcIdx + 2];
        resized.data[dstIdx + 3] = img.data[srcIdx + 3];
      }
    }

    return resized;
  }

  /**
   * Find bounding boxes of diff areas
   */
  private findDiffAreas(diffImage: PNG, mismatchedPixels: number): BoundingBox[] {
    if (mismatchedPixels === 0) {
      return [];
    }

    const { width, height, data } = diffImage;
    const visited = new Set<number>();
    const areas: BoundingBox[] = [];

    // Find connected regions of diff pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        const pixelKey = y * width + x;

        // Check if this is a diff pixel (red color)
        if (
          !visited.has(pixelKey) &&
          data[idx] === 255 && // R
          data[idx + 1] === 0 && // G
          data[idx + 2] === 0 // B
        ) {
          // Found a diff pixel, flood fill to find the region
          const region = this.floodFillRegion(diffImage, x, y, visited);
          if (region) {
            areas.push(region);
          }
        }
      }
    }

    // Merge overlapping or nearby regions
    return this.mergeNearbyRegions(areas, 20);
  }

  /**
   * Flood fill to find a connected diff region
   */
  private floodFillRegion(
    diffImage: PNG,
    startX: number,
    startY: number,
    visited: Set<number>
  ): BoundingBox | null {
    const { width, height, data } = diffImage;
    const stack: [number, number][] = [[startX, startY]];
    
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;
    let pixelCount = 0;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const pixelKey = y * width + x;

      if (
        x < 0 || x >= width ||
        y < 0 || y >= height ||
        visited.has(pixelKey)
      ) {
        continue;
      }

      const idx = (width * y + x) << 2;
      
      // Check if this is a diff pixel
      if (data[idx] !== 255 || data[idx + 1] !== 0 || data[idx + 2] !== 0) {
        continue;
      }

      visited.add(pixelKey);
      pixelCount++;

      // Update bounding box
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      // Add neighbors (4-connected)
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);

      // Limit stack size to prevent memory issues
      if (stack.length > 100000) {
        break;
      }
    }

    // Filter out very small regions (noise)
    if (pixelCount < 10) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  /**
   * Merge nearby or overlapping regions
   */
  private mergeNearbyRegions(regions: BoundingBox[], threshold: number): BoundingBox[] {
    if (regions.length <= 1) {
      return regions;
    }

    const merged: BoundingBox[] = [];
    const used = new Set<number>();

    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;

      let current = { ...regions[i] };
      used.add(i);

      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < regions.length; j++) {
          if (used.has(j)) continue;

          if (this.regionsOverlapOrNear(current, regions[j], threshold)) {
            current = this.mergeRegions(current, regions[j]);
            used.add(j);
            changed = true;
          }
        }
      }

      merged.push(current);
    }

    return merged;
  }

  /**
   * Check if two regions overlap or are within threshold distance
   */
  private regionsOverlapOrNear(a: BoundingBox, b: BoundingBox, threshold: number): boolean {
    const aRight = a.x + a.width;
    const aBottom = a.y + a.height;
    const bRight = b.x + b.width;
    const bBottom = b.y + b.height;

    return !(
      aRight + threshold < b.x ||
      bRight + threshold < a.x ||
      aBottom + threshold < b.y ||
      bBottom + threshold < a.y
    );
  }

  /**
   * Merge two regions into one
   */
  private mergeRegions(a: BoundingBox, b: BoundingBox): BoundingBox {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const right = Math.max(a.x + a.width, b.x + b.width);
    const bottom = Math.max(a.y + a.height, b.y + b.height);

    return {
      x,
      y,
      width: right - x,
      height: bottom - y,
    };
  }

  /**
   * Generate a side-by-side comparison image
   */
  async generateSideBySide(
    image1Base64: string,
    image2Base64: string,
    diffBase64: string
  ): Promise<string> {
    const img1 = await this.decodeBase64Image(image1Base64);
    const img2 = await this.decodeBase64Image(image2Base64);
    const diff = await this.decodeBase64Image(diffBase64);

    const maxHeight = Math.max(img1.height, img2.height, diff.height);
    const totalWidth = img1.width + img2.width + diff.width + 20; // 10px gap between each

    const combined = new PNG({ width: totalWidth, height: maxHeight });

    // Fill with white background
    for (let i = 0; i < combined.data.length; i += 4) {
      combined.data[i] = 245; // R (light gray)
      combined.data[i + 1] = 245; // G
      combined.data[i + 2] = 245; // B
      combined.data[i + 3] = 255; // A
    }

    // Copy image 1
    this.copyImageTo(combined, img1, 0, 0);

    // Copy image 2
    this.copyImageTo(combined, img2, img1.width + 10, 0);

    // Copy diff
    this.copyImageTo(combined, diff, img1.width + img2.width + 20, 0);

    return this.encodeImageToBase64(combined);
  }

  /**
   * Copy one image onto another at specified position
   */
  private copyImageTo(target: PNG, source: PNG, offsetX: number, offsetY: number): void {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const srcIdx = (source.width * y + x) << 2;
        const dstX = x + offsetX;
        const dstY = y + offsetY;

        if (dstX < target.width && dstY < target.height) {
          const dstIdx = (target.width * dstY + dstX) << 2;
          target.data[dstIdx] = source.data[srcIdx];
          target.data[dstIdx + 1] = source.data[srcIdx + 1];
          target.data[dstIdx + 2] = source.data[srcIdx + 2];
          target.data[dstIdx + 3] = source.data[srcIdx + 3];
        }
      }
    }
  }
}

// Export singleton instance
export const visualDiffEngine = new VisualDiffEngine();

export default VisualDiffEngine;
