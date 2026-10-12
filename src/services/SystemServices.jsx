import API from "./axios";

export const SystemServices = {
  status: async () => (await API.get("/master/settings/system-status.php")).data,
  updateDatabase: async () => (await API.post("/master/settings/update-database.php", {}, { timeout: 300000 })).data,
};
