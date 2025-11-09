// Document generation utilities for PDF and Word export

import { Correspondence, Minute } from './npa-structure';
import { getUserById, getDivisionById } from './npa-structure';

export interface DocumentContent {
  correspondence: Correspondence;
  minutes: Minute[];
}

/**
 * Generate PDF content as HTML string for printing/downloading
 */
export function generateDocumentHTML(content: DocumentContent): string {
  const { correspondence, minutes } = content;
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

      <div class="content">
        <h2 style="font-size: 18px; margin-bottom: 15px;">Subject: ${correspondence.subject}</h2>
        <div style="margin-top: 20px;">
          <p>Dear Sir/Madam,</p>
          <p style="text-indent: 30px; margin: 15px 0;">
            This is to formally bring to your attention the matter referenced above. 
            Following our previous communications and in accordance with established 
            procedures, we hereby request your urgent attention and appropriate action.
          </p>
          <p style="text-indent: 30px; margin: 15px 0;">
            The details of this correspondence require careful review and consideration 
            by your office. We trust that you will give this matter the priority it deserves 
            and provide the necessary guidance and approval as required.
          </p>
          <p style="text-indent: 30px; margin: 15px 0;">
            We await your favorable response and remain available for any clarifications 
            that may be required.
          </p>
          <p style="margin-top: 30px;">Yours faithfully,</p>
          <p style="margin-top: 20px; font-weight: bold;">${correspondence.senderName}</p>
        </div>
      </div>

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

