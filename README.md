# AI UI Design Validator

A **no-code desktop application** for QA engineers to validate actual UI against Figma designs. Built with Electron, React, TypeScript, and Playwright.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

- **Web Analysis**: Capture screenshots and extract DOM/CSS from any URL using Playwright
- **Figma Integration**: Extract design tokens (colors, typography, spacing) via Figma API
- **Rule-based Comparison**: Compare colors, fonts, spacing, layout, borders, and alignment
- **Visual Diff**: Pixel-level comparison using pixelmatch
- **AI-Powered Insights**: LLM-generated explanations, fix suggestions, and test recommendations
- **Multiple Export Formats**: PDF, JSON, CSV reports
- **CLI Support**: Automate validation in CI/CD pipelines

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd UiValidator

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Add your API keys to `.env`:
```env
# Figma API (required for URL-based Figma analysis)
FIGMA_ACCESS_TOKEN=your_figma_token

# LLM Provider (choose one)
OPENAI_API_KEY=your_openai_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key
# OR
HUGGINGFACE_API_KEY=your_huggingface_key

LLM_PROVIDER=openai
```

### Running the App

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Package as desktop app
npm run package
```

## Usage

### Desktop Application

1. **Enter Sources**:
   - Website URL OR upload a screenshot
   - Figma URL OR upload a design screenshot

2. **Click "Analyze"**

3. **View Results**:
   - Overall match score
   - Category-wise breakdown
   - Detailed mismatch list
   - Visual diff overlay
   - AI-generated insights

4. **Export Report**: PDF, JSON, or CSV

### CLI Mode

```bash
# Basic usage
npm run cli -- --site https://example.com --figma https://figma.com/file/ABC123/Design

# With options
npm run cli -- \
  --site https://example.com \
  --figma https://figma.com/file/ABC123/Design \
  --output ./reports \
  --format pdf \
  --viewport 1920x1080

# Using screenshots
npm run cli -- \
  --site-screenshot ./actual-ui.png \
  --figma-screenshot ./figma-design.png \
  --output ./reports
```

#### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --site <url>` | Website URL to validate | - |
| `-f, --figma <url>` | Figma design URL | - |
| `--site-screenshot <path>` | Path to website screenshot | - |
| `--figma-screenshot <path>` | Path to Figma screenshot | - |
| `-o, --output <path>` | Output directory | `./reports` |
| `--format <format>` | Export format (pdf/json/csv) | `json` |
| `--viewport <size>` | Viewport size (WxH) | `1920x1080` |
| `--headless` | Run browser headless | `true` |
| `--figma-token <token>` | Figma API token | env var |
| `--llm-provider <provider>` | LLM provider | `openai` |
| `--llm-key <key>` | LLM API key | env var |
| `--no-llm` | Skip LLM analysis | `false` |
| `-v, --verbose` | Verbose output | `false` |

## Architecture

```
src/
├── cli/                    # CLI interface
│   └── index.ts
├── components/             # React UI components
│   ├── InputScreen.tsx
│   ├── ResultsScreen.tsx
│   ├── SettingsScreen.tsx
│   └── Layout.tsx
├── electron/               # Electron main process
│   ├── main.ts
│   └── preload.ts
├── services/               # Core business logic
│   ├── web-analyzer/       # Playwright-based web analysis
│   ├── figma-analyzer/     # Figma API integration
│   ├── comparison-engine/  # Rule-based style comparison
│   ├── visual-diff/        # Pixelmatch integration
│   ├── llm-intelligence/   # AI analysis layer
│   ├── export/             # Report generation
│   └── validator/          # Main orchestrator
├── store/                  # Zustand state management
├── types/                  # TypeScript definitions
├── App.tsx
├── main.tsx
└── index.css
```

## Comparison Rules

The comparison engine checks:

| Category | Properties |
|----------|------------|
| **Color** | text color, background color, border color |
| **Typography** | font size, font family, font weight, line height, letter spacing |
| **Spacing** | margin, padding, gap |
| **Border** | border radius, border width |
| **Layout** | display, flex direction, alignment |
| **Size** | width, height |

### Severity Levels

- **Critical**: Large deviations (>20% color difference, >8px spacing)
- **Major**: Moderate deviations (10-20% color, 4-8px spacing)
- **Minor**: Small deviations (5-10% color, 2-4px spacing)
- **Info**: Negligible differences

## LLM Integration

The AI layer provides:

1. **Human-readable explanations**: "The button padding is 12px instead of 16px"
2. **Grouped issue summaries**: "Typography inconsistencies in header section"
3. **Developer fix suggestions**: "Use design token `spacing-md`"
4. **Test case recommendations**: "Add visual regression test for button hover"

Supported providers:
- OpenAI (GPT-4)
- Anthropic (Claude)
- HuggingFace

## Security

- **No login bypass**: The tool respects authentication
- **Secure input methods**:
  - Authenticated Playwright sessions (with cookies)
  - Screenshot uploads for protected pages
- **Local storage**: API keys stored locally, never transmitted except to respective APIs

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# With coverage
npm run test -- --coverage
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: UI Validation
on: [push]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npx playwright install chromium
      
      - name: Validate UI
        env:
          FIGMA_ACCESS_TOKEN: ${{ secrets.FIGMA_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_KEY }}
        run: |
          npm run cli -- \
            --site ${{ vars.STAGING_URL }} \
            --figma ${{ vars.FIGMA_DESIGN_URL }} \
            --format json \
            --output ./reports
      
      - uses: actions/upload-artifact@v3
        with:
          name: validation-report
          path: ./reports/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Create an issue for bugs or feature requests
- Check existing issues before creating new ones
