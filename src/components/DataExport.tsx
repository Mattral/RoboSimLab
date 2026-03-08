import { useCallback } from "react";

interface DataExportProps {
  data: Record<string, number>[];
  filename: string;
}

export const exportToCSV = (data: Array<Record<string, number | string>>, filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => row[h]?.toFixed(6) ?? "").join(","))
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
  const download = useCallback((data: Record<string, number>[], filename: string) => {
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
