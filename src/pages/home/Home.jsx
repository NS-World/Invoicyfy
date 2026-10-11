import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  Button,
} from "@mui/material";
import {
  Dashboard,
  People,
  ShoppingCart,
  Receipt,
  Assignment,
  Payment,
  Settings,
  Logout,
  Menu as MenuIcon,
  Store,
} from "@mui/icons-material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Home.css";

const menuItems = [
  { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
  { text: "Customer", icon: <People />, path: "/customers" },
  { text: "Product", icon: <ShoppingCart />, path: "/products" },
  { text: "Invoice", icon: <Receipt />, path: "/invoices" },
  { text: "Order", icon: <Assignment />, path: "/orders" },
  { text: "Payment", icon: <Payment />, path: "/payments" },
  { text: "User", icon: <People />, path: "/users" },
  { text: "Store", icon: <Store />, path: "/stores" },
  { text: "Role", icon: <Settings />, path: "/roles" },
];

export default function Home() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toggleSidebarButton, setToggleSidebarButton] = useState(false);
  const userName = "Nirav Sangani"; // Replace with state/context later

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="App" style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar Drawer */}
      <Drawer
        sx={{
          width: 250,
          flexShrink: 0,
          display: sidebarOpen ? "block" : "none",
          "& .MuiDrawer-paper": {
            width: 250,
            boxSizing: "border-box",
            backgroundColor: "#045864",
            color: "white",
          },
        }}
        variant="permanent"
        anchor="left"
        open={sidebarOpen}
        onClose={() => {
          setSidebarOpen(false);
          setToggleSidebarButton(true);
        }}
      >
        <List>
          {/* Collapse button on top */}
          <ListItem
            button
            onClick={() => {
              setSidebarOpen(false);
              setToggleSidebarButton(true);
            }}
          >
             {/*<HomeIcon style={{ marginRight: "10px" }} />*/}
            <ListItemText 
            primary={<span className="menu-item-text">Invoicyfy</span>}  />
            <ChevronLeftIcon />
          </ListItem>

          {/* Divider */}
          <hr style={{ borderColor: "rgba(255,255,255,0.2)" }} />

          {/* Menu Items */}
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton component={Link} to={item.path}>
                <ListItemIcon sx={{ color: "white" }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Footer Section - Profile + Logout */}
        <div style={{ marginTop: "auto", padding: "15px" }}>
          <Typography
            variant="body2"
            component={Link}
            to="/profile"
            style={{ display: "flex", alignItems: "center", color: "white", textDecoration: "none" }}
          >
            <AccountCircleIcon style={{ marginRight: "10px" }} />
            <span>{userName}</span>
          </Typography>
          <br />
          <Button
            variant="contained"
            onClick={handleLogout}
            startIcon={<Logout />}
            style={{
              textTransform: "none",
              backgroundColor: "#fff",
              color: "#045864",
              width: "100%",
            }}
          >
            Logout
          </Button>
        </div>
      </Drawer>

      {/* Open Sidebar Button */}
      {toggleSidebarButton && (
        <Button
          onClick={() => {
            setSidebarOpen(true);
            setToggleSidebarButton(false);
          }}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 1000,
            backgroundColor: "#37353E",
            color: "#fff",
            borderRadius: "50%",
            minWidth: "40px",
            height: "40px",
          }}
        >
          <MenuIcon />
        </Button>
      )}

      {/* Main Content */}
     <Box
        component="main"
        className="main-content"
      >
        <Toolbar />
        <div className="tab-content">
          <Outlet />
        </div>
      </Box>
    </div>
  );
}
