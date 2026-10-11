import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Box sx={{ textAlign: "center", py: 10 }}>
      <Typography variant="h3" sx={{ fontWeight: 800 }} color="primary">
        404
      </Typography>
      <Typography sx={{ mb: 3 }}>This page does not exist.</Typography>
      <Button variant="contained" onClick={() => navigate("/dashboard")}>
        Go to Dashboard
      </Button>
    </Box>
  );
}
