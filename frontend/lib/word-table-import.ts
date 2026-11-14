/**
 * Restore Word table geometry and rules on imported .docx HTML.
 *
 * mammoth keeps the cell grid but drops `w:tblGrid` widths, table/cell borders,
 * cell padding, shading and the table style's header-row / banded-row formats.
 * NPA memo header tables therefore arrive boxed with equal columns.
 *
 * Column widths are emitted as a <colgroup>; the existing sanitizer turns those
 * into TipTap's first-row `colwidth` attributes.
 */
import type { WordFormattingSources } from "./word-xml";
import {
  childNamed,
  collectStyleBlocks,
  isOff,
  mergeStyleAttribute,
  normalizeHexColor,
  normalizeWordText,
  pxFromTwips,
  styleChain,
  twipsToPt,
  wordAttr,
} from "./word-xml";

type BorderValue = string | null;

type TableBorders = {
  top: BorderValue;
  right: BorderValue;
  bottom: BorderValue;
  left: BorderValue;
  insideH: BorderValue;
  insideV: BorderValue;
};

type CellBorders = Partial<Pick<TableBorders, "top" | "right" | "bottom" | "left">>;

type CellPadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type ConditionalFormat = {
  shading?: string;
  bold?: boolean;
  color?: string;
  borders: CellBorders;
};

type TableConditions = {
  firstRow: boolean;
  lastRow: boolean;
  firstColumn: boolean;
  lastColumn: boolean;
  bandHorz: boolean;
};

type WordCell = {
  text: string;
  continuation: boolean;
  shading?: string;
  valign?: string;
  padding?: Partial<CellPadding>;
  borders: CellBorders;
};

type WordTable = {
  rows: WordCell[][];
  /** Grid track widths in CSS px, or null when Word did not specify a grid. */
  columns: number[] | null;
  borders: TableBorders;
  align: "center" | "right" | null;
  indentPt: number | undefined;
  padding: Partial<CellPadding> | null;
  conditions: TableConditions;
  conditional: Map<string, ConditionalFormat>;
};

const NO_BORDERS: TableBorders = {
  top: null,
  right: null,
  bottom: null,
  left: null,
  insideH: null,
  insideV: null,
};

const BORDER_STYLE_MAP: Record<string, string> = {
  dashed: "dashed",
  dashDot: "dashed",
  dashDotDot: "dashed",
  dashSmallGap: "dashed",
  dotted: "dotted",
  double: "double",
  doubleWave: "double",
  thick: "solid",
  wave: "solid",
};

const NO_CONDITIONAL: ConditionalFormat = { borders: {} };

/** undefined = not specified (inherit), null = explicitly no border. */
function readBorderShorthand(side: Element | null): BorderValue | undefined {
  if (!side) return undefined;
  const val = (wordAttr(side, "val") || "").toLowerCase();
  if (!val || val === "none" || val === "nil") return null;

  const eighths = Number.parseFloat(wordAttr(side, "sz") || "4");
  const points = Number.isFinite(eighths) && eighths > 0 ? eighths / 8 : 0.5;
  const px = Math.max(1, Math.round(points * (96 / 72)));
  const cssStyle = BORDER_STYLE_MAP[wordAttr(side, "val") || ""] ?? "solid";
  const color = normalizeHexColor(wordAttr(side, "color")) ?? "#000000";
  return `${px}px ${cssStyle} ${color}`;
}

function readTableBorders(element: Element | null, base: TableBorders): TableBorders {
  if (!element) return base;
  const next: TableBorders = { ...base };
  const assign = (key: keyof TableBorders, node: Element | null) => {
    const value = readBorderShorthand(node);
    if (value !== undefined) next[key] = value;
  };
  assign("top", childNamed(element, "top"));
  assign("bottom", childNamed(element, "bottom"));
  assign("left", childNamed(element, "left") ?? childNamed(element, "start"));
  assign("right", childNamed(element, "right") ?? childNamed(element, "end"));
  assign("insideH", childNamed(element, "insideH"));
  assign("insideV", childNamed(element, "insideV"));
  return next;
}

