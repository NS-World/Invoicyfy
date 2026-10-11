import { useEffect, useState } from "react";
import { StoreServices } from "../services/StoreServices";
import { useAuth } from "../context/useAuth";

let cache = null;

/** Stores visible to the user (all for Admin, own store otherwise) + the default store id. */
export default function useStores() {
  const { user } = useAuth();
  const [stores, setStores] = useState(cache || []);
  useEffect(() => {
    StoreServices.getStoresData(0, 200, "")
      .then((res) => {
        cache = res.data || [];
        setStores(cache);
      })
      .catch(() => {});
  }, []);
  const defaultStoreId = user?.store_id || stores[0]?.store_id || "";
  return { stores, defaultStoreId };
}

export const clearStoreCache = () => {
  cache = null;
};
