import { Box, Paper, Skeleton, Typography } from "@mui/material";

export default function StatCard({ label, value, hint, icon, color = "primary.main", loading, onClick }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: { xs: 1.5, sm: 2 },
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        gap: 1.5,
        alignItems: "flex-start",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow .2s",
        "&:hover": onClick ? { boxShadow: 3 } : undefined,
      }}
    >
      {icon && (
        <Box sx={{ color, bgcolor: "action.hover", borderRadius: 2, p: 1, display: { xs: "none", sm: "flex" } }}>{icon}</Box>
      )}
      <Box sx={{ minWidth: 0, overflow: "hidden" }}>
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.3, whiteSpace: "nowrap", fontSize: { xs: "1rem", sm: "1.15rem" } }}>
          {loading ? <Skeleton width={90} /> : value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
