export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/** 2026-10-11 14:05 -> "2026-10-11-1405" for file names */
export const fileStamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

/** Excel and docx libraries are big, so they load only when someone downloads a file. */
export const loadExcel = async () => {
  const m = await import("exceljs");
  return m.default || m;
};
