/**
 * Export Service
 * Generates PDF, JSON, and CSV reports from validation results
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ValidationReport,
  ExportFormat,
  ExportOptions,
} from '../../types';

export class ExportService {
  /**
   * Export validation report in specified format
   */
  async export(
    report: ValidationReport,
    options: ExportOptions
  ): Promise<{ data: string | Blob; filename: string; mimeType: string }> {
    switch (options.format) {
      case 'pdf':
        return this.exportPDF(report, options);
      case 'json':
        return this.exportJSON(report, options);
      case 'csv':
        return this.exportCSV(report, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export as PDF
   */
  private async exportPDF(
    report: ValidationReport,
    options: ExportOptions
  ): Promise<{ data: Blob; filename: string; mimeType: string }> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Title
    doc.setFontSize(24);
    doc.setTextColor(33, 33, 33);
    doc.text('UI Design Validation Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date(report.createdAt).toLocaleString()}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Report ID: ${report.id}`, 14, yPosition);
    yPosition += 10;

    // Sources
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text('Sources', 14, yPosition);
    yPosition += 6;
    doc.setFontSize(10);
    doc.setTextColor(66, 66, 66);
    doc.text(`Web: ${report.webSource.type === 'url' ? report.webSource.value : 'Screenshot Upload'}`, 14, yPosition);
    yPosition += 5;
    doc.text(`Figma: ${report.figmaSource.type === 'url' ? report.figmaSource.value : 'Screenshot Upload'}`, 14, yPosition);
    yPosition += 12;

    // Overall Score
    doc.setFontSize(16);
    doc.setTextColor(33, 33, 33);
    doc.text('Overall Match Score', 14, yPosition);
    yPosition += 10;

    const score = report.comparisonResult.overallScore;
    const scoreColor = score >= 80 ? [34, 197, 94] : score >= 60 ? [245, 158, 11] : [239, 68, 68];
    doc.setFontSize(36);
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(`${score}%`, 14, yPosition);
    yPosition += 15;

    // Summary Statistics
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text('Issue Summary', 14, yPosition);
    yPosition += 8;

    const summary = report.comparisonResult.summary;
    autoTable(doc, {
      startY: yPosition,
      head: [['Severity', 'Count']],
      body: [
        ['Critical', summary.critical.toString()],
        ['Major', summary.major.toString()],
        ['Minor', summary.minor.toString()],
        ['Info', summary.info.toString()],
        ['Total', summary.total.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233] },
      margin: { left: 14 },
      tableWidth: 80,
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Category Scores
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text('Category Scores', 14, yPosition);
    yPosition += 8;

    const categoryData = Object.entries(report.comparisonResult.categoryScores).map(
      ([category, categoryScore]) => [
        category.charAt(0).toUpperCase() + category.slice(1),
        `${categoryScore}%`,
      ]
    );

    autoTable(doc, {
      startY: yPosition,
      head: [['Category', 'Score']],
      body: categoryData,
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233] },
      margin: { left: 14 },
      tableWidth: 100,
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Mismatches Table
    if (report.comparisonResult.mismatches.length > 0) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text('Detailed Mismatches', 14, yPosition);
      yPosition += 10;

      const mismatchData = report.comparisonResult.mismatches.slice(0, 50).map((m) => [
        m.severity.toUpperCase(),
        m.category,
        m.property,
        m.expectedValue.substring(0, 20),
        m.actualValue.substring(0, 20),
        m.element.selector.substring(0, 25),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Severity', 'Category', 'Property', 'Expected', 'Actual', 'Element']],
        body: mismatchData,
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
          5: { cellWidth: 40 },
        },
      });
    }

    // LLM Analysis
    if (report.llmAnalysis) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text('AI Analysis', 14, yPosition);
      yPosition += 10;

      // Overall Assessment
      doc.setFontSize(10);
      doc.setTextColor(66, 66, 66);
      const assessmentLines = doc.splitTextToSize(report.llmAnalysis.overallAssessment, pageWidth - 28);
      doc.text(assessmentLines, 14, yPosition);
      yPosition += assessmentLines.length * 5 + 10;

      // Grouped Summary
      if (report.llmAnalysis.groupedSummary.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(33, 33, 33);
        doc.text('Issue Groups', 14, yPosition);
        yPosition += 8;

        for (const group of report.llmAnalysis.groupedSummary.slice(0, 5)) {
          doc.setFontSize(10);
          doc.setTextColor(33, 33, 33);
          doc.text(`• ${group.title}`, 14, yPosition);
          yPosition += 5;
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          const descLines = doc.splitTextToSize(group.description, pageWidth - 35);
          doc.text(descLines, 20, yPosition);
          yPosition += descLines.length * 4 + 5;
        }
      }

      // Suggested Fixes
      if (report.llmAnalysis.suggestedFixes.length > 0) {
        yPosition += 5;
        doc.setFontSize(12);
        doc.setTextColor(33, 33, 33);
        doc.text('Suggested Fixes', 14, yPosition);
        yPosition += 8;

        for (const fix of report.llmAnalysis.suggestedFixes.slice(0, 5)) {
          doc.setFontSize(9);
          doc.setTextColor(66, 66, 66);
          const fixLines = doc.splitTextToSize(`• ${fix.suggestion}`, pageWidth - 28);
          doc.text(fixLines, 14, yPosition);
          yPosition += fixLines.length * 4 + 3;
        }
      }
    }

    // Screenshots (if included)
    if (options.includeScreenshots && report.webAnalysis.screenshot) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text('Screenshots', 14, yPosition);
      yPosition += 10;

      try {
        // Web screenshot
        doc.setFontSize(10);
        doc.text('Actual UI:', 14, yPosition);
        yPosition += 5;
        doc.addImage(
          `data:image/png;base64,${report.webAnalysis.screenshot}`,
          'PNG',
          14,
          yPosition,
          80,
          60
        );
        yPosition += 65;

        // Figma screenshot (if available)
        if (report.figmaAnalysis.screenshot) {
          doc.text('Figma Design:', 14, yPosition);
          yPosition += 5;
          doc.addImage(
            `data:image/png;base64,${report.figmaAnalysis.screenshot}`,
            'PNG',
            14,
            yPosition,
            80,
            60
          );
        }
      } catch (error) {
        console.error('Failed to add screenshots to PDF:', error);
      }
    }

    // Diff Image (if included)
    if (options.includeDiffImage && report.visualDiff?.diffImage) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text('Visual Diff', 14, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(66, 66, 66);
      doc.text(`Match: ${report.visualDiff.matchPercentage}%`, 14, yPosition);
      yPosition += 5;
      doc.text(`Mismatched Pixels: ${report.visualDiff.mismatchedPixels.toLocaleString()}`, 14, yPosition);
      yPosition += 10;

      try {
        doc.addImage(
          `data:image/png;base64,${report.visualDiff.diffImage}`,
          'PNG',
          14,
          yPosition,
          pageWidth - 28,
          100
        );
      } catch (error) {
        console.error('Failed to add diff image to PDF:', error);
      }
    }

    const pdfBlob = doc.output('blob');
    const filename = `ui-validation-report-${report.id}.pdf`;

    return {
      data: pdfBlob,
      filename,
      mimeType: 'application/pdf',
    };
  }

  /**
   * Export as JSON
   */
  private async exportJSON(
    report: ValidationReport,
    options: ExportOptions
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    const exportData: any = {
      id: report.id,
      createdAt: report.createdAt,
      sources: {
        web: report.webSource,
        figma: report.figmaSource,
      },
      comparison: {
        overallScore: report.comparisonResult.overallScore,
        categoryScores: report.comparisonResult.categoryScores,
        summary: report.comparisonResult.summary,
        mismatches: report.comparisonResult.mismatches,
      },
      visualDiff: {
        matchPercentage: report.visualDiff?.matchPercentage,
        mismatchedPixels: report.visualDiff?.mismatchedPixels,
        totalPixels: report.visualDiff?.totalPixels,
        diffAreas: report.visualDiff?.diffAreas,
      },
      llmAnalysis: report.llmAnalysis,
    };

    if (options.includeScreenshots) {
      exportData.screenshots = {
        web: report.webAnalysis.screenshot,
        figma: report.figmaAnalysis.screenshot,
      };
    }

    if (options.includeDiffImage && report.visualDiff?.diffImage) {
      exportData.visualDiff.diffImage = report.visualDiff.diffImage;
    }

    if (options.includeRawData) {
      exportData.rawData = {
        webAnalysis: {
          url: report.webAnalysis.url,
          viewport: report.webAnalysis.viewport,
          domTree: report.webAnalysis.domTree,
        },
        figmaAnalysis: {
          fileKey: report.figmaAnalysis.fileKey,
          fileName: report.figmaAnalysis.fileName,
          designTokens: report.figmaAnalysis.designTokens,
          components: report.figmaAnalysis.components,
        },
      };
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const filename = `ui-validation-report-${report.id}.json`;

    return {
      data: jsonString,
      filename,
      mimeType: 'application/json',
    };
  }

  /**
   * Export as CSV
   */
  private async exportCSV(
    report: ValidationReport,
    _options: ExportOptions
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    const rows: string[][] = [];

    // Header
    rows.push([
      'ID',
      'Severity',
      'Category',
      'Property',
      'Expected Value',
      'Actual Value',
      'Element Selector',
      'Element Tag',
      'Deviation',
      'Figma Component',
    ]);

    // Data rows
    for (const mismatch of report.comparisonResult.mismatches) {
      rows.push([
        mismatch.id,
        mismatch.severity,
        mismatch.category,
        mismatch.property,
        this.escapeCSV(mismatch.expectedValue),
        this.escapeCSV(mismatch.actualValue),
        this.escapeCSV(mismatch.element.selector),
        mismatch.element.tagName,
        mismatch.deviation.toFixed(2),
        mismatch.figmaComponent || '',
      ]);
    }

    // Add summary section
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Overall Score', `${report.comparisonResult.overallScore}%`]);
    rows.push(['Total Issues', report.comparisonResult.summary.total.toString()]);
    rows.push(['Critical', report.comparisonResult.summary.critical.toString()]);
    rows.push(['Major', report.comparisonResult.summary.major.toString()]);
    rows.push(['Minor', report.comparisonResult.summary.minor.toString()]);
    rows.push(['Info', report.comparisonResult.summary.info.toString()]);

    // Add category scores
    rows.push([]);
    rows.push(['Category Scores']);
    for (const [category, score] of Object.entries(report.comparisonResult.categoryScores)) {
      rows.push([category, `${score}%`]);
    }

    // Visual diff info
    if (report.visualDiff) {
      rows.push([]);
      rows.push(['Visual Diff']);
      rows.push(['Match Percentage', `${report.visualDiff.matchPercentage}%`]);
      rows.push(['Mismatched Pixels', report.visualDiff.mismatchedPixels.toString()]);
      rows.push(['Total Pixels', report.visualDiff.totalPixels.toString()]);
    }

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const filename = `ui-validation-report-${report.id}.csv`;

    return {
      data: csvContent,
      filename,
      mimeType: 'text/csv',
    };
  }

  /**
   * Escape CSV field
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Generate filename with timestamp
   */
  generateFilename(format: ExportFormat, prefix: string = 'ui-validation'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}-${timestamp}.${format}`;
  }
}

// Export singleton instance
export const exportService = new ExportService();

export default ExportService;
