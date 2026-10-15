import { useEffect, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Dashboard,
  People,
  ShoppingCart,
  Receipt,
  Assignment,
  Payment,
  Logout,
  Menu as MenuIcon,
  Category,
  CloudSync,
  Inventory2Outlined,
  Campaign,
  Store,
  Inventory2,
  AccountBalanceWallet,
  Assessment,
  Settings,
  AdminPanelSettings,
  PointOfSale,
  ChevronLeft,
  ChevronRight,
  Palette,
  LockClock,
  Loyalty,
  MoneyOff,
  History,
  AutoMode,
  Print,
  PhoneIphone,
  LocalShipping,
  ShoppingBasket,
  MenuBook,
  EventBusy,
  Fastfood,
  DeliveryDining,
  Badge,
  RequestQuote,
} from "@mui/icons-material";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useT } from "../../context/PrefsContext";
import PrefsSwitcher from "../../components/common/PrefsSwitcher";
import DatabaseUpdateBanner from "../../components/common/DatabaseUpdateBanner";
import OfflineStatus from "../../components/v3/OfflineStatus";
import HelpTour from "../../components/tour/HelpTour";
import PrinterPrompt from "../../components/printer/PrinterPrompt";
import { AutomationServices } from "../../services/V3Services";
import { SIDEBAR_BG } from "../../theme";
import "./Home.css";

const DRAWER_WIDTH = 240;
const MINI_WIDTH = 68;

const menu = [
  {
    section: null,
    items: [
      { text: "Dashboard", icon: <Dashboard />, path: "/dashboard", perm: "dashboard" },
      { text: "Owner's view (phone)", icon: <PhoneIphone />, path: "/owner", perm: "dashboard" },
    ],
  },
  {
    section: "Sales",
    items: [
      { text: "Quick Bill", icon: <PointOfSale />, path: "/invoices/new", perm: "invoices.add" },
      { text: "Orders", icon: <Assignment />, path: "/orders", perm: "orders" },
      { text: "Invoices", icon: <Receipt />, path: "/invoices", perm: "invoices" },
      { text: "Payments", icon: <Payment />, path: "/payments", perm: "payments" },
      { text: "Online orders", icon: <DeliveryDining />, path: "/online-orders", perm: "invoices" },
      { text: "Udhaar / Credit", icon: <MoneyOff />, path: "/credit", perm: "payments" },
      { text: "Day Close", icon: <LockClock />, path: "/day-close", perm: "cash" },
      { text: "Customers", icon: <People />, path: "/customers", perm: "customers" },
      { text: "Offers & Messages", icon: <Campaign />, path: "/offers", perm: "marketing" },
      { text: "Coupons & Loyalty", icon: <Loyalty />, path: "/coupons", perm: "loyalty" },
      { text: "Combo & Happy Hour", icon: <Fastfood />, path: "/combo-offers", perm: "loyalty" },
    ],
  },
  {
    section: "Stock & Money",
    items: [
      { text: "Products", icon: <ShoppingCart />, path: "/products", perm: "products" },
      { text: "Categories", icon: <Category />, path: "/categories", perm: "products" },
      { text: "Recipes & Cost", icon: <MenuBook />, path: "/recipes", perm: "products" },
      { text: "Inventory", icon: <Inventory2 />, path: "/inventory", perm: "inventory" },
      { text: "Expiry & Wastage", icon: <EventBusy />, path: "/expiry", perm: "inventory" },
      { text: "Purchases", icon: <ShoppingBasket />, path: "/purchases", perm: "purchases" },
      { text: "Suppliers", icon: <LocalShipping />, path: "/suppliers", perm: "purchases" },
      { text: "Expenses", icon: <AccountBalanceWallet />, path: "/expenses", perm: "expenses" },
      { text: "Reports", icon: <Assessment />, path: "/reports", perm: "reports" },
      { text: "Staff report", icon: <Badge />, path: "/staff-report", perm: "reports" },
      { text: "GSTR-1 file", icon: <RequestQuote />, path: "/gstr1", perm: "reports" },
    ],
  },
  {
    section: "Admin",
    items: [
      { text: "Settings", icon: <Settings />, path: "/settings" },
      { text: "Invoice Design", icon: <Palette />, path: "/settings/invoice-design", perm: "settings" },
      { text: "Counter & Printer", icon: <Print />, path: "/counter" },
      { text: "Automatic Messages", icon: <AutoMode />, path: "/automation", perm: "settings" },
      { text: "Activity Log", icon: <History />, path: "/activity", perm: "activity" },
      { text: "Stores", icon: <Store />, path: "/stores", admin: true },
      { text: "Users", icon: <People />, path: "/users", perm: "users" },
      { text: "Roles & Permissions", icon: <AdminPanelSettings />, path: "/roles", perm: "users" },
      { text: "Backup & Restore", icon: <CloudSync />, path: "/backup", perm: "backup" },
      { text: "Data & Archive", icon: <Inventory2Outlined />, path: "/data-archive", admin: true },
    ],
  },
];

// Which menu entry is active for nested pages (e.g. /order -> Orders).
const ACTIVE_ALIASES = {
  "/orders": ["/order", "/order-details"],
  "/products": ["/product", "/product-details"],
  "/categories": ["/category"],
  "/customers": ["/customer"],
  "/users": ["/user"],
  "/roles": ["/role"],
  "/stores": ["/store"],
};

const isActive = (path, pathname) => {
  if (path === "/invoices") return pathname === "/invoices" || /^\/invoices\/\d+/.test(pathname);
  if (path === "/settings") return pathname === "/settings";
  if (pathname === path || pathname.startsWith(`${path}/`)) return true;
  return (ACTIVE_ALIASES[path] || []).some((a) => pathname === a || pathname.startsWith(`${a}/`));
};

