import { InputAdornment, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useT } from "../../context/PrefsContext";

export default function SearchField({ value, onChange, placeholder = "Search...", sx }) {
  const t = useT();
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t(placeholder)}
      size="small"
      sx={{ width: { xs: "100%", sm: 280 }, bgcolor: "background.paper", ...sx }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
