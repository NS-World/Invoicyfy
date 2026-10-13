import { useCallback, useState } from "react";
import { Badge, Box, Button, ButtonBase, Dialog, DialogContent, DialogTitle, Grid, IconButton, Paper, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PlayCircleIcon from "@mui/icons-material/PlayCircleOutline";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import ExploreIcon from "@mui/icons-material/Explore";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import LockClockIcon from "@mui/icons-material/LockClock";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import LoyaltyIcon from "@mui/icons-material/Loyalty";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import PrintIcon from "@mui/icons-material/Print";
import PinIcon from "@mui/icons-material/Pin";
import { useAuth } from "../../context/useAuth";
import { useT } from "../../context/PrefsContext";
import { TOURS, TOUR_SEEN_KEY } from "./tours";
import TourRunner from "./TourRunner";

const ICONS = {
  start: <ExploreIcon />,
  bill: <PointOfSaleIcon />,
  day: <LockClockIcon />,
  credit: <MoneyOffIcon />,
  loyalty: <LoyaltyIcon />,
  auto: <AutoModeIcon />,
  print: <PrintIcon />,
  pin: <PinIcon />,
};

const seen = () => {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === "1";
  } catch {
    return true;
  }
};

/** "Demo & help" button for the top bar: lists the guided demos the user is allowed to see and plays one. */
export default function HelpTour({ color = "inherit", label = false }) {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(null);
  const [isNew, setIsNew] = useState(() => !seen());

  const allowed = (perm) => !perm || can(...perm.split("."));
  const tours = TOURS.filter((tour) => allowed(tour.perm))
    .map((tour) => ({ ...tour, steps: tour.steps.filter((s) => allowed(s.perm)) }))
    .filter((tour) => tour.steps.length);

  const show = () => {
    setOpen(true);
    if (isNew) {
      setIsNew(false);
      try {
        localStorage.setItem(TOUR_SEEN_KEY, "1");
      } catch {
        /* private window */
      }
    }
  };
  const start = (tour) => {
    setOpen(false);
    setRunning(tour);
  };
  const finish = useCallback((done) => {
    setRunning(null);
    if (done) setOpen(true);
  }, []);

  const icon = (
    <Badge variant="dot" color="error" invisible={!isNew} overlap="circular">
      <SchoolIcon />
    </Badge>
  );

  return (
    <>
      <Tooltip title={t("Demo & help — see how the app works")}>
        {label ? (
          <Button size="small" variant="outlined" startIcon={icon} onClick={show} data-tour="help-tour" sx={{ color, borderColor: "divider", whiteSpace: "nowrap" }}>
            {t("Demo & help")}
          </Button>
        ) : (
          <IconButton onClick={show} sx={{ color }} data-tour="help-tour" aria-label={t("Demo & help")}>
            {icon}
          </IconButton>
        )}
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" fullScreen={phone}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1 }}>
          <SchoolIcon color="primary" />
          <Box sx={{ flex: 1 }}>{t("Demo & help")}</Box>
          <IconButton onClick={() => setOpen(false)} aria-label={t("Close")}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("Pick a topic. The demo opens the right screen and shows each part step by step. Nothing is saved or changed during a demo.")}
          </Typography>
          <Grid container spacing={1.5}>
            {tours.map((tour) => (
              <Grid key={tour.id} size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ height: "100%", "&:hover": { borderColor: "primary.main" } }}>
                  <ButtonBase onClick={() => start(tour)} data-testid={`tour-${tour.id}`} sx={{ width: "100%", height: "100%", p: 1.5, display: "flex", alignItems: "flex-start", gap: 1.5, textAlign: "left", borderRadius: 1 }}>
                    <Box sx={{ color: "primary.main", mt: 0.25 }}>{ICONS[tour.icon]}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{t(tour.title)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(tour.text)}
                      </Typography>
                      <Typography variant="caption" color="primary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, fontWeight: 600 }}>
                        <PlayCircleIcon sx={{ fontSize: 16 }} /> {t("{n} steps", { n: tour.steps.length })}
                      </Typography>
                    </Box>
                  </ButtonBase>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
      {running && <TourRunner key={running.id} tour={running} onClose={finish} />}
    </>
  );
}