function readCellBorders(element: Element | null): CellBorders {
  const borders: CellBorders = {};
  if (!element) return borders;
  const assign = (key: keyof CellBorders, node: Element | null) => {
    const value = readBorderShorthand(node);
    if (value !== undefined) borders[key] = value;
  };
  assign("top", childNamed(element, "top"));
  assign("bottom", childNamed(element, "bottom"));
  assign("left", childNamed(element, "left") ?? childNamed(element, "start"));
  assign("right", childNamed(element, "right") ?? childNamed(element, "end"));
  return borders;
}

/** `w:tcMar` / `w:tblCellMar`; only the sides the part sets. */
function readCellMargins(element: Element | null): Partial<CellPadding> | null {
  if (!element) return null;
  const side = (...names: string[]): number | undefined => {
    for (const name of names) {
      const value = pxFromTwips(wordAttr(childNamed(element, name), "w"));
      if (value !== undefined) return value;
    }
    return undefined;
  };
  const margins: Partial<CellPadding> = {};
  const top = side("top");
  const right = side("right", "end");
  const bottom = side("bottom");
  const left = side("left", "start");
  if (top !== undefined) margins.top = top;
  if (right !== undefined) margins.right = right;
  if (bottom !== undefined) margins.bottom = bottom;
  if (left !== undefined) margins.left = left;
  return Object.keys(margins).length ? margins : null;
}

/**
 * `w:tblLook` decides which table-style conditions apply. Word's default mask
 * (0x04A0) is header row + first column, horizontal banding on, vertical off.
 */
function readTableConditions(tblPr: Element | null): TableConditions {
  const look = childNamed(tblPr, "tblLook");
  const flag = (name: string, fallback: boolean): boolean => {
    const raw = wordAttr(look, name);
    if (raw === null) return fallback;
    const normalized = raw.toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "on";
  };
  return {
    firstRow: flag("firstRow", true),
    lastRow: flag("lastRow", false),
    firstColumn: flag("firstColumn", true),
    lastColumn: flag("lastColumn", false),
    bandHorz: !flag("noHBand", false),
  };
}

function readConditionalFormat(element: Element): ConditionalFormat {
  const tcPr = childNamed(element, "tcPr");
  const rPr = childNamed(element, "rPr");
  const bold = childNamed(rPr, "b");
  return {
    shading: normalizeHexColor(wordAttr(childNamed(tcPr, "shd"), "fill")),
    bold: bold ? !isOff(bold) : undefined,
    color: normalizeHexColor(wordAttr(childNamed(rPr, "color"), "val")),
    borders: readCellBorders(childNamed(tcPr, "tcBorders")),
  };
}

function collectConditionalFormats(
  tableStyleId: string | null,
  byId: ReturnType<typeof collectStyleBlocks>["byId"],
): Map<string, ConditionalFormat> {
  const map = new Map<string, ConditionalFormat>();
  for (const block of styleChain(tableStyleId, byId)) {
    if (!block.element) continue;
    for (const stylePr of Array.from(block.element.children)) {
      if (stylePr.localName !== "tblStylePr") continue;
      const type = wordAttr(stylePr, "type");
      if (!type) continue;
      const parsed = readConditionalFormat(stylePr);
      const previous = map.get(type);
      map.set(type, {
        shading: parsed.shading ?? previous?.shading,
        bold: parsed.bold ?? previous?.bold,
        color: parsed.color ?? previous?.color,
        borders: { ...previous?.borders, ...parsed.borders },
      });
    }
  }
  return map;
}

function isInFallback(element: Element): boolean {
  let parent = element.parentElement;
  while (parent) {
    if (parent.localName === "Fallback") return true;
    parent = parent.parentElement;
  }
  return false;
}

function cellText(cell: Element): string {
  return Array.from(cell.getElementsByTagName("*"))
    .filter((node) => node.localName === "t")
    .map((node) => node.textContent ?? "")
    .join("");
}

