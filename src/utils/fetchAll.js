/** Loads every page of a paginated list (500 per request, as the API allows) for exporting. */
export async function fetchAllPages(fetchPage, max = 20000) {
  const rows = [];
  for (let page = 0; rows.length < max; page++) {
    const res = await fetchPage(page, 500);
    const data = res?.data || [];
    rows.push(...data);
    if (data.length < 500 || rows.length >= Number(res?.total || 0)) break;
  }
  return rows;
}
