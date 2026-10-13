import { useCallback, useEffect, useState } from "react";
import PrintPortal from "./PrintPortal";
import { directPrint } from "../../utils/directPrint";

/**
 * One way to print everywhere:
 *   const job = usePrintJob();
 *   job.print({ pageSize: "80mm", key: "kot" });     // open the print
 *   {job.render((key) => <KotTicket ... />)}           // what to print for that key
 * Thermal slips go straight to a connected printer (Printer setup) when one is set; otherwise the browser
 * print dialog opens, as before.
 */
export default function usePrintJob() {
  const [job, setJob] = useState(null); // { key, pageSize, direct }

  const print = useCallback((opts = {}) => {
    const pageSize = opts.pageSize || "80mm";
    setJob({ key: opts.key ?? "default", pageSize, direct: pageSize !== "A4" && directPrint.enabled(), n: Date.now() });
  }, []);

  useEffect(() => {
    if (!job) return undefined;
    let cancelled = false;
    const done = () => setJob(null);
    const timer = setTimeout(async () => {
      if (cancelled) return;
      if (job.direct) {
        const root = document.getElementById("print-root");
        const ok = await directPrint.printElement(root, job.pageSize).catch(() => false);
        if (ok) {
          done();
          return;
        }
      }
      window.addEventListener("afterprint", done, { once: true });
      window.print();
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
    };
  }, [job]);

  const render = (fn) =>
    job ? (
      <PrintPortal pageSize={job.pageSize}>
        {fn(job.key)}
      </PrintPortal>
    ) : null;

  return { print, render, printing: Boolean(job), key: job?.key };
}
