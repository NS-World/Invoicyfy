import { useEffect, useState } from "react";
import useStores from "./useStores";

/** The store a screen works on: the user's own store, or (Admin with several stores) the one picked. */
export default function useStoreId() {
  const { defaultStoreId } = useStores();
  const [storeId, setStoreId] = useState("");
  useEffect(() => {
    if (!storeId && defaultStoreId) setStoreId(defaultStoreId);
  }, [defaultStoreId, storeId]);
  return [storeId, setStoreId];
}
