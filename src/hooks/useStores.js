import { useEffect, useState } from "react";
import { StoreServices } from "../services/StoreServices";
import { useAuth } from "../context/useAuth";

let cache = null;
const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem("storesCache") || "null");
  } catch {
    return null;
  }
};

/** Stores visible to the user (all for Admin, own store otherwise) + the default store id. */
export default function useStores() {
  const { user } = useAuth();
  const [stores, setStores] = useState(() => cache || readSaved() || []);
  useEffect(() => {
    StoreServices.getStoresData(0, 200, "")
      .then((res) => {
        cache = res.data || [];
        setStores(cache);
        try {
          localStorage.setItem("storesCache", JSON.stringify(cache.map(({ logo, ...rest }) => ({ ...rest, logo: logo && logo.length < 200000 ? logo : null }))));
        } catch {
          /* storage full */
        }
      })
      .catch(() => {});
  }, []);
  const defaultStoreId = user?.store_id || stores[0]?.store_id || "";
  return { stores, defaultStoreId };
}

export const clearStoreCache = () => {
  cache = null;
};