function collectColumns(table: Element): number[] | null {
  const grid = childNamed(table, "tblGrid");
  if (!grid) return null;
  const widths = Array.from(grid.children)
    .filter((child) => child.localName === "gridCol")
    .map((column) => pxFromTwips(wordAttr(column, "w")) ?? 0);
  if (!widths.length) return null;

  // Word occasionally omits widths for individual tracks; spread the rest evenly.
  const known = widths.filter((width) => width > 0);
  if (!known.length) return null;
  const average = Math.round(known.reduce((sum, width) => sum + width, 0) / known.length);
  return fitColumns(widths.map((width) => (width > 0 ? width : average)));
}

/**
 * A4 text width at the default 25mm side margins. The editor renders the page
 * at 96dpi, so a grid wider than this spills past the right margin.
 */
const COLUMN_BUDGET_PX = Math.floor(((210 - 25 - 25) / 25.4) * 96);

/**
 * Keep proportions but fit the page content width: TipTap renders the grid from
 * these px values, and a wider sum makes the table overflow and clip.
 */
function fitColumns(widths: number[]): number[] {
  const total = widths.reduce((sum, width) => sum + width, 0);
  if (total <= COLUMN_BUDGET_PX) return widths;
  const factor = COLUMN_BUDGET_PX / total;
  return widths.map((width) => Math.max(24, Math.round(width * factor)));
}

function collectWordTables(
  documentXml: string,
  stylesXml: string | null | undefined,
): WordTable[] {
  const parsed = new DOMParser().parseFromString(documentXml, "application/xml");
  if (parsed.querySelector("parsererror")) return [];

  const { byId } = collectStyleBlocks(stylesXml);
  const tables: WordTable[] = [];

  for (const table of Array.from(parsed.getElementsByTagName("*"))) {
    if (table.localName !== "tbl") continue;
    if (isInFallback(table)) continue;
    // Nested tables are rare and would break document-order pairing.
    if (table.parentElement?.closest("tbl")) continue;

    const tblPr = childNamed(table, "tblPr");
    const styleId = wordAttr(childNamed(tblPr, "tblStyle"), "val");

    let borders = NO_BORDERS;
    for (const block of styleChain(styleId, byId)) {
      borders = readTableBorders(childNamed(block.tblPr, "tblBorders"), borders);
    }
    borders = readTableBorders(childNamed(tblPr, "tblBorders"), borders);

    const tablePadding = readCellMargins(childNamed(tblPr, "tblCellMar"));

    const alignRaw = (wordAttr(childNamed(tblPr, "jc"), "val") || "").toLowerCase();
    const align =
      alignRaw === "center" ? "center" : alignRaw === "right" || alignRaw === "end" ? "right" : null;

    const rows: WordCell[][] = Array.from(table.children)
      .filter((child) => child.localName === "tr")
      .map((row) =>
        Array.from(row.children)
          .filter((child) => child.localName === "tc")
          .map((cell) => {
            const tcPr = childNamed(cell, "tcPr");
            const vMerge = childNamed(tcPr, "vMerge");
            const continuation =
              Boolean(vMerge) && (wordAttr(vMerge, "val") || "continue") !== "restart";
            const valignRaw = (wordAttr(childNamed(tcPr, "vAlign"), "val") || "").toLowerCase();
            return {
              text: cellText(cell),
              continuation,
              shading: normalizeHexColor(wordAttr(childNamed(tcPr, "shd"), "fill")),
              valign: /^(top|center|bottom)$/.test(valignRaw) ? valignRaw : undefined,
              padding: readCellMargins(childNamed(tcPr, "tcMar")) ?? undefined,
              borders: readCellBorders(childNamed(tcPr, "tcBorders")),
            } satisfies WordCell;
          }),
      );

    tables.push({
      rows,
      columns: collectColumns(table),
      borders,
      align,
      indentPt: twipsToPt(wordAttr(childNamed(tblPr, "tblInd"), "w")),
      padding: tablePadding,
      conditions: readTableConditions(tblPr),
      conditional: collectConditionalFormats(styleId, byId),
    });
  }

  return tables;
}

function tableText(table: WordTable): string {
  return table.rows.flat().map((cell) => cell.text).join("");
}

