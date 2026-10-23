/**
 * Direct (dialog-free) printing to a thermal printer from the browser:
 *   - USB      (WebUSB: Chrome / Edge on Android and desktop; on Windows the printer may need the WinUSB driver)
 *   - Serial   (Web Serial: USB-serial printers and Bluetooth printers paired as a COM port, Chrome / Edge desktop)
 *   - Bluetooth (Web Bluetooth BLE printers, Chrome on Android / desktop)
 *   - Kiosk    (Chrome started with --kiosk-printing: the normal print goes to the default printer without a dialog)
 * The chosen printer is remembered on this device. Anything that cannot print directly falls back to the dialog.
 */
import { toCanvas } from "html-to-image";
import { PAPER_DOTS, buildRasterJob, buildTestJob, canvasToBits } from "./escpos";

const KEY = "printerSettings";
const BLE_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
];

const DEFAULTS = { mode: "dialog", paper: "80mm", cut: true, drawer: false, baud: 9600, threshold: 165, device: null };

export function loadPrinterSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrinterSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadPrinterSettings(), ...s }));
  } catch {
    /* storage blocked */
  }
}

export const support = () => ({
  usb: typeof navigator !== "undefined" && "usb" in navigator,
  serial: typeof navigator !== "undefined" && "serial" in navigator,
  bluetooth: typeof navigator !== "undefined" && "bluetooth" in navigator,
  secure: typeof window !== "undefined" && window.isSecureContext,
});

/* ---------------------------------------------------------------- transports */

let conn = null; // { kind, write(bytes), close(), name }

async function usbConnect(device) {
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const ifaces = device.configuration.interfaces;
  // Prefer the printer-class interface; otherwise any interface with a bulk OUT endpoint.
  const pickIface = ifaces.find((i) => i.alternate.interfaceClass === 7) || ifaces.find((i) => i.alternate.endpoints.some((e) => e.direction === "out" && e.type === "bulk"));
  if (!pickIface) throw new Error("This USB device has no printer output");
  await device.claimInterface(pickIface.interfaceNumber);
  const ep = pickIface.alternate.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
  return {
    kind: "usb",
    name: device.productName || "USB printer",
    write: async (bytes) => {
      for (let i = 0; i < bytes.length; i += 4096) {
        const r = await device.transferOut(ep.endpointNumber, bytes.subarray(i, i + 4096));
        if (r.status !== "ok") throw new Error(`USB write ${r.status}`);
      }
    },
    close: () => device.close().catch(() => {}),
    id: { vendorId: device.vendorId, productId: device.productId, serialNumber: device.serialNumber },
  };
}

async function serialConnect(port, baud) {
  if (!port.writable) await port.open({ baudRate: Number(baud) || 9600 });
  const info = port.getInfo?.() || {};
  return {
    kind: "serial",
    name: "Serial / COM printer",
    write: async (bytes) => {
      const writer = port.writable.getWriter();
      try {
        for (let i = 0; i < bytes.length; i += 1024) await writer.write(bytes.subarray(i, i + 1024));
      } finally {
        writer.releaseLock();
      }
    },
    close: () => port.close().catch(() => {}),
    id: { usbVendorId: info.usbVendorId, usbProductId: info.usbProductId },
  };
}

async function bleConnect(device) {
  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  const services = await server.getPrimaryServices();
  let ch = null;
  for (const s of services) {
    const chars = await s.getCharacteristics().catch(() => []);
    ch = chars.find((c) => c.properties.writeWithoutResponse || c.properties.write);
    if (ch) break;
  }
  if (!ch) throw new Error("No printable channel found on this Bluetooth device");
  const noResp = ch.properties.writeWithoutResponse;
  return {
    kind: "bluetooth",
    name: device.name || "Bluetooth printer",
    write: async (bytes) => {
      // BLE packets are small: send ~180 bytes at a time with a short pause so the printer buffer keeps up.
      for (let i = 0; i < bytes.length; i += 180) {
        const chunk = bytes.slice(i, i + 180);
        if (noResp) await ch.writeValueWithoutResponse(chunk);
        else await ch.writeValueWithResponse(chunk);
        if (i % 3600 === 0) await new Promise((r) => setTimeout(r, 20));
      }
    },
    close: () => device.gatt.disconnect(),
    id: { name: device.name, id: device.id },
  };
}

