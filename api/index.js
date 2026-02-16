/**
 * API Server for UI Validator - Locator Extraction
 * Deployed on Railway
 */

import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'UI Validator API',
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Extract locators endpoint
app.post('/api/extract-locators', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  let browser = null;

  try {
    console.log(`Extracting locators from: ${url}`);
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Extract locators
    const locators = await page.evaluate(`
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

    const summary = {
      buttons: locators.filter(l => l.elementType === 'button').length,
      inputs: locators.filter(l => l.elementType === 'input').length,
      links: locators.filter(l => l.elementType === 'link').length,
      images: locators.filter(l => l.elementType === 'image').length,
      forms: locators.filter(l => l.elementType === 'form').length,
      containers: locators.filter(l => l.elementType === 'container').length,
      withId: locators.filter(l => l.id).length,
      withClass: locators.filter(l => l.className).length,
      withDataTestId: locators.filter(l => l.dataTestId).length,
    };

    res.json({
      success: true,
      result: {
        url,
        timestamp: new Date().toISOString(),
        totalElements: locators.length,
        locators,
        summary,
      },
    });
  } catch (error) {
    console.error('Extraction failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`UI Validator API running on port ${PORT}`);
});