function countColumns(table: Element): number {
  let max = 0;
  for (const row of Array.from(table.querySelectorAll("tr"))) {
    const total = Array.from(row.children)
      .filter((cell) => /^(TD|TH)$/i.test(cell.tagName))
      .reduce((sum, cell) => {
        const span = Number.parseInt(cell.getAttribute("colspan") || "1", 10);
        return sum + (Number.isFinite(span) && span > 0 ? span : 1);
      }, 0);
    if (total > max) max = total;
  }
  return max;
}

function domRowsOf(table: Element): Element[] {
  return Array.from(table.querySelectorAll("tr")).filter((row) => row.closest("table") === table);
}

function cellsOf(row: Element): Element[] {
  return Array.from(row.children).filter((cell) => /^(TD|TH)$/i.test(cell.tagName));
}

/** Which table-style conditions apply to a cell (`firstRow`, `band1Horz`, …). */
function conditionsForCell(
  table: WordTable,
  rowIndex: number,
  cellIndex: number,
  rowCount: number,
  cellCount: number,
): ConditionalFormat[] {
  const { conditions, conditional } = table;
  const formats: ConditionalFormat[] = [];
  const lastRow = rowCount - 1;
  const isHeader = conditions.firstRow && rowIndex === 0;
  const isFooter = conditions.lastRow && rowIndex === lastRow;

  if (isHeader) formats.push(conditional.get("firstRow") ?? NO_CONDITIONAL);
  if (isFooter) formats.push(conditional.get("lastRow") ?? NO_CONDITIONAL);
  if (conditions.firstColumn && cellIndex === 0) {
    formats.push(conditional.get("firstColumn") ?? NO_CONDITIONAL);
  }
  if (conditions.lastColumn && cellIndex === cellCount - 1) {
    formats.push(conditional.get("lastColumn") ?? NO_CONDITIONAL);
  }

  if (conditions.bandHorz && !isHeader && !isFooter) {
    // Banding starts on the first body row when the table has a header row.
    const bandIndex = rowIndex - (conditions.firstRow ? 1 : 0);
    const type = bandIndex % 2 === 0 ? "band1Horz" : "band2Horz";
    formats.push(conditional.get(type) ?? NO_CONDITIONAL);
  }

  return formats;
}

/** Cell margins win per side, then the table's cell margins, then none. */
function paddingValue(
  cell: Partial<CellPadding> | null | undefined,
  table: Partial<CellPadding> | null | undefined,
): string | null {
  if (!cell && !table) return null;
  const top = cell?.top ?? table?.top ?? 0;
  const right = cell?.right ?? table?.right ?? 0;
  const bottom = cell?.bottom ?? table?.bottom ?? 0;
  const left = cell?.left ?? table?.left ?? 0;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}

