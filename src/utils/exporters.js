/**
 * Report export to Excel (.xlsx) and Word (.docx).
 *
 * A report is { title, subtitle, filename, sections: [{ heading, summary: [{label, value, type}], columns, rows, totals }] }
 * where columns are { label, key | value(row), type: "money" | "number" | "qty" | "percent" | "date" | "text", width }.
 * Both formats use the same description, so every screen builds it once and offers both downloads.
 */
import { formatCurrency, formatDate, formatNumber } from "./format";
import { DOCX_MIME, XLSX_MIME, downloadBlob, fileStamp, loadExcel } from "./download";

/** Adds the download time unless the name already carries a date (e.g. a report period). */
const stampName = (name = "report") => (/\d{4}-\d{2}-\d{2}/.test(name) ? name : `${name}-${fileStamp()}`);

const cellValue = (col, row) => (typeof col.value === "function" ? col.value(row) : row[col.key]);
const isNumeric = (type) => ["money", "number", "qty", "percent"].includes(type);

const textValue = (type, v) => {
  if (v === null || v === undefined || v === "") return "";
  if (type === "money") return formatCurrency(v);
  if (type === "percent") return `${formatNumber(v)}%`;
  if (type === "number" || type === "qty") return formatNumber(v, 3);
  if (type === "date") return formatDate(v);
  return String(v);
};

const columnTotals = (section) =>
  section.columns.map((c, i) => {
    if (i === 0) return "Total";
    if (c.total === false) return "";
    if (!c.total && !(section.totals === true && (c.type === "money" || c.type === "qty"))) return "";
    return section.rows.reduce((s, r) => s + (Number(cellValue(c, r)) || 0), 0);
  });

const safeSheetName = (name, used) => {
  let base = String(name || "Sheet").replace(/[\\/?*[\]:]/g, " ").slice(0, 28).trim() || "Sheet";
  let n = base;
  let i = 2;
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 25)} ${i++}`;
  used.add(n.toLowerCase());
  return n;
};

const NUM_FMT = { money: '"₹"#,##,##0.00', number: "#,##0.###", qty: "#,##0.###", percent: '0.##"%"' };
const BRAND = "FF1A237E";

export async function exportExcel(report) {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Invoicyfy";
  wb.created = new Date();
  const used = new Set();

  report.sections.forEach((section) => {
    const ws = wb.addWorksheet(safeSheetName(section.sheet || section.heading, used), {
      pageSetup: { orientation: (section.columns?.length || 0) > 6 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    const width = Math.max(section.columns?.length || 2, 2);
    const title = ws.addRow([report.title]);
    title.font = { bold: true, size: 14, color: { argb: BRAND } };
    ws.mergeCells(title.number, 1, title.number, width);
    const sub = ws.addRow([[section.heading, report.subtitle].filter(Boolean).join(" · ")]);
    sub.font = { italic: true, color: { argb: "FF555555" } };
    ws.mergeCells(sub.number, 1, sub.number, width);
    ws.addRow([]);

    (section.summary || []).forEach((s) => {
      const r = ws.addRow([s.label, isNumeric(s.type) ? Number(s.value) || 0 : textValue(s.type, s.value)]);
      r.getCell(1).font = { bold: true };
      if (NUM_FMT[s.type]) r.getCell(2).numFmt = NUM_FMT[s.type];
    });
    if (section.summary?.length && section.columns?.length) ws.addRow([]);

    if (section.columns?.length) {
      const header = ws.addRow(section.columns.map((c) => c.label));
      const headerRow = header.number;
      header.eachCell((cell, i) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
        cell.alignment = { vertical: "middle", wrapText: true, horizontal: isNumeric(section.columns[i - 1]?.type) ? "right" : "left" };
      });
      section.rows.forEach((row) => {
        const r = ws.addRow(
          section.columns.map((c) => {
            const v = cellValue(c, row);
            if (v === null || v === undefined || v === "") return null;
            if (isNumeric(c.type)) return Number(v) || 0;
            if (c.type === "date") return textValue("date", v);
            return v;
          })
        );
        section.columns.forEach((c, i) => {
          if (NUM_FMT[c.type]) r.getCell(i + 1).numFmt = NUM_FMT[c.type];
        });
      });
      if (section.totals && section.rows.length) {
        const t = ws.addRow(columnTotals(section));
        t.font = { bold: true };
        t.eachCell((cell, i) => {
          cell.border = { top: { style: "thin" } };
          const c = section.columns[i - 1];
          if (c && NUM_FMT[c.type]) cell.numFmt = NUM_FMT[c.type];
        });
      }
      ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: section.columns.length } };
      ws.views = [{ state: "frozen", ySplit: headerRow }];
      section.columns.forEach((c, i) => {
        const longest = Math.max(c.label.length, ...section.rows.slice(0, 200).map((r) => textValue(c.type, cellValue(c, r)).length));
        ws.getColumn(i + 1).width = c.width || Math.min(Math.max(longest + 2, 10), 45);
      });
    } else {
      ws.getColumn(1).width = 30;
      ws.getColumn(2).width = 22;
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: XLSX_MIME }), `${stampName(report.filename)}.xlsx`);
}

export async function exportWord(report) {
  const d = await import("docx");
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ShadingType, PageOrientation } = d;
  const wide = report.sections.some((s) => (s.columns?.length || 0) > 6);
  const cell = (text, { bold, header, right } = {}) =>
    new TableCell({
      shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: "1A237E" } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [new TextRun({ text: String(text ?? ""), bold: bold || header, color: header ? "FFFFFF" : undefined, size: 18 })],
        }),
      ],
    });

  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: report.title, bold: true, color: "1A237E" })] }),
  ];
  if (report.subtitle) children.push(new Paragraph({ children: [new TextRun({ text: report.subtitle, italics: true, color: "555555" })] }));
  children.push(
    new Paragraph({ children: [new TextRun({ text: `Generated on ${new Date().toLocaleString("en-GB")}`, size: 16, color: "777777" })] })
  );

  report.sections.forEach((section) => {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 120 }, children: [new TextRun(section.heading)] }));
    if (section.summary?.length) {
      children.push(
        new Table({
          width: { size: 60, type: WidthType.PERCENTAGE },
          rows: section.summary.map(
            (s) => new TableRow({ children: [cell(s.label, { bold: true }), cell(textValue(s.type, s.value), { right: isNumeric(s.type) })] })
          ),
        })
      );
      children.push(new Paragraph(""));
    }
    if (section.columns?.length) {
      const rows = [
        new TableRow({ tableHeader: true, children: section.columns.map((c) => cell(c.label, { header: true, right: isNumeric(c.type) })) }),
        ...section.rows.map(
          (r) => new TableRow({ children: section.columns.map((c) => cell(textValue(c.type, cellValue(c, r)), { right: isNumeric(c.type) })) })
        ),
      ];
      if (section.totals && section.rows.length) {
        rows.push(
          new TableRow({
            children: columnTotals(section).map((v, i) =>
              cell(v === "" || i === 0 ? v : textValue(section.columns[i].type, v), { bold: true, right: i > 0 })
            ),
          })
        );
      }
      if (!section.rows.length) {
        children.push(new Paragraph({ children: [new TextRun({ text: "No records for this period.", italics: true })] }));
      } else {
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      }
    }
  });

  const doc = new Document({
    creator: "Invoicyfy",
    title: report.title,
    sections: [
      {
        properties: {
          page: {
            size: wide ? { orientation: PageOrientation.LANDSCAPE } : undefined,
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(new Blob([blob], { type: DOCX_MIME }), `${stampName(report.filename)}.docx`);
}
