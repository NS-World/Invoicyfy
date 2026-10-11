import { Box } from "@mui/material";

/** Search + filters row above a table; wraps nicely on phones. */
export default function Toolbar({ children }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1.5,
        alignItems: "center",
        mb: 2,
        "& > *": { flex: { xs: "1 1 100%", sm: "0 0 auto" } },
      }}
    >
      {children}
    </Box>
  );
}
