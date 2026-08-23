import { logError } from '@/lib/client-logger';
// Document generation utilities for PDF and Word export

import { Correspondence, Minute } from './npa-structure';
import { getUserById, getDivisionById } from './npa-structure';
import { buildExportDocumentCss, DOC_PAPER, SEAL_PANEL_BG } from './theme-colors';

export interface DocumentContent {
  correspondence: Correspondence;
  minutes: Minute[];
  documentContentHtml?: string; // From DMS editor
  attachmentFileName?: string;
  /** Canonical download ids — never pass raw /media URLs. */
  attachmentId?: string;
  documentVersionId?: string;
}

/**
 * Generate PDF content as HTML string for printing/downloading
 */
export function generateDocumentHTML(content: DocumentContent): string {
  const { correspondence, minutes, documentContentHtml, attachmentFileName } = content;
  
  // Prefer composed HTML (DMS / minutes) — binary files use canonical download helpers.
  if (documentContentHtml) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${correspondence.referenceNumber} - ${correspondence.subject}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          ${buildExportDocumentCss()}
        </style>
      </head>
      <body>
        ${documentContentHtml}
      </body>
      </html>
    `;
  }
  
  // Priority 3: Show treatment response if available
  const treatmentResponse = (correspondence as Correspondence & { treatmentResponse?: string })?.treatmentResponse;
  if (treatmentResponse) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${correspondence.referenceNumber} - ${correspondence.subject}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          ${buildExportDocumentCss()}
          .summary-label { font-weight: bold; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid ${DOC_PAPER.border}; color: ${DOC_PAPER.muted}; }
          .summary-content { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="summary-label">Treatment Response</div>
        <div class="summary-content">${treatmentResponse}</div>
      </body>
      </html>
    `;
  }
  
  // No document available - show message
  const division = getDivisionById(correspondence.divisionId);
  
  const minutesHTML = minutes.map((minute, _idx) => {
    const user = getUserById(minute.userId);
    const isDownward = minute.direction === 'downward';
    const borderColor = isDownward ? 'hsl(210 85% 55%)' : 'hsl(145 65% 45%)';
    const badgeBg = isDownward ? 'hsl(210 85% 55% / 0.2)' : 'hsl(145 65% 45% / 0.2)';
    
    return `
      <div class="minute-item" style="border-left: 4px solid ${borderColor};">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <div>
            <strong>${user?.name || 'Unknown'}</strong>
            <div class="minute-meta">
              ${user?.systemRole || ''} • ${minute.gradeLevel}
            </div>
          </div>
          <div class="minute-meta">
            ${minute.timestamp ? new Date(minute.timestamp).toISOString() : ''}
          </div>
        </div>
        <div style="margin-bottom: 8px;">
          <span class="minute-badge" style="background: ${badgeBg};">
            ${isDownward ? '↓ Downward' : '↑ Upward'}
          </span>
          <span class="minute-badge minute-badge-neutral">
            ${minute.actionType}
          </span>
        </div>
        <div style="white-space: pre-wrap; line-height: 1.6;">${minute.minuteText}</div>
      </div>
    `;
  }).join('');

  const documentBody = `
    <div class="content" style="margin: 0; padding: 60px 40px; text-align: center; color: ${DOC_PAPER.muted};">
      <p style="font-size: 18px; margin-bottom: 10px; color: inherit;">No document preview available</p>
      <p style="font-size: 14px; color: ${DOC_PAPER.muted};">
        No document has been uploaded or linked to this correspondence.
      </p>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${correspondence.referenceNumber} - ${correspondence.subject}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body {
          font-family: 'Times New Roman', serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          line-height: 1.6;
          background: ${DOC_PAPER.background};
          color: ${DOC_PAPER.foreground};
        }
        .header {
          border-bottom: 2px solid ${DOC_PAPER.foreground};
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
          font-weight: bold;
          color: inherit;
        }
        .meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 20px 0;
          font-size: 14px;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        .meta-label {
          font-weight: bold;
          color: ${DOC_PAPER.muted};
          font-size: 12px;
          margin-bottom: 4px;
        }
        .content {
          margin: 30px 0;
          line-height: 1.8;
          color: inherit;
        }
        .minutes-section {
          margin-top: 40px;
          border-top: 2px solid ${DOC_PAPER.border};
          padding-top: 30px;
        }
        .minutes-section h2 {
          font-size: 18px;
          margin-bottom: 20px;
          color: inherit;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid ${DOC_PAPER.border};
          font-size: 12px;
          color: ${DOC_PAPER.muted};
          text-align: center;
        }
        .minute-item {
          margin-bottom: 20px;
          padding: 15px;
          background: ${SEAL_PANEL_BG};
          color: ${DOC_PAPER.foreground};
        }
        .minute-meta {
          font-size: 12px;
          color: ${DOC_PAPER.muted};
        }
        .minute-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          margin-right: 8px;
        }
        .minute-badge-neutral {
          background: ${DOC_PAPER.border};
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>NIGERIAN PORTS AUTHORITY</h1>
        <div style="font-size: 14px; color: ${DOC_PAPER.muted};">
          ${division?.name || 'Corporate Services'}
        </div>
      </div>

      <div class="meta">
        <div class="meta-item">
          <div class="meta-label">Reference Number</div>
          <div>${correspondence.referenceNumber}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Date Received</div>
          <div>${correspondence.receivedDate || ''}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">From</div>
          <div>${correspondence.senderName}${correspondence.senderOrganization ? ` (${correspondence.senderOrganization})` : ''}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Priority</div>
          <div style="text-transform: uppercase;">${correspondence.priority}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Status</div>
          <div style="text-transform: capitalize;">${correspondence.status.replace('-', ' ')}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Direction</div>
          <div style="text-transform: capitalize;">${correspondence.direction}</div>
        </div>
      </div>

      ${documentBody}

      ${minutes.length > 0 ? `
        <div class="minutes-section">
          <h2>Minute Thread</h2>
          ${minutesHTML}
        </div>
      ` : ''}

      <div class="footer">
        <div>Generated on ${new Date().toISOString()}</div>
        <div>Nigerian Ports Authority - Electronic Content Management System</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Download file via canonical APIs when ids are present; otherwise print composed HTML.
 */
export async function downloadAsPDF(content: DocumentContent): Promise<void> {
  const { attachmentFileName, attachmentId, documentVersionId } = content;
  const fileName =
    attachmentFileName ||
    `${content.correspondence.referenceNumber.replace(/\//g, '_')}.pdf`;

  try {
    if (documentVersionId) {
      const { downloadCanonicalDocument } = await import('@/lib/canonical-document');
      await downloadCanonicalDocument({
        kind: 'dms-version',
        versionId: documentVersionId,
        fileName,
      });
      return;
    }
    if (attachmentId) {
      const { downloadCanonicalDocument } = await import('@/lib/canonical-document');
      await downloadCanonicalDocument({
        kind: 'corr-attachment',
        attachmentId,
        fileName,
      });
      return;
    }
  } catch (err) {
    logError('Error downloading PDF via canonical API:', err);
  }

  const html = generateDocumentHTML(content);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    document.body.removeChild(iframe);
    alert('Unable to prepare print preview. Please refresh and try again.');
    return;
  }

  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();

  const triggerPrint = () => {
    frameWindow.focus();
    frameWindow.print();
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 400);
  };

  if (frameWindow.document.readyState === 'complete') {
    setTimeout(triggerPrint, 150);
  } else {
    iframe.onload = () => setTimeout(triggerPrint, 150);
  }
}

