import { useEffect } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import PrintIcon from "@mui/icons-material/Print";
import ThermalReceipt from "../../print/ThermalReceipt";
import KotTicket from "../../print/KotTicket";
import usePrintJob from "../../print/usePrintJob";
import { getInvoiceSettings } from "../../../utils/invoiceSettings";
import { useT } from "../../../context/PrefsContext";

/** Shown after a bill is saved on the device without internet: print it now, it syncs later by itself. */
export default function OfflineSavedDialog({ invoice, withKot, autoPrint = true, onClose }) {
  const t = useT();
  const job = usePrintJob();
  const settings = getInvoiceSettings(invoice.store);
  const width = localStorage.getItem("receiptWidth") || "80mm";
  const { print } = job;
  useEffect(() => {
    if (autoPrint) print({ pageSize: width, key: "bill" });
  }, [print, width, autoPrint]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CloudOffIcon color="warning" /> {t("Saved offline")}
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "action.hover" }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("No internet. The bill is saved on this device with number {no} and will be sent automatically when the internet is back. It then gets its final bill number.", {
            no: invoice.invoice_number,
          })}
        </Alert>
        <Box sx={{ width: "fit-content", mx: "auto", boxShadow: 2, maxWidth: "100%", overflowX: "auto" }}>
          <ThermalReceipt invoice={invoice} width={width} settings={settings} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button startIcon={<PrintIcon />} onClick={() => job.print({ pageSize: width, key: "bill" })}>
          {autoPrint ? t("Print again") : t("Print")}
        </Button>
        <Button variant="contained" onClick={onClose}>
          {t("New bill")}
        </Button>
      </DialogActions>
      {job.render(() => (
        <>
          <ThermalReceipt invoice={invoice} width={width} settings={settings} copyLabel="OFFLINE" />
          {withKot && (
            <>
              <div className="print-break" />
              <KotTicket doc={invoice} width={width} settings={settings} />
            </>
          )}
        </>
      ))}
    </Dialog>
  );
}
