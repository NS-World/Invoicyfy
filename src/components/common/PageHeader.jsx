import { Box, IconButton, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { useT } from "../../context/PrefsContext";

export default function PageHeader({ title, subtitle, actions, back }) {
  const t = useT();
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        mb: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        {back && (
          <IconButton onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))} size="small" aria-label="Back">
            <ArrowBackIcon />
          </IconButton>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold" }} noWrap>
            {typeof title === "string" ? t(title) : title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {typeof subtitle === "string" ? t(subtitle) : subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {actions && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
