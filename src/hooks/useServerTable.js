import { useCallback, useEffect, useRef, useState } from "react";
import useDebounce from "./useDebounce";
import { apiError } from "../utils/format";
import { fetchAllPages } from "../utils/fetchAll";

/**
 * Server-side paginated list state for DataGrid pages.
 *   const table = useServerTable((page, size, search, filters) => Service.list(page, size, search, filters), { filters });
 */
export default function useServerTable(fetcher, { pageSize = 10, filters = {}, idField } = {}) {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize });
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const filterKey = JSON.stringify(filters);
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Back to the first page whenever search or filters change.
  useEffect(() => {
    setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
  }, [debouncedSearch, filterKey]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const res = await fetcherRef.current(paginationModel.page, paginationModel.pageSize, debouncedSearch, JSON.parse(filterKey));
      if (id !== requestId.current) return;
      const data = (res?.data || []).map((r, i) => ({ ...r, id: idField ? r[idField] : r.id ?? i }));
      setRows(data);
      setTotal(Number(res?.total) || 0);
      setResponse(res);
    } catch (err) {
      if (id === requestId.current) setError(apiError(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [paginationModel, debouncedSearch, filterKey, idField]);

  useEffect(() => {
    load();
  }, [load]);

  // Every row matching the current search and filters (for Excel / Word downloads).
  const fetchAll = useCallback(() => fetchAllPages((page, size) => fetcherRef.current(page, size, search, JSON.parse(filterKey))), [search, filterKey]);

  return { rows, setRows, total, response, loading, error, paginationModel, setPaginationModel, search, setSearch, reload: load, fetchAll };
}
