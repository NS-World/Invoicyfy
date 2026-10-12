import { useEffect, useState } from "react";
import { ProductServices } from "../services/ProductServices";
import { CategoryServices } from "../services/CategoryServices";
import { fetchAllPages } from "../utils/fetchAll";

/**
 * Everything the billing screen needs to pick items without searching the server on each key:
 * all active products of the store, the category order from the Categories screen and the best sellers.
 */
export default function useCatalog(storeId) {
  const [state, setState] = useState({ products: [], categories: [], popular: [], loading: true, error: "" });

  useEffect(() => {
    let live = true;
    const extra = { status: "Active", store_id: storeId || undefined };
    Promise.all([
      fetchAllPages((page, size) => ProductServices.getProductsData(page, size, "", extra), 5000),
      CategoryServices.list(0, 500, "", { active: 1 })
        .then((r) => r.data || [])
        .catch(() => []),
      ProductServices.getProductsData(0, 12, "", { ...extra, sort: "popular" })
        .then((r) => (r.data || []).filter((p) => Number(p.sold_lines) > 0).map((p) => p.product_id))
        .catch(() => []),
    ])
      .then(([products, cats, popular]) => {
        if (!live) return;
        // Category tabs: Categories-screen order first, then any category only typed on products, then "Other".
        const used = new Set(products.map((p) => p.category || ""));
        const names = cats.map((c) => c.name).filter((n) => used.has(n));
        [...used].filter((n) => n && !names.includes(n)).sort((a, b) => a.localeCompare(b)).forEach((n) => names.push(n));
        if (used.has("")) names.push("");
        const byName = Object.fromEntries(cats.map((c) => [c.name, c]));
        const categories = names.map((name) => ({ name, unit: byName[name]?.default_unit, count: products.filter((p) => (p.category || "") === name).length }));
        products.sort((a, b) => a.name.localeCompare(b.name));
        setState({ products, categories, popular, loading: false, error: "" });
      })
      .catch((e) => live && setState((s) => ({ ...s, loading: false, error: e?.message || "Could not load products" })));
    return () => {
      live = false;
    };
  }, [storeId]);

  return state;
}
