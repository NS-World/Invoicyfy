import { QRCodeSVG } from "qrcode.react";

/** Shop QR codes (Google review, Instagram, website, menu...) — a link becomes a QR, or an uploaded QR image is used as is. */
export default function ExtraQrCodes({ codes, size = 84, className = "" }) {
  if (!codes?.length) return null;
  return (
    <div className={`extra-qr ${className}`}>
      {codes.map((q, i) => (
        <div key={i} className="extra-qr-item">
          {q.image ? <img src={q.image} alt={q.label || "QR code"} width={size} height={size} /> : <QRCodeSVG value={q.url} size={size} level="M" />}
          {q.label && <div className="extra-qr-label">{q.label}</div>}
        </div>
      ))}
    </div>
  );
}
