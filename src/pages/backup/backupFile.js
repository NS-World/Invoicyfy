/**
 * Backup workbook format: a "README" sheet, then one sheet per table (sheet name = table name, row 1 = column
 * names). Excel cells hold at most 32,767 characters, so long values (logos, invoice designs) are split into the
 * hidden "_assets" sheet and the cell keeps a "@@asset:N" reference that is joined back on import.
 */
import { BackupServices } from "../../services/BackupServices";
import { XLSX_MIME, downloadBlob, fileStamp, loadExcel } from "../../utils/download";

const MARKER = "Invoicyfy backup";
const CELL_LIMIT = 30000;
const ASSET_PREFIX = "@@asset:";

export async function createBackup(onProgress) {
  const ExcelJS = await loadExcel();
  const { data } = await BackupServices.tables();
  const tables = data.tables;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Khanak";
  wb.created = new Date();

  const readme = wb.addWorksheet("README");
  readme.getColumn(1).width = 26;
  readme.getColumn(2).width = 70;
  const assets = [];
  const counts = {};
  const totalRows = tables.reduce((s, t) => s + t.count, 0) || 1;
  let done = 0;

  for (const t of tables) {
    const ws = wb.addWorksheet(t.table);
    ws.addRow(t.columns).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    let page = 1;
    let fetched = 0;
    for (;;) {
      const res = await BackupServices.exportPage(t.table, page);
      for (const row of res.data) {
        ws.addRow(
          t.columns.map((c) => {
            const v = row[c];
            if (v === null || v === undefined) return null;
            if (typeof v === "string" && v.length > CELL_LIMIT) {
              const id = assets.length + 1;
              assets.push([id, v]);
              return `${ASSET_PREFIX}${id}`;
            }
            return v;
          })
        );
      }
      fetched += res.data.length;
      done += res.data.length;
      onProgress?.({ table: t.label, percent: Math.min(99, Math.round((done / totalRows) * 100)) });
      if (!res.data.length || fetched >= res.total) break;
      page += 1;
    }
    counts[t.table] = fetched;
    t.columns.forEach((c, i) => {
      ws.getColumn(i + 1).width = Math.min(Math.max(c.length + 2, 12), 40);
    });
  }

  if (assets.length) {
    const ws = wb.addWorksheet("_assets", { state: "hidden" });
    ws.addRow(["asset_id", "part", "text"]);
    assets.forEach(([id, text]) => {
      for (let i = 0, part = 1; i < text.length; i += CELL_LIMIT, part += 1) ws.addRow([id, part, text.slice(i, i + CELL_LIMIT)]);
    });
  }

  const created = new Date();
  [
    [MARKER, "Keep this file safe. It contains your full business data."],
    ["Created on", created.toLocaleString("en-GB")],
    ["Format version", 1],
    ...tables.map((t) => [t.label, `${counts[t.table]} row(s) in sheet "${t.table}"`]),
    [],
    ["How to restore", "Open Khanak > Backup & Restore > Import backup and choose this file."],
    ["", "Existing records are never overwritten: rows already in the app are skipped and listed in an error file."],
    ["", "You can add new rows to a sheet (leave the id column empty). Do not rename sheets or the header row."],
  ].forEach((r) => readme.addRow(r));
  readme.getCell("A1").font = { bold: true, size: 14 };

  const buf = await wb.xlsx.writeBuffer();
  const fileName = `invoicyfy-backup-${fileStamp(created)}.xlsx`;
  downloadBlob(new Blob([buf], { type: XLSX_MIME }), fileName);
  onProgress?.({ table: "", percent: 100 });
  BackupServices.log({ action: "export", file_name: fileName, summary: counts }).catch(() => {});
  return { fileName, counts, partial: !data.is_full };
}

const pad = (n) => String(n).padStart(2, "0");