/** Ask the user to choose a printer (must run from a click). */
export async function pairPrinter(kind) {
  const s = loadPrinterSettings();
  if (conn) {
    await conn.close?.();
    conn = null;
  }
  if (kind === "usb") {
    const device = await navigator.usb.requestDevice({ filters: [] });
    conn = await usbConnect(device);
  } else if (kind === "serial") {
    const port = await navigator.serial.requestPort();
    conn = await serialConnect(port, s.baud);
  } else if (kind === "bluetooth") {
    const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICES });
    conn = await bleConnect(device);
  } else {
    throw new Error("Unknown printer type");
  }
  savePrinterSettings({ mode: kind, device: { kind, name: conn.name, ...conn.id } });
  return conn.name;
}

/** Reconnect to the remembered printer without asking (USB / Serial / some Bluetooth). */
async function reconnect() {
  if (conn) return conn;
  const s = loadPrinterSettings();
  const d = s.device;
  if (!d) return null;
  if (s.mode === "usb" && navigator.usb) {
    const list = await navigator.usb.getDevices();
    const dev = list.find((x) => x.vendorId === d.vendorId && x.productId === d.productId) || list[0];
    if (dev) conn = await usbConnect(dev);
  } else if (s.mode === "serial" && navigator.serial) {
    const ports = await navigator.serial.getPorts();
    const port = ports.find((p) => p.getInfo?.().usbVendorId === d.usbVendorId) || ports[0];
    if (port) conn = await serialConnect(port, s.baud);
  } else if (s.mode === "bluetooth" && navigator.bluetooth?.getDevices) {
    const list = await navigator.bluetooth.getDevices();
    const dev = list.find((x) => x.id === d.id) || list.find((x) => x.name === d.name);
    if (dev) conn = await bleConnect(dev);
  }
  return conn;
}

export async function forgetPrinter() {
  if (conn) await conn.close?.();
  conn = null;
  savePrinterSettings({ mode: "dialog", device: null });
}

export const connectedName = () => conn?.name || null;

/** Render the slip (HTML element) to ESC/POS bytes at the printer's dot width. */
export async function elementToJob(target, paper, opts = {}) {
  const dots = PAPER_DOTS[paper] || PAPER_DOTS["80mm"];
  const cssWidth = target.getBoundingClientRect().width || target.offsetWidth || 300;
  const canvas = await toCanvas(target, {
    backgroundColor: "#ffffff",
    pixelRatio: dots / cssWidth,
    cacheBust: true,
    style: { margin: "0" },
  });
  // Scale to exactly the printer width.
  const out = document.createElement("canvas");
  out.width = dots;
  out.height = Math.round((canvas.height * dots) / canvas.width);
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return buildRasterJob(canvasToBits(out, opts.threshold), opts);
}

export const directPrint = {
  /** True when slips should go straight to a connected / remembered printer. */
  enabled: () => ["usb", "serial", "bluetooth"].includes(loadPrinterSettings().mode),
  /** Print the slip inside `root`. Returns false when the printer is not reachable (caller opens the dialog). */
  printElement: async (root, pageSize) => {
    const s = loadPrinterSettings();
    if (!root) return false;
    const c = await reconnect().catch(() => null);
    if (!c) return false;
    const paper = pageSize === "58mm" ? "58mm" : s.paper;
    // #print-root is hidden on screen: lay it out off-screen while the picture is taken.
    const old = root.getAttribute("style");
    root.setAttribute("style", "display:block;position:fixed;left:-10000px;top:0;z-index:-1;background:#fff");
    let job;
    try {
      await new Promise((r) => requestAnimationFrame(() => r()));
      // Every slip (bill, KOT, Z report) is printed and cut separately; the drawer opens once.
      const slips = [...root.querySelectorAll(".receipt")];
      const parts = [];
      for (const [i, el] of (slips.length ? slips : [root.firstElementChild || root]).entries()) {
        parts.push(await elementToJob(el, paper, { cut: s.cut, drawer: s.drawer && i === 0, threshold: s.threshold }));
      }
      job = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
      parts.reduce((o, p) => (job.set(p, o), o + p.length), 0);
    } finally {
      if (old === null) root.removeAttribute("style");
      else root.setAttribute("style", old);
    }
    try {
      await c.write(job);
    } catch {
      // Connection dropped (Bluetooth idle, USB re-plugged): reconnect once and send again.
      await conn?.close?.();
      conn = null;
      const again = await reconnect().catch(() => null);
      if (!again) return false;
      await again.write(job);
    }
    return true;
  },
  testPrint: async () => {
    const c = await reconnect();
    if (!c) throw new Error("Printer is not connected. Press Connect first.");
    const s = loadPrinterSettings();
    await c.write(buildTestJob(`Khanak test print\n${new Date().toLocaleString()}\nPaper ${s.paper}`, { cut: s.cut }));
  },
};