export default function Home() {
  const t = useT();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const { user, logout, isAdmin, can } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mini, setMini] = useState(() => localStorage.getItem("sidebarMini") === "1");

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => localStorage.setItem("sidebarMini", mini ? "1" : "0"), [mini]);

  // Daily automatic messages also go out while the app is open (for hosting without a cron job).
  useEffect(() => {
    const tick = () => navigator.onLine && document.visibilityState === "visible" && AutomationServices.tick().catch(() => {});
    const first = setTimeout(tick, 15000);
    const timer = setInterval(tick, 10 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const collapsed = isDesktop && mini;
  const width = collapsed ? MINI_WIDTH : DRAWER_WIDTH;

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: SIDEBAR_BG, color: "#fff" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", px: 2, minHeight: 64 }}>
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
            Invoicyfy
          </Typography>
        )}
        {isDesktop && (
          <IconButton onClick={() => setMini((m) => !m)} sx={{ color: "#fff" }} size="small" aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        )}
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }} data-tour="main-menu">
        {menu.map((group) => {
          const items = group.items.filter((i) => (!i.admin || isAdmin) && (!i.perm || can(...i.perm.split("."))));
          if (!items.length) return null;
          return (
            <List
              key={group.section || "main"}
              dense
              subheader={
                group.section && !collapsed ? (
                  <ListSubheader disableSticky sx={{ bgcolor: "transparent", color: "rgba(255,255,255,0.5)", lineHeight: "32px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                    {t(group.section)}
                  </ListSubheader>
                ) : null
              }
            >
              {items.map((item) => {
                const active = isActive(item.path, pathname);
                const button = (
                  <ListItemButton
                    key={item.path}
                    component={NavLink}
                    to={item.path}
                    sx={{
                      mx: 1,
                      my: 0.25,
                      borderRadius: 2,
                      justifyContent: collapsed ? "center" : "flex-start",
                      bgcolor: active ? "rgba(255,255,255,0.14)" : "transparent",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                    }}
                  >
                    <ListItemIcon sx={{ color: active ? "#4dd0e1" : "#fff", minWidth: collapsed ? 0 : 40 }}>{item.icon}</ListItemIcon>
                    {!collapsed && <ListItemText primary={t(item.text)} slotProps={{ primary: { fontWeight: active ? 700 : 500, fontSize: 14 } }} />}
                  </ListItemButton>
                );
                return collapsed ? (
                  <Tooltip key={item.path} title={t(item.text)} placement="right">
                    {button}
                  </Tooltip>
                ) : (
                  button
                );
              })}
            </List>
          );
        })}
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
      <Box sx={{ px: collapsed ? 1 : 2, pt: 1.5, display: isDesktop ? "block" : "none" }}>
        <Box data-tour="prefs">
          <PrefsSwitcher compact={collapsed} color="#fff" />
        </Box>
      </Box>
      <Box sx={{ p: collapsed ? 1 : 2 }}>
        {!collapsed && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, minWidth: 0 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: "#045864" }}>{(user?.name || "U").charAt(0).toUpperCase()}</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {user?.name || "User"}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }} noWrap component="div">
                {[user?.role_name, user?.store_name].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
          </Box>
        )}
        {collapsed ? (
          <Tooltip title={t("Logout")} placement="right">
            <IconButton onClick={logout} sx={{ color: "#fff", width: "100%" }}>
              <Logout />
            </IconButton>
          </Tooltip>
        ) : (
          <Button fullWidth variant="contained" onClick={logout} startIcon={<Logout />} sx={{ bgcolor: "#fff", color: "#045864", "&:hover": { bgcolor: "#e0f2f1" } }}>
            {t("Logout")}
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {!isDesktop && (
        <AppBar position="fixed" elevation={0} sx={{ bgcolor: SIDEBAR_BG }} className="no-print">
          <Toolbar sx={{ gap: { xs: 0.5, sm: 1 }, px: { xs: 1, sm: 2 } }}>
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} aria-label="Open menu" data-tour="main-menu" sx={{ ml: 0 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 800, flex: 1, minWidth: 0, fontSize: { xs: 18, sm: 20 } }} noWrap>
              Invoicyfy
            </Typography>
            <OfflineStatus color="#fff" />
            <HelpTour color="#fff" />
            <Box data-tour="prefs">
              <PrefsSwitcher short color="#fff" />
            </Box>
            <Avatar sx={{ width: 30, height: 30, bgcolor: "#045864", fontSize: 14, display: { xs: "none", sm: "flex" } }}>{(user?.name || "U").charAt(0).toUpperCase()}</Avatar>
          </Toolbar>
        </AppBar>
      )}

      <Box component="nav" className="no-print" sx={{ width: { md: width }, flexShrink: { md: 0 }, transition: "width .2s" }}>
        {isDesktop ? (
          <Drawer
            variant="permanent"
            open
            sx={{ "& .MuiDrawer-paper": { width, boxSizing: "border-box", border: 0, transition: "width .2s", overflowX: "hidden" } }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", border: 0 } }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box component="main" className="main-content" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${width}px)` } }}>
        {!isDesktop && <Toolbar />}
        {isDesktop && (
          <Box className="no-print" sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, px: { sm: 2.5, lg: 3 }, pt: 1.5, mb: -1, maxWidth: 1600, mx: "auto" }}>
            <OfflineStatus color="text.secondary" />
            <HelpTour label color="text.primary" />
          </Box>
        )}
        <Box className="tab-content" sx={{ p: { xs: 1.5, sm: 2.5, lg: 3 }, maxWidth: 1600, mx: "auto" }}>
          <DatabaseUpdateBanner />
          <Outlet />
          <PrinterPrompt />
        </Box>
      </Box>
    </Box>
  );
}
