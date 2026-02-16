/**
 * Web Analyzer Service
 * Uses Playwright to capture screenshots, extract DOM tree, and computed CSS styles
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import {
  WebAnalysisResult,
  DOMElement,
  ComputedStyleData,
  LocatorExtractionResult,
  ElementLocator,
} from '../../types';

export interface WebAnalyzerOptions {
  viewport?: {
    width: number;
    height: number;
  };
  timeout?: number;
  waitForSelector?: string;
  headless?: boolean;
  userAgent?: string;
  cookies?: Array<{
    name: string;
    value: string;
    domain: string;
    path?: string;
  }>;
}

const DEFAULT_OPTIONS: WebAnalyzerOptions = {
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  headless: true,
};

export class WebAnalyzer {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * Initialize the browser instance
   */
  async initialize(options: WebAnalyzerOptions = {}): Promise<void> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    this.browser = await chromium.launch({
      headless: mergedOptions.headless,
    });

    this.context = await this.browser.newContext({
      viewport: mergedOptions.viewport,
      userAgent: mergedOptions.userAgent,
    });

    // Set cookies if provided (for authenticated sessions)
    if (mergedOptions.cookies && mergedOptions.cookies.length > 0) {
      await this.context.addCookies(mergedOptions.cookies);
    }

    this.page = await this.context.newPage();
  }

  /**
   * Analyze a web page by URL
   */
  async analyzeUrl(url: string, options: WebAnalyzerOptions = {}): Promise<WebAnalysisResult> {
    if (!this.page) {
      await this.initialize(options);
    }

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    try {
      // Navigate to the URL
      await this.page!.goto(url, {
        waitUntil: 'networkidle',
        timeout: mergedOptions.timeout,
      });

      // Wait for specific selector if provided
      if (mergedOptions.waitForSelector) {
        await this.page!.waitForSelector(mergedOptions.waitForSelector, {
          timeout: mergedOptions.timeout,
        });
      }

      // Capture screenshot
      const screenshotBuffer = await this.page!.screenshot({
        fullPage: false,
        type: 'png',
      });
      const screenshotBase64 = screenshotBuffer.toString('base64');

      // Extract DOM tree with computed styles
      const domTree = await this.extractDOMTree();

      // Get viewport info
      const viewportSize = this.page!.viewportSize() || mergedOptions.viewport!;

      return {
        url,
        timestamp: new Date().toISOString(),
        screenshot: screenshotBase64,
        domTree,
        viewport: viewportSize,
      };
    } catch (error) {
      throw new Error(`Failed to analyze URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze from a screenshot file (Base64)
   */
  async analyzeScreenshot(screenshotBase64: string): Promise<WebAnalysisResult> {
    return {
      url: 'screenshot-upload',
      timestamp: new Date().toISOString(),
      screenshot: screenshotBase64,
      domTree: [], // No DOM available for uploaded screenshots
      viewport: { width: 0, height: 0 }, // Will be determined from image
    };
  }

  /**
   * Extract DOM tree with computed styles from the page
   */
  private async extractDOMTree(): Promise<DOMElement[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const domTree = await this.page.evaluate(() => {
      const getComputedStyleData = (element: Element): Record<string, string> => {
        const computed = window.getComputedStyle(element);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize,
          fontFamily: computed.fontFamily,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,
          textAlign: computed.textAlign,
          margin: computed.margin,
          marginTop: computed.marginTop,
          marginRight: computed.marginRight,
          marginBottom: computed.marginBottom,
          marginLeft: computed.marginLeft,
          padding: computed.padding,
          paddingTop: computed.paddingTop,
          paddingRight: computed.paddingRight,
          paddingBottom: computed.paddingBottom,
          paddingLeft: computed.paddingLeft,
          borderRadius: computed.borderRadius,
          borderWidth: computed.borderWidth,
          borderColor: computed.borderColor,
          borderStyle: computed.borderStyle,
          width: computed.width,
          height: computed.height,
          display: computed.display,
          position: computed.position,
          flexDirection: computed.flexDirection,
          justifyContent: computed.justifyContent,
          alignItems: computed.alignItems,
          gap: computed.gap,
        };
      };

      const getBoundingBox = (element: Element): { x: number; y: number; width: number; height: number } => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      };

      const getAttributes = (element: Element): Record<string, string> => {
        const attrs: Record<string, string> = {};
        for (const attr of element.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      };

      const processElement = (element: Element, depth: number = 0): any | null => {
        // Skip script, style, and hidden elements
        if (
          element.tagName === 'SCRIPT' ||
          element.tagName === 'STYLE' ||
          element.tagName === 'NOSCRIPT' ||
          element.tagName === 'META' ||
          element.tagName === 'LINK'
        ) {
          return null;
        }

        // Limit depth to prevent excessive recursion
        if (depth > 10) {
          return null;
        }

        const computed = window.getComputedStyle(element);
        
        // Skip invisible elements
        if (computed.display === 'none' || computed.visibility === 'hidden') {
          return null;
        }

        const children: any[] = [];
        for (const child of element.children) {
          const processedChild = processElement(child, depth + 1);
          if (processedChild) {
            children.push(processedChild);
          }
        }

        return {
          tagName: element.tagName.toLowerCase(),
          id: element.id || undefined,
          className: element.className || undefined,
          textContent: element.textContent?.trim().substring(0, 100) || undefined,
          attributes: getAttributes(element),
          computedStyles: getComputedStyleData(element),
          boundingBox: getBoundingBox(element),
          children,
        };
      };

      const body = document.body;
      const result: any[] = [];
      
      for (const child of body.children) {
        const processed = processElement(child);
        if (processed) {
          result.push(processed);
        }
      }

      return result;
    });

    return domTree as DOMElement[];
  }

  /**
   * Get specific element styles by selector
   */
  async getElementStyles(selector: string): Promise<ComputedStyleData | null> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const styles = await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;

      const computed = window.getComputedStyle(element);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        textAlign: computed.textAlign,
        margin: computed.margin,
        marginTop: computed.marginTop,
        marginRight: computed.marginRight,
        marginBottom: computed.marginBottom,
        marginLeft: computed.marginLeft,
        padding: computed.padding,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        borderRadius: computed.borderRadius,
        borderWidth: computed.borderWidth,
        borderColor: computed.borderColor,
        borderStyle: computed.borderStyle,
        width: computed.width,
        height: computed.height,
        display: computed.display,
        position: computed.position,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        gap: computed.gap,
      };
    }, selector);

    return styles as ComputedStyleData | null;
  }

  /**
   * Capture a screenshot of a specific element
   */
  async captureElementScreenshot(selector: string): Promise<string | null> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const element = await this.page.$(selector);
    if (!element) return null;

    const screenshotBuffer = await element.screenshot({ type: 'png' });
    return screenshotBuffer.toString('base64');
  }

  /**
   * Close the browser instance
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Check if browser is initialized
   */
  isInitialized(): boolean {
    return this.browser !== null && this.page !== null;
  }

  /**
   * Extract all locators from a URL
   */
  async extractLocators(url: string, options: WebAnalyzerOptions = {}): Promise<LocatorExtractionResult> {
    if (!this.page) {
      await this.initialize(options);
    }

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    try {
      await this.page!.goto(url, {
        waitUntil: 'networkidle',
        timeout: mergedOptions.timeout,
      });

      if (mergedOptions.waitForSelector) {
        await this.page!.waitForSelector(mergedOptions.waitForSelector, {
          timeout: mergedOptions.timeout,
        });
      }

      const locators = await this.page!.evaluate(`
        (function() {
          var results = [];

          function getXPath(element) {
            if (element.id) {
              return '//*[@id="' + element.id + '"]';
            }
            
            var parts = [];
            var current = element;
            
            while (current && current.nodeType === Node.ELEMENT_NODE) {
              var index = 1;
              var sibling = current.previousElementSibling;
              
              while (sibling) {
                if (sibling.tagName === current.tagName) {
                  index++;
                }
                sibling = sibling.previousElementSibling;
              }
              
              var tagName = current.tagName.toLowerCase();
              parts.unshift(tagName + '[' + index + ']');
              current = current.parentElement;
            }
            
            return '/' + parts.join('/');
          }

          function getCssSelector(element) {
            if (element.id) {
              return '#' + element.id;
            }
            
            var parts = [];
            var current = element;
            
            while (current && current.nodeType === Node.ELEMENT_NODE && current.tagName !== 'HTML') {
              var selector = current.tagName.toLowerCase();
              
              if (current.id) {
                selector = '#' + current.id;
                parts.unshift(selector);
                break;
              } else if (current.className && typeof current.className === 'string') {
                var classes = current.className.trim().split(/\\s+/).filter(function(c) { return c && !c.includes(':'); });
                if (classes.length > 0) {
                  selector += '.' + classes.slice(0, 2).join('.');
                }
              }
              
              var parent = current.parentElement;
              if (parent) {
                var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === current.tagName; });
                if (siblings.length > 1) {
                  var idx = siblings.indexOf(current) + 1;
                  selector += ':nth-of-type(' + idx + ')';
                }
              }
              
              parts.unshift(selector);
              current = current.parentElement;
            }
            
            return parts.join(' > ');
          }

          function getPlaywrightSelector(element) {
            var tag = element.tagName.toLowerCase();
            
            var testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id');
            if (testId) {
              return '[data-testid="' + testId + '"]';
            }
            
            if (element.id) {
              return '#' + element.id;
            }
            
            var role = element.getAttribute('role');
            var ariaLabel = element.getAttribute('aria-label');
            if (role && ariaLabel) {
              return tag + '[role="' + role + '"][aria-label="' + ariaLabel + '"]';
            }
            
            if ((tag === 'button' || tag === 'a') && element.textContent) {
              var text = element.textContent.trim().substring(0, 30);
              if (text) {
                return tag + ':has-text("' + text.replace(/"/g, '\\\\"') + '")';
              }
            }
            
            var placeholder = element.getAttribute('placeholder');
            if (tag === 'input' && placeholder) {
              return 'input[placeholder="' + placeholder + '"]';
            }
            
            var name = element.getAttribute('name');
            if (name) {
              return tag + '[name="' + name + '"]';
            }
            
            return getCssSelector(element);
          }

          function getElementType(element) {
            var tag = element.tagName.toLowerCase();
            var type = element.getAttribute('type');
            var role = element.getAttribute('role');
            
            if (tag === 'button' || role === 'button' || (tag === 'input' && type === 'submit')) {
              return 'button';
            }
            if (tag === 'input' || tag === 'textarea' || tag === 'select') {
              return 'input';
            }
            if (tag === 'a') {
              return 'link';
            }
            if (tag === 'img' || tag === 'svg' || tag === 'picture') {
              return 'image';
            }
            if (tag === 'form') {
              return 'form';
            }
            if (['div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside'].indexOf(tag) !== -1) {
              return 'container';
            }
            if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label'].indexOf(tag) !== -1) {
              return 'text';
            }
            return 'other';
          }

          function isInteractive(element) {
            var tag = element.tagName.toLowerCase();
            var role = element.getAttribute('role');
            var tabIndex = element.getAttribute('tabindex');
            var onclick = element.getAttribute('onclick');
            
            var interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'details', 'summary'];
            var interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'textbox', 'combobox', 'listbox', 'menu', 'menuitem', 'tab', 'switch'];
            
            return interactiveTags.indexOf(tag) !== -1 || 
                   (role !== null && interactiveRoles.indexOf(role) !== -1) || 
                   tabIndex !== null || 
                   onclick !== null;
          }

          function getAttributes(element) {
            var attrs = {};
            for (var i = 0; i < element.attributes.length; i++) {
              var attr = element.attributes[i];
              attrs[attr.name] = attr.value;
            }
            return attrs;
          }

          function processElement(element, depth) {
            depth = depth || 0;
            if (depth > 15) return;
            
            var tag = element.tagName.toLowerCase();
            
            if (['script', 'style', 'noscript', 'meta', 'link', 'head'].indexOf(tag) !== -1) {
              return;
            }
            
            var computed = window.getComputedStyle(element);
            if (computed.display === 'none' || computed.visibility === 'hidden') {
              return;
            }

            var rect = element.getBoundingClientRect();
            
            if (rect.width > 0 && rect.height > 0) {
              var id = element.id || undefined;
              var className = element.className && typeof element.className === 'string' ? element.className : undefined;
              var name = element.getAttribute('name') || undefined;
              var dataTestId = element.getAttribute('data-testid') || element.getAttribute('data-test-id') || undefined;
              var ariaLabel = element.getAttribute('aria-label') || undefined;
              var textContent = element.textContent ? element.textContent.trim().substring(0, 50) : undefined;

              results.push({
                tagName: tag,
                id: id,
                className: className,
                name: name,
                dataTestId: dataTestId,
                ariaLabel: ariaLabel,
                text: textContent,
                xpath: getXPath(element),
                cssSelector: getCssSelector(element),
                playwrightSelector: getPlaywrightSelector(element),
                boundingBox: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height
                },
                attributes: getAttributes(element),
                isInteractive: isInteractive(element),
                elementType: getElementType(element)
              });
            }

            for (var i = 0; i < element.children.length; i++) {
              processElement(element.children[i], depth + 1);
            }
          }

          processElement(document.body);
          return results;
        })()
      `);

      // Calculate summary
      const typedLocators = locators as ElementLocator[];
      const summary = {
        buttons: typedLocators.filter((l) => l.elementType === 'button').length,
        inputs: typedLocators.filter((l) => l.elementType === 'input').length,
        links: typedLocators.filter((l) => l.elementType === 'link').length,
        images: typedLocators.filter((l) => l.elementType === 'image').length,
        forms: typedLocators.filter((l) => l.elementType === 'form').length,
        containers: typedLocators.filter((l) => l.elementType === 'container').length,
        withId: typedLocators.filter((l) => l.id).length,
        withClass: typedLocators.filter((l) => l.className).length,
        withDataTestId: typedLocators.filter((l) => l.dataTestId).length,
      };

      return {
        url,
        timestamp: new Date().toISOString(),
        totalElements: typedLocators.length,
        locators: locators as ElementLocator[],
        summary,
      };
    } catch (error) {
      throw new Error(`Failed to extract locators: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const webAnalyzer = new WebAnalyzer();

export default WebAnalyzer;
