/** Shop's own text blocks from the invoice designer (offers, timings, thank-you lines, emoji 🎉) at a chosen place. */
export default function CustomBlocks({ blocks, position, format }) {
  const list = (blocks || []).filter((b) => b.text && b.position === position && (b.show_on === "both" || b.show_on === format || !b.show_on));
  if (!list.length) return null;
  return list.map((b, i) => (
    <div
      key={`${position}-${i}`}
      className={`custom-block cb-${b.size || "normal"}${b.boxed ? " cb-boxed" : ""}`}
      style={{ textAlign: b.align || "center", fontWeight: b.bold ? 700 : undefined, fontStyle: b.italic ? "italic" : undefined }}
    >
      {b.text}
    </div>
  ));
}
