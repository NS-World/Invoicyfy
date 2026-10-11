import { AppBar, Toolbar, Typography, IconButton, Avatar } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";

export default function Header() {
  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6">Springfield Store</Typography>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <IconButton>
            <NotificationsIcon />
          </IconButton>
          <Avatar src="https://i.pravatar.cc/150?img=8" />
        </div>
      </Toolbar>
    </AppBar>
  );
}
