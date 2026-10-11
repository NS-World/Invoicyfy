import { useEffect } from "react";
import { createPortal } from "react-dom";

const ensureRoot = () => {
  let root = document.getElementById("print-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "print-root";
    document.body.appendChild(root);
  }
  return root;
};

/** Renders children into #print-root (only visible when printing) and sets the paper size. */
export default function PrintPortal({ children, pageSize = "A4" }) {
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-print-page", "");
    style.textContent =
      pageSize === "A4" ? "@page { size: A4; margin: 8mm; }" : `@page { size: ${pageSize} auto; margin: 0; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [pageSize]);
  return createPortal(children, ensureRoot());
}