function applyTable(doc: Document, domTable: Element, wordTable: WordTable): void {
  if (wordTable.columns && wordTable.columns.length === countColumns(domTable)) {
    const colgroup = doc.createElement("colgroup");
    for (const width of wordTable.columns) {
      const col = doc.createElement("col");
      col.setAttribute("style", `width: ${width}px`);
      colgroup.appendChild(col);
    }
    domTable.querySelector("colgroup")?.remove();
    domTable.insertBefore(colgroup, domTable.firstChild);
  }

  const domRows = domRowsOf(domTable);
  const lastRowIndex = domRows.length - 1;
  const cellEntries: Array<{ cell: Element; entries: Array<[string, string]> }> = [];
  let hasVisibleRule = false;

  // Edge cells take Word's outer rule, interior cells its inside rule.
  const side = (
    override: BorderValue | undefined,
    outer: BorderValue,
    inner: BorderValue,
  ): string => {
    if (override !== undefined) return override ?? "none";
    return outer ?? inner ?? "none";
  };

  domRows.forEach((domRow, rowIndex) => {
    const wordRow = wordTable.rows[rowIndex];
    if (!wordRow) return;
    const visible = wordRow.filter((cell) => !cell.continuation);

    cellsOf(domRow).forEach((cell, cellIndex) => {
      const spec = visible[cellIndex];
      if (!spec) return;

      // Table-style conditions (header row, banded rows) apply beneath direct cell formatting.
      const conditional = conditionsForCell(
        wordTable,
        rowIndex,
        cellIndex,
        domRows.length,
        visible.length,
      ).reduce<ConditionalFormat>(
        (merged, format) => ({
          shading: format.shading ?? merged.shading,
          bold: format.bold ?? merged.bold,
          color: format.color ?? merged.color,
          borders: { ...merged.borders, ...format.borders },
        }),
        { borders: {} },
      );

      const borders: CellBorders = { ...conditional.borders, ...spec.borders };
      const sides = [
        side(
          borders.top,
          rowIndex === 0 ? wordTable.borders.top : null,
          wordTable.borders.insideH,
        ),
        side(
          borders.bottom,
          rowIndex === lastRowIndex ? wordTable.borders.bottom : null,
          wordTable.borders.insideH,
        ),
        side(borders.left, cellIndex === 0 ? wordTable.borders.left : null, wordTable.borders.insideV),
        side(
          borders.right,
          cellIndex === visible.length - 1 ? wordTable.borders.right : null,
          wordTable.borders.insideV,
        ),
      ];
      if (sides.some((value) => value !== "none")) hasVisibleRule = true;

      const entries: Array<[string, string]> = [
        ["border-top", sides[0]],
        ["border-bottom", sides[1]],
        ["border-left", sides[2]],
        ["border-right", sides[3]],
      ];
      const padding = paddingValue(spec.padding, wordTable.padding);
      if (padding) entries.push(["padding", padding]);
      const shading = spec.shading ?? conditional.shading;
      if (shading) entries.push(["background-color", shading]);
      if (conditional.bold) entries.push(["font-weight", "700"]);
      if (conditional.color) entries.push(["color", conditional.color]);
      if (spec.valign) entries.push(["vertical-align", spec.valign]);
      cellEntries.push({ cell, entries });
    });
  });

  // A Word table that draws no rule on any side is a layout table (memo To/Date):
  // mark it so the editor does not draw its default cell boxes.
  const borderless = !hasVisibleRule;

  const tableEntries: Array<[string, string | null]> = [
    ["border-collapse", "collapse"],
    ["border", borderless ? "none" : null],
  ];
  if (wordTable.align === "center") {
    tableEntries.push(["margin-left", "auto"], ["margin-right", "auto"]);
  } else if (wordTable.align === "right") {
    tableEntries.push(["margin-left", "auto"]);
  } else if (wordTable.indentPt) {
    tableEntries.push(["margin-left", `${wordTable.indentPt}pt`]);
  }
  mergeStyleAttribute(domTable, tableEntries);
  if (borderless) domTable.setAttribute("data-borderless", "true");
  else domTable.removeAttribute("data-borderless");

  for (const { cell, entries } of cellEntries) {
    // Borderless tables leave cell borders to the editor's borderless rule.
    mergeStyleAttribute(
      cell,
      borderless ? entries.filter(([name]) => !name.startsWith("border")) : entries,
    );
  }
}

/**
 * Apply Word table borders, padding, shading, header/banding formats and column
 * widths to mammoth's tables. Returns the input unchanged when no table pairs.
 */
export function applyWordTableFormatting(html: string, sources: WordFormattingSources): string {
  if (!html.trim() || !sources.documentXml.trim()) return html;

  const tables = collectWordTables(sources.documentXml, sources.stylesXml);
  if (!tables.length) return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const domTables = Array.from(doc.querySelectorAll("table")).filter(
    (table) => !table.parentElement?.closest("table"),
  );

  let tableIndex = 0;
  for (const domTable of domTables) {
    const text = normalizeWordText(domTable.textContent || "");
    if (!text) continue;

    let match = -1;
    for (let index = tableIndex; index < Math.min(tables.length, tableIndex + 4); index += 1) {
      if (normalizeWordText(tableText(tables[index])) === text) {
        match = index;
        break;
      }
    }
    if (match < 0) continue;
    tableIndex = match + 1;

    applyTable(doc, domTable, tables[match]);
  }

  return doc.body.innerHTML;
}