/**
 * Download as Word document via canonical API or HTML fallback.
 */
export async function downloadAsWord(content: DocumentContent): Promise<void> {
  const { attachmentFileName, attachmentId, documentVersionId } = content;
  const fileName =
    attachmentFileName ||
    `${content.correspondence.referenceNumber.replace(/\//g, '_')}.docx`;

  try {
    if (documentVersionId) {
      const { downloadCanonicalDocument } = await import('@/lib/canonical-document');
      await downloadCanonicalDocument({
        kind: 'dms-version',
        versionId: documentVersionId,
        fileName,
      });
      return;
    }
    if (attachmentId) {
      const { downloadCanonicalDocument } = await import('@/lib/canonical-document');
      await downloadCanonicalDocument({
        kind: 'corr-attachment',
        attachmentId,
        fileName,
      });
      return;
    }
  } catch (err) {
    logError('Error downloading Word via canonical API:', err);
  }

  const html = generateDocumentHTML(content);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${content.correspondence.referenceNumber.replace(/\//g, '_')}_${content.correspondence.subject
    .substring(0, 30)
    .replace(/[^a-z0-9]/gi, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/**
 * Show print preview
 */
export function showPrintPreview(content: DocumentContent): void {
  const html = generateDocumentHTML(content);
  const previewWindow = window.open('', '_blank', 'width=800,height=600');

  if (!previewWindow) {
    alert('Please allow popups to view print preview');
    return;
  }

  previewWindow.document.write(html);
  previewWindow.document.close();
}
