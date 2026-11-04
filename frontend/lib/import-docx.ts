/**
 * Import a .docx file into compose HTML via mammoth (lossy vs Word, editable in TipTap).
 */
import { convertDocxArrayBufferToHtml } from "@/lib/docx-to-html";
import { sanitizePastedRichText } from "@/lib/sanitize-html";

export async function importDocxFileToHtml(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".docx")) {
    throw new Error("Only .docx Word files can be imported for editing");
  }
  const html = sanitizePastedRichText(await convertDocxArrayBufferToHtml(await file.arrayBuffer()));
  if (!html.replace(/<[^>]+>/g, "").trim()) {
    throw new Error("No editable content found in that Word file");
  }
  return html;
}
