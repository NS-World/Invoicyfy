import { useAuth } from "../../context/useAuth";
import ExportMenu from "./ExportMenu";

/**
 * Excel / Word download for a list screen. Exports every row matching the current search and filters.
 * columns: [{ label, key | value(row), type: "money" | "qty" | "number" | "date" | "text", total }]
 */
export default function ListExport({ table, title, filename, columns, subtitle, totals = true, extra }) {
  const { user } = useAuth();
  const build = async () => {
    const rows = await table.fetchAll();
    const parts = [subtitle, table.search ? `Search: "${table.search}"` : null, `${rows.length} record(s)`].filter(Boolean);
    return {
      title: `${user?.store_name || "Business"} — ${title}`,
      subtitle: parts.join(" · "),
      filename,
      sections: [{ heading: title, columns, rows, totals }, ...(extra ? extra(rows) : [])],
    };
  };
  return <ExportMenu build={build} />;
}
