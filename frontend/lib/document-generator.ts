import { logError } from '@/lib/client-logger';
// Document generation utilities for PDF and Word export

import { Correspondence, Minute } from './npa-structure';
import { getUserById, getDivisionById } from './npa-structure';

export interface DocumentContent {
  correspondence: Correspondence;
  minutes: Minute[];
  documentContentHtml?: string; // From DMS editor
  attachmentUrl?: string; // First attachment file URL
  attachmentFileName?: string; // First attachment file name
}

/**
 * Generate PDF content as HTML string for printing/downloading
 */
export function generateDocumentHTML(content: DocumentContent): string {
  const { correspondence, minutes, documentContentHtml, attachmentUrl, attachmentFileName } = content;
  
  // Priority 1: If there's an uploaded attachment, show ONLY that - no metadata wrapper
  if (attachmentUrl) {
    const isPDF = attachmentFileName?.toLowerCase().endsWith('.pdf');
    const isImage = attachmentFileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    
    if (isPDF) {
      // For PDFs, return minimal HTML with just the PDF viewer
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${attachmentFileName || 'Document'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; overflow: hidden; }
            iframe { width: 100%; height: 100vh; border: none; }
          </style>
        </head>
        <body>
          <iframe 
            src="${attachmentUrl}" 
            title="Document Preview"
          ></iframe>
        </body>
        </html>
      `;
    } else if (isImage) {
      // For images, return minimal HTML with just the image
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${attachmentFileName || 'Document'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body>
          <img 
            src="${attachmentUrl}" 
            alt="${attachmentFileName || 'Document'}"
          />
        </body>
        </html>
      `;
    } else {
      // For other file types, show download link
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${attachmentFileName || 'Document'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f5f5f5; font-family: system-ui, -apple-system, sans-serif; }
            .container { text-align: center; padding: 40px; }
            h2 { margin-bottom: 20px; color: #1f2937; }
            a { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
            a:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${attachmentFileName || 'Document'}</h2>
            <a href="${attachmentUrl}" target="_blank">Download to view</a>
          </div>
        </body>
        </html>
      `;
    }
  }
  
  // Priority 2: Use DMS editor content if available
  if (documentContentHtml) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${correspondence.referenceNumber} - ${correspondence.subject}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        </style>
      </head>
      <body>
        ${documentContentHtml}
      </body>
      </html>
    `;
  }
  
  // No document available - show message
  const division = getDivisionById(correspondence.divisionId);
  
  const minutesHTML = minutes.map((minute, idx) => {
    const user = getUserById(minute.userId);
    const isDownward = minute.direction === 'downward';
    
    return `
      <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid ${isDownward ? '#3b82f6' : '#10b981'}; background: #f9fafb;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <div>
            <strong>${user?.name || 'Unknown'}</strong>
            <div style="font-size: 12px; color: #6b7280;">
              ${user?.systemRole || ''} • ${minute.gradeLevel}
            </div>
          </div>
          <div style="font-size: 12px; color: #6b7280;">
            ${new Date(minute.timestamp).toLocaleString()}
          </div>
        </div>
        <div style="margin-bottom: 8px;">
          <span style="background: ${isDownward ? '#dbeafe' : '#d1fae5'}; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 8px;">
            ${isDownward ? '↓ Downward' : '↑ Upward'}
          </span>
          <span style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
            ${minute.actionType}
          </span>
        </div>
        <div style="white-space: pre-wrap; line-height: 1.6;">${minute.minuteText}</div>
      </div>
    `;
  }).join('');

  const documentBody = `
    <div class="content" style="margin: 0; padding: 60px 40px; text-align: center;">
      <p style="font-size: 18px; color: #6b7280; margin-bottom: 10px;">No document preview available</p>
      <p style="font-size: 14px; color: #9ca3af;">
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
          color: #1f2937;
        }
        .header {
          border-bottom: 2px solid #1f2937;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
          font-weight: bold;
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
          color: #6b7280;
          font-size: 12px;
          margin-bottom: 4px;
        }
        .content {
          margin: 30px 0;
          line-height: 1.8;
        }
        .minutes-section {
          margin-top: 40px;
          border-top: 2px solid #e5e7eb;
          padding-top: 30px;
        }
        .minutes-section h2 {
          font-size: 18px;
          margin-bottom: 20px;
          color: #1f2937;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>NIGERIAN PORTS AUTHORITY</h1>
        <div style="font-size: 14px; color: #6b7280;">
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
          <div>${new Date(correspondence.receivedDate).toLocaleDateString()}</div>
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
        <div>Generated on ${new Date().toLocaleString()}</div>
        <div>Nigerian Ports Authority - Electronic Content Management System</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Download as PDF using browser print functionality
 */
export function downloadAsPDF(content: DocumentContent): void {
  const { attachmentUrl, attachmentFileName } = content;
  const isPDF = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.pdf');
  
  // If there's a PDF attachment, download it directly
  if (isPDF && attachmentUrl) {
    fetch(attachmentUrl, {
      credentials: 'include',
      headers: {
        'Accept': 'application/pdf',
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachmentFileName || `${content.correspondence.referenceNumber.replace(/\//g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 500);
      })
      .catch(err => {
        logError('Error downloading PDF:', err);
        // Fallback to print preview method
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
              iframe.parentNode.removeChild(iframe);
            }
          }, 400);
        };

        if (frameWindow.document.readyState === 'complete') {
          setTimeout(triggerPrint, 150);
        } else {
          iframe.onload = () => setTimeout(triggerPrint, 150);
        }
      });
    return;
  }
  
  // For non-PDF attachments or no attachment, use the print preview method
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
        iframe.parentNode.removeChild(iframe);
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
 * Download as Word document
 */
export function downloadAsWord(content: DocumentContent): void {
  const { attachmentUrl, attachmentFileName } = content;
  const isWordDocx = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.docx');
  const isWordDoc = attachmentUrl && attachmentFileName?.toLowerCase().endsWith('.doc');
  
  // If there's a Word attachment, download it directly
  if ((isWordDocx || isWordDoc) && attachmentUrl) {
    fetch(attachmentUrl, {
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to download Word document: ${response.status} ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachmentFileName || `${content.correspondence.referenceNumber.replace(/\//g, '_')}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 500);
      })
      .catch(err => {
        logError('Error downloading Word document:', err);
        // Fallback to generating Word document from HTML
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
      });
    return;
  }
  
  // For non-Word attachments or no attachment, generate Word document from HTML
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
