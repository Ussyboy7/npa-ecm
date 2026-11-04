/**
 * Convert .docx ArrayBuffer → HTML for in-app preview / import.
 * Embeds images as data URIs. Word often ships EMF/WMF drawings — convert those to PNG.
 */
import mammoth from "mammoth";
import { convertMetafileToDataUrl } from "emf-converter";

const METAFILE_TYPES = new Set([
  "image/x-emf",
  "image/emf",
  "image/x-wmf",
  "image/wmf",
  "image/x-ms-emf",
  "image/x-ms-wmf",
]);

function isMetafileContentType(contentType: string): boolean {
  const t = contentType.toLowerCase();
  return METAFILE_TYPES.has(t) || t.includes("emf") || t.includes("wmf");
}

type MammothImage = {
  contentType: string;
  readAsArrayBuffer: () => Promise<ArrayBuffer>;
  readAsBase64String: () => Promise<string>;
};

async function imageToSrc(image: MammothImage): Promise<{ src: string }> {
  const contentType = image.contentType || "application/octet-stream";

  if (isMetafileContentType(contentType)) {
    const buffer = await image.readAsArrayBuffer();
    const png = await convertMetafileToDataUrl(buffer, {
      maxWidth: 1600,
      maxHeight: 1600,
      dpiScale: 2,
    });
    if (png) return { src: png };
  }

  const b64 = await image.readAsBase64String();
  return { src: `data:${contentType};base64,${b64}` };
}

export async function convertDocxArrayBufferToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      includeDefaultStyleMap: true,
      convertImage: mammoth.images.imgElement((image) => imageToSrc(image as MammothImage)),
    },
  );
  return result.value || "";
}
