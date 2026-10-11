/** Is this sale inter-state (IGST) — buyer state differs from the store's state? */
export const isInterstate = (store, customer) => {
  const storeState = store?.state_code;
  const buyerState = customer?.state_code || (customer?.gstin ? customer.gstin.slice(0, 2) : null);
  return Boolean(storeState && buyerState && storeState !== buyerState);
};