/* ---------------------------------------------------------------- one-click printing */

export const PRINTER_ASK_EVENT = "invoicyfy:ask-printer";

/** Opens the "connect your printer" prompt (PrinterPrompt) and waits for the answer: "paired" or "dialog". */
function askPrinter(reason) {
  if (typeof window === "undefined" || !window.__printerPromptMounted) return Promise.resolve("dialog");
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent(PRINTER_ASK_EVENT, { detail: { reason, resolve } })));
}

/**
 * Prints a thermal slip (receipt / KOT / report) straight to the printer. Returns true when printed;
 * false means the caller should open the normal print window (A4, kiosk mode, or the user chose so).
 *   - printer set up and reachable: prints directly
 *   - printer set up but not reachable (refresh, switched off): asks once to connect again
 *   - nothing set up yet: offers to connect the printer once (can be turned off)
 */
export async function printSlip(root, pageSize) {
  if (!root || pageSize === "A4") return false;
  const s = loadPrinterSettings();
  if (s.mode === "kiosk") return false; // Chrome kiosk printing: the normal print is already silent
  if (directPrint.enabled() && s.device) {
    if (await directPrint.printElement(root, pageSize).catch(() => false)) return true;
    if ((await askPrinter("reconnect")) === "paired") return directPrint.printElement(root, pageSize).catch(() => false);
    return false;
  }
  if (!s.noPrompt && (support().usb || support().serial || support().bluetooth) && support().secure) {
    if ((await askPrinter("setup")) === "paired") return directPrint.printElement(root, pageSize).catch(() => false);
  }
  return false;
}

/* ---------------------------------------------------------------- Windows PCs */

export const isWindows = () => typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent || "");

/**
 * On Windows a printer installed with its own driver ("USB Printing Support") belongs to Windows, so the browser's
 * USB list does not show it (or cannot open it). True for errors that mean exactly that.
 */
export const isWindowsDriverProblem = (e) =>
  isWindows() && ["NotFoundError", "SecurityError", "NetworkError", "InvalidStateError"].includes(e?.name);

/** A double-click file for the billing PC: opens the app in Chrome (or Edge) with silent printing to the default printer. */
export function kioskShortcutFile(url = typeof window !== "undefined" ? window.location.origin + "/" : "") {
  const lines = [
    "@echo off",
    "rem Khanak billing: bills and KOT print straight to the Windows default printer (no print window).",
    `set "URL=${url}"`,
    'set "PROFILE=%LocalAppData%\\InvoicyfyPrint"',
    'set "APP=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"',
    'if not exist "%APP%" set "APP=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"',
    'if not exist "%APP%" set "APP=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"',
    'if not exist "%APP%" set "APP=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"',
    'if not exist "%APP%" set "APP=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"',
    'start "" "%APP%" --kiosk-printing --user-data-dir="%PROFILE%" --no-first-run "%URL%"',
    "",
  ];
  return new Blob([lines.join("\r\n")], { type: "application/octet-stream" });
}

export function downloadKioskShortcut() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(kioskShortcutFile());
  a.download = "Khanak Billing.bat";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Prints a small test slip through the normal print (silent when the app was opened from the shortcut). */
export function printTestSlip(paper = loadPrinterSettings().paper) {
  const width = paper === "58mm" ? "58mm" : "80mm";
  const frame = document.createElement("iframe");
  frame.setAttribute("style", "position:fixed;right:0;bottom:0;width:0;height:0;border:0");
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><style>@page{size:${width} auto;margin:0}body{width:${width};margin:0;padding:4mm;font:14px monospace;text-align:center}</style></head>
<body><b>Khanak test print</b><br>${new Date().toLocaleString()}<br>Paper ${width}<br>--------------------<br>If you can read this, printing works.</body></html>`);
  doc.close();
  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 3000);
  }, 200);
}
