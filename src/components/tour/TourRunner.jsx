import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, Button, IconButton, LinearProgress, Paper, Typography, useMediaQuery, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useLocation, useNavigate } from "react-router-dom";
import { useT } from "../../context/PrefsContext";

const PAD = 6;
const GAP = 12;
const WAIT_MS = 4000;

/** First element with this data-tour name that is actually on screen (the closed phone menu does not count). */
function findVisible(name) {
  for (const el of document.querySelectorAll(`[data-tour="${name}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.right <= 0 || r.left >= window.innerWidth) continue;
    if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    if (el.closest("[aria-hidden='true']")) continue;
    return el;
  }
  return null;
}

/**
 * Plays one guided tour: opens the right screen, highlights the part being explained and shows a small card
 * with Back / Next. On phones the card sits at the bottom of the screen.
 */
export default function TourRunner({ tour, onClose }) {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [rect, setRect] = useState(null);
  const [searching, setSearching] = useState(false);
  const [cardSize, setCardSize] = useState({ w: 340, h: 180 });
  const target = useRef(null);
  const card = useRef(null);
  const steps = tour.steps;
  const step = steps[index];
  const last = index === steps.length - 1;

  const go = useCallback(
    (to) => {
      if (to < 0) return;
      if (to >= steps.length) return onClose(true);
      setDir(to >= index ? 1 : -1);
      setIndex(to);
    },
    [index, onClose, steps.length]
  );

  // Open the screen of this step, then wait for the highlighted part to appear.
  useEffect(() => {
    target.current = null;
    setRect(null);
    if (step.route && pathname !== step.route) {
      navigate(step.route);
      return undefined;
    }
    if (!step.target) return undefined;
    let stop = false;
    const started = Date.now();
    setSearching(true);
    const look = () => {
      if (stop) return;
      const el = findVisible(step.target);
      if (el) {
        setSearching(false);
        target.current = el;
        el.scrollIntoView({ block: "center", inline: "nearest" });
        setRect(el.getBoundingClientRect());
        return;
      }
      if (Date.now() - started > WAIT_MS) {
        setSearching(false);
        // Not on this screen (turned off / no permission): skip optional steps, else explain in the middle.
        if (step.optional) {
          const next = index + dir;
          if (next >= 0 && next < steps.length) setIndex(next);
          else if (next >= steps.length) onClose(true);
          else setDir(1);
        }
        return;
      }
      setTimeout(look, 120);
    };
    look();
    return () => {
      stop = true;
    };
  }, [step, pathname, navigate, index, dir, steps.length, onClose]);

  // Keep the highlight on the element while the page scrolls or resizes.
  useEffect(() => {
    const update = () => target.current && setRect(target.current.getBoundingClientRect());
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const timer = setInterval(update, 500);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose(false);
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, onClose]);

  useLayoutEffect(() => {
    if (!card.current) return;
    const r = card.current.getBoundingClientRect();
    if (Math.abs(r.width - cardSize.w) > 1 || Math.abs(r.height - cardSize.h) > 1) setCardSize({ w: r.width, h: r.height });
  }, [index, searching, phone, rect, cardSize.w, cardSize.h]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let cardPos;
  if (phone) {
    // Bottom sheet; move to the top when the highlighted part is in the lower half.
    const low = rect && rect.top + rect.height / 2 > vh / 2;
    cardPos = { left: 8, right: 8, ...(low ? { top: 8 } : { bottom: 8 }) };
  } else if (!rect) {
    cardPos = { left: Math.max(8, (vw - cardSize.w) / 2), top: Math.max(8, (vh - cardSize.h) / 2) };
  } else {
    const below = rect.bottom + PAD + GAP;
    const above = rect.top - PAD - GAP - cardSize.h;
    let top;
    let left = Math.min(Math.max(8, rect.left), vw - cardSize.w - 8);
    if (below + cardSize.h <= vh - 8) top = below;
    else if (above >= 8) top = above;
    else if (rect.right + GAP + cardSize.w <= vw - 8) {
      left = rect.right + GAP;
      top = Math.min(Math.max(8, rect.top), vh - cardSize.h - 8);
    } else if (rect.left - GAP - cardSize.w >= 8) {
      left = rect.left - GAP - cardSize.w;
      top = Math.min(Math.max(8, rect.top), vh - cardSize.h - 8);
    } else top = vh - cardSize.h - 8;
    cardPos = { left, top };
  }

  return (
    <Box className="no-print" role="dialog" aria-modal="true" aria-label={t(tour.title)} sx={{ position: "fixed", inset: 0, zIndex: 1600 }}>
      {/* Click shield: the demo explains, it does not let the page be changed by accident. */}
      <Box sx={{ position: "absolute", inset: 0, bgcolor: rect ? "transparent" : "rgba(0,0,0,0.55)" }} onClick={(e) => e.stopPropagation()} />
      {rect && (
        <Box
          sx={{
            position: "fixed",
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            outline: "3px solid #4dd0e1",
            transition: "all .25s ease",
            pointerEvents: "none",
          }}
        />
      )}
      <Paper
        ref={card}
        elevation={8}
        sx={{
          position: "fixed",
          ...cardPos,
          width: phone ? "auto" : 360,
          maxWidth: "calc(100vw - 16px)",
          p: 2,
          pt: 1.5,
          borderRadius: 3,
          transition: "top .25s ease, left .25s ease",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Typography variant="caption" color="primary" sx={{ fontWeight: 700, flex: 1 }}>
            {t(tour.title)} · {index + 1}/{steps.length}
          </Typography>
          <IconButton size="small" onClick={() => onClose(false)} aria-label={t("Close")}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <LinearProgress variant="determinate" value={((index + 1) / steps.length) * 100} sx={{ mb: 1.5, borderRadius: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
          {t(step.title)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
          {searching ? t("Opening...") : t(step.body)}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center" }}>
          <Button size="small" color="inherit" onClick={() => onClose(false)}>
            {t("Skip")}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={() => go(index - 1)} disabled={index === 0}>
            {t("Back")}
          </Button>
          <Button size="small" variant="contained" onClick={() => go(index + 1)} data-testid="tour-next">
            {last ? t("Finish") : t("Next")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
