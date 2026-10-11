import API, { qs } from "./axios";

export const BackupServices = {
  tables: async () => (await API.get("/master/backup/tables.php")).data,
  exportPage: async (table, page, limit = 2000) => (await API.get(`/master/backup/export.php${qs({ table, page, limit })}`)).data,
  importRows: async (table, rows) => (await API.post("/master/backup/import.php", { table, rows }, { timeout: 300000 })).data,
  log: async (data) => (await API.post("/master/backup/add-log.php", data)).data,
};
