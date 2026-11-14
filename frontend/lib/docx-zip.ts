/**
 * Minimal ZIP reader for .docx parts (word/document.xml, word/styles.xml).
 * Browsers have no zip API, and pulling a zip library in just for two entries
 * would bloat the compose bundle — inflate with the platform DecompressionStream.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_SIZE = 22;
const MAX_COMMENT = 0xffff;

function findEndOfCentralDirectory(view: DataView): number {
  const lowest = Math.max(0, view.byteLength - EOCD_SIZE - MAX_COMMENT);
  for (let offset = view.byteLength - EOCD_SIZE; offset >= lowest; offset -= 1) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) return offset;
  }
  return -1;
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined" || typeof ReadableStream === "undefined") {
    throw new Error("This browser cannot decompress .docx files");
  }
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const reader = source
    .pipeThrough(new DecompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>)
    .getReader();

  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.length;
  }

  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Read one ZIP entry as UTF-8 text. Returns null when the entry is absent.
 * Supports stored (0) and deflate (8) entries — the two .docx writers emit.
 */
export async function readZipTextEntry(
  archive: ArrayBuffer | Uint8Array,
  entryName: string,
): Promise<string | null> {
  const bytes = archive instanceof Uint8Array ? archive : new Uint8Array(archive);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const eocd = findEndOfCentralDirectory(view);
  if (eocd < 0) return null;

  const entryCount = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);

  const decoder = new TextDecoder("utf-8");
  for (let i = 0; i < entryCount; i += 1) {
    if (cursor + 46 > view.byteLength) return null;
    if (view.getUint32(cursor, true) !== CENTRAL_SIGNATURE) return null;

    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);

    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    if (name === entryName) {
      if (view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) return null;
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const data = bytes.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return decoder.decode(data);
      if (method === 8) return decoder.decode(await inflateRaw(data));
      return null;
    }

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return null;
}