/** Normalise one ExcelJS cell value to plain text/number. Dates typed in Excel come back as UTC Date objects. */
const plain = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    const date = `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
    const time = `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}`;
    return time === "00:00:00" ? date : `${date} ${time}`;
  }
  if (typeof v === "object") {
    if (Array.isArray(v.richText)) return v.richText.map((p) => p.text).join("");
    if ("result" in v) return plain(v.result);
    if ("text" in v) return plain(v.text);
    if ("error" in v) return null;
    return String(v);
  }
  return v;
};

/** Reads a backup workbook. Returns { sheets: { table: { columns, rows: [{ __row, ...values }] } }, isBackup }. */
export async function readBackupFile(file, tables) {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const assets = {};
  const assetSheet = wb.getWorksheet("_assets");
  assetSheet?.eachRow((row, n) => {
    if (n === 1) return;
    const id = plain(row.getCell(1).value);
    assets[id] = (assets[id] || []).concat([[Number(plain(row.getCell(2).value)), String(plain(row.getCell(3).value) ?? "")]]);
  });
  const assetText = (ref) => {
    const parts = assets[ref.slice(ASSET_PREFIX.length)];
    return parts ? parts.sort((a, b) => a[0] - b[0]).map((p) => p[1]).join("") : null;
  };

  const byName = {};
  tables.forEach((t) => {
    byName[t.table.toLowerCase()] = t;
    byName[t.label.toLowerCase()] = t;
  });

  const sheets = {};
  wb.eachSheet((ws) => {
    const t = byName[ws.name.trim().toLowerCase()];
    if (!t) return;
    const header = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      header[col] = String(plain(cell.value) ?? "").trim();
    });
    const rows = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const obj = { __row: n };
      let filled = false;
      header.forEach((col, i) => {
        if (!col) return;
        let v = plain(row.getCell(i).value);
        if (typeof v === "string" && v.startsWith(ASSET_PREFIX)) v = assetText(v);
        if (v !== null && v !== "") filled = true;
        obj[col] = v;
      });
      if (filled) rows.push(obj);
    });
    sheets[t.table] = { columns: header.filter(Boolean), rows, sheetName: ws.name };
  });
  const isBackup = String(plain(wb.getWorksheet("README")?.getCell("A1").value) || "") === MARKER;
  return { sheets, isBackup };
}

/** Error file: a summary sheet plus one sheet per table listing the skipped rows with their reason. */
export async function downloadErrorFile(results, sourceName) {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  const summary = wb.addWorksheet("Summary");
  summary.addRow([`Import result for ${sourceName}`]).font = { bold: true, size: 13 };
  summary.addRow([`Created ${new Date().toLocaleString("en-GB")}`]);
  summary.addRow([]);
  const head = summary.addRow(["Sheet", "Rows in file", "Added", "Updated", "Already exists (skipped)", "Errors"]);
  head.font = { bold: true };
  results.forEach((r) => summary.addRow([r.label, r.total, r.inserted, r.merged, r.duplicate, r.error]));
  summary.columns.forEach((c, i) => (c.width = i === 0 ? 24 : 16));

  results
    .filter((r) => r.issues.length)
    .forEach((r) => {
      const ws = wb.addWorksheet(r.table);
      const cols = r.columns;
      const header = ws.addRow(["Row No.", "Status", "Reason", ...cols]);
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC62828" } }));
      r.issues.forEach((issue) => {
        const src = r.rowsByNo[issue.row] || {};
        const values = cols.map((c) => {
          const v = src[c];
          return typeof v === "string" && v.length > CELL_LIMIT ? `${v.slice(0, 200)}… (too long to show)` : v;
        });
        const row = ws.addRow([issue.row, issue.status === "duplicate" ? "Already exists" : "Error", issue.message, ...values]);
        row.getCell(2).font = { bold: true, color: { argb: issue.status === "duplicate" ? "FFEF6C00" : "FFC62828" } };
      });
      ws.getColumn(1).width = 9;
      ws.getColumn(2).width = 15;
      ws.getColumn(3).width = 50;
      ws.views = [{ state: "frozen", ySplit: 1, xSplit: 3 }];
    });

  const buf = await wb.xlsx.writeBuffer();
  const base = sourceName.replace(/\.xlsx$/i, "");
  downloadBlob(new Blob([buf], { type: XLSX_MIME }), `${base}-import-errors-${fileStamp()}.xlsx`);
}

/** Sends every sheet to the server in restore order, 400 rows at a time. */
export async function restoreBackup(parsed, tables, onProgress) {
  const order = tables.filter((t) => parsed.sheets[t.table]?.rows.length);
  const total = order.reduce((s, t) => s + parsed.sheets[t.table].rows.length, 0) || 1;
  let done = 0;
  const results = [];
  for (const t of order) {
    const { rows, columns } = parsed.sheets[t.table];
    const r = { table: t.table, label: t.label, columns, total: rows.length, inserted: 0, merged: 0, duplicate: 0, error: 0, issues: [], notes: {}, rowsByNo: {} };
    rows.forEach((row) => (r.rowsByNo[row.__row] = row));
    for (let i = 0; i < rows.length; i += 400) {
      const chunk = rows.slice(i, i + 400);
      try {
        const res = await BackupServices.importRows(t.table, chunk);
        ["inserted", "merged", "duplicate", "error"].forEach((k) => (r[k] += res.counts[k] || 0));
        r.issues.push(...res.issues);
        Object.entries(res.notes || {}).forEach(([k, v]) => (r.notes[k] = (r.notes[k] || 0) + v));
      } catch (e) {
        const message = e?.response?.data?.message || "Server did not accept this part of the sheet";
        chunk.forEach((row) => r.issues.push({ row: row.__row, status: "error", message }));
        r.error += chunk.length;
      }
      done += chunk.length;
      onProgress?.({ table: t.label, percent: Math.min(99, Math.round((done / total) * 100)) });
    }
    results.push(r);
  }
  onProgress?.({ table: "", percent: 100 });
  return results;
}

/**
 * Reads the automatic backup file (invoicyfy-backup-<date>.json.gz from the server / Google Drive) into the same
 * shape as readBackupFile, so it restores the same way.
 */
export async function readJsonBackup(file, tables) {
  let text;
  if (/\.gz$/i.test(file.name)) {
    if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot open .gz files. Use the latest Chrome or Edge.");
    text = await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text();
  } else {
    text = await file.text();
  }
  const data = JSON.parse(text);
  if (data?.format !== "invoicyfy-backup" || !data.tables) throw new Error("Not a Khanak backup file");
  const known = new Set(tables.map((t) => t.table));
  const sheets = {};
  Object.entries(data.tables).forEach(([table, { columns, rows }]) => {
    if (!known.has(table)) return;
    sheets[table] = {
      columns,
      sheetName: table,
      rows: rows.map((r, i) => {
        const obj = { __row: i + 2 };
        columns.forEach((c, n) => (obj[c] = r[n]));
        return obj;
      }),
    };
  });
  return { sheets, isBackup: true, createdAt: data.created_at };
}
