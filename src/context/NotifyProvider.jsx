import { createContext, useCallback, useContext, useState } from "react";
import { Snackbar, Alert } from "@mui/material";

const NotifyContext = createContext(() => {});

/** Global toast: const notify = useNotify(); notify("Saved"); notify("Failed", "error"); */
export const NotifyProvider = ({ children }) => {
  const [state, setState] = useState({ open: false, message: "", severity: "success", key: 0 });
  const notify = useCallback((message, severity = "success") => {
    setState({ open: true, message, severity, key: Date.now() });
  }, []);
  const close = (_, reason) => reason !== "clickaway" && setState((s) => ({ ...s, open: false }));

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        key={state.key}
        open={state.open}
        autoHideDuration={4000}
        onClose={close}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={close} severity={state.severity} variant="filled" sx={{ width: "100%" }}>
          {state.message}
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotify = () => useContext(NotifyContext);
