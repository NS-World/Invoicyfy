import { useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { resizeImage } from "../../utils/image";

export default function ImageUpload({ value, onChange, label = "Logo", hint, maxSize = 400, height = 72, disabled }) {
  const input = useRef(null);
  const [error, setError] = useState("");
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      onChange(await resizeImage(file, maxSize));
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
      <Box
        sx={{
          width: height * 1.6,
          height,
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {value ? (
          <img src={value} alt={label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        ) : (
          <Typography variant="caption" color="text.secondary">
            No {label.toLowerCase()}
          </Typography>
        )}
      </Box>
      <Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button size="small" variant="outlined" startIcon={<UploadIcon />} onClick={() => input.current?.click()} disabled={disabled}>
            {value ? "Change" : "Upload"} {label.toLowerCase()}
          </Button>
          {value && (
            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => onChange(null)} disabled={disabled}>
              Remove
            </Button>
          )}
        </Box>
        {(error || hint) && (
          <Typography variant="caption" color={error ? "error" : "text.secondary"} sx={{ display: "block", mt: 0.5 }}>
            {error || hint}
          </Typography>
        )}
      </Box>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
    </Box>
  );
}
