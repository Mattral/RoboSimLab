import { useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const v = row[h];
      return typeof v === "number" ? v.toFixed(6) : String(v ?? "");
    }).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const useDataExport = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const download = useCallback((data: any[], filename: string) => {
    exportToCSV(data, filename);
  }, []);

  return { download };
};

export const ExportButton = ({ onClick, label = "📥 Export CSV" }: { onClick: () => void; label?: string }) => (
  <button
    onClick={onClick}
    className="text-xs font-mono py-2 px-3 rounded border border-border hover:border-primary/50 text-foreground transition-colors"
  >
    {label}
  </button>
);
