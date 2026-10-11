import API, { qs } from "./axios";

const base = "/master/campaign";
export const CampaignServices = {
  settings: async (store_id) => (await API.get(`${base}/whatsapp-settings.php${qs({ store_id })}`)).data,
  saveSettings: async (data) => (await API.post(`${base}/update-whatsapp-settings.php`, data)).data,
  test: async (data) => (await API.post(`${base}/test-whatsapp.php`, data)).data,
  audience: async (params) => (await API.get(`${base}/audience.php${qs(params)}`)).data,
  list: async (page, size, search) => (await API.get(`${base}/campaigns.php${qs({ page: page + 1, limit: size, search })}`)).data,
  get: async (campaign_id, params = {}) => (await API.get(`${base}/get-campaign.php${qs({ campaign_id, ...params })}`)).data,
  create: async (data) => (await API.post(`${base}/create-campaign.php`, data)).data,
  sendBatch: async (campaign_id) => (await API.post(`${base}/send-batch.php`, { campaign_id }, { timeout: 120000 })).data,
  mark: async (recipient_id, status = "Sent") => (await API.post(`${base}/mark-sent.php`, { recipient_id, status })).data,
  action: async (campaign_id, action) => (await API.post(`${base}/update-campaign.php`, { campaign_id, action })).data,
};
