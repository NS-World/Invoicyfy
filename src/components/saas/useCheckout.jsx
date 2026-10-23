import { useCallback, useRef, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { formatCurrency } from "../../utils/format";

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Payment window could not load")));
    s.onerror = () => reject(new Error("Payment window could not load. Check the internet and try again."));
    document.body.appendChild(s);
  });

/**
 * Opens the payment for an order and resolves with {order_id, payment_id, signature} for the server to check.
 * Razorpay mode: Razorpay's own checkout (UPI, cards, net banking). Test mode: a small "Pay (test)" dialog.
 * Rejects with Error("cancelled") when the window is closed.
 */
export default function useCheckout(mockPay) {
  const [mock, setMock] = useState(null);
  const waiter = useRef(null);

  const pay = useCallback(
    async (order) => {
      if (order.mode === "mock") {
        return new Promise((resolve, reject) => {
          waiter.current = { resolve, reject };
          setMock(order);
        });
      }
      const Razorpay = await loadRazorpay();
      return new Promise((resolve, reject) => {
        const rz = new Razorpay({
          key: order.key_id,
          amount: order.amount_paise,
          currency: order.currency,
          order_id: order.order_id,
          name: "Khanak",
          description: `${order.plan_name} plan · ${order.cycle === "month" ? "1 month" : "1 year"}`,
          prefill: { name: order.name, email: order.email, contact: order.phone },
          theme: { color: "#0b4f5c" },
          handler: (r) => resolve({ order_id: r.razorpay_order_id, payment_id: r.razorpay_payment_id, signature: r.razorpay_signature }),
          modal: { ondismiss: () => reject(new Error("cancelled")) },
        });
        rz.on("payment.failed", (r) => reject(new Error(r?.error?.description || "Payment failed. No money was taken; please try again.")));
        rz.open();
      });
    },
    []
  );

  const close = (result, error) => {
    const w = waiter.current;
    waiter.current = null;
    setMock(null);
    if (!w) return;
    if (error) w.reject(error);
    else w.resolve(result);
  };

  const dialog = (
    <Dialog open={Boolean(mock)} onClose={() => close(null, new Error("cancelled"))} maxWidth="xs" fullWidth>
      <DialogTitle>Test payment</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Payments are in test mode on this server. No money is taken. Switch to Razorpay for real payments.
        </Alert>
        {mock && (
          <Box sx={{ display: "grid", gap: 0.5 }}>
            <Typography>
              {mock.plan_name} · {mock.cycle === "month" ? "1 month" : "1 year"}
              {mock.quantity > 1 ? ` · ${mock.quantity} stores` : ""}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {formatCurrency(mock.total)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(mock.amount)} + GST {formatCurrency(mock.gst)}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => close(null, new Error("cancelled"))}>Cancel</Button>
        <Button
          variant="contained"
          onClick={async () => {
            try {
              const r = await mockPay(mock.order_id);
              close({ order_id: r.order_id, payment_id: r.payment_id, signature: r.signature });
            } catch (e) {
              close(null, e);
            }
          }}
        >
          Pay {mock ? formatCurrency(mock.total) : ""} (test)
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { pay, dialog };
}
