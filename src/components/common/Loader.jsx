import { Box, CircularProgress } from "@mui/material";

export default function Loader({ minHeight = 240 }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight }}>
      <CircularProgress />
    </Box>
  );
}
