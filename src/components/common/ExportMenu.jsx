import { useState } from "react";
import { Button, CircularProgress, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import GridOnIcon from "@mui/icons-material/GridOn";
import DescriptionIcon from "@mui/icons-material/Description";
import { useNotify } from "../../context/NotifyProvider";
import { apiError } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

/**
 * "Download" button offering Excel and Word. `build` returns the report description used by utils/exporters
 * (it may fetch data first), so the file always matches the filters on screen.
 */
export default function ExportMenu({ build, label = "Download", size = "medium", variant = "outlined", disabled }) {
  const t = useT();
  const notify = useNotify();
  const [anchor, setAnchor] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (format) => {
    setAnchor(null);
    setBusy(true);
    try {
      const report = await build();
      const { exportExcel, exportWord } = await import("../../utils/exporters");
      await (format === "word" ? exportWord(report) : exportExcel(report));
    } catch (e) {
      notify(apiError(e) || "Could not create the file", "error");
    }
    setBusy(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={busy ? <CircularProgress size={16} /> : <DownloadIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        disabled={disabled || busy}
      >
        {t(label)}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => run("excel")}>
          <ListItemIcon>
            <GridOnIcon fontSize="small" sx={{ color: "#1D6F42" }} />
          </ListItemIcon>
          <ListItemText primary="Excel (.xlsx)" secondary={t("Open in Excel / Google Sheets")} />
        </MenuItem>
        <MenuItem onClick={() => run("word")}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" sx={{ color: "#2B579A" }} />
          </ListItemIcon>
          <ListItemText primary="Word (.docx)" secondary={t("Ready to print or share")} />
        </MenuItem>
      </Menu>
    </>
  );
}
