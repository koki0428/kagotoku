"use client";

interface Bar {
  label: string;
  value: number;
}

interface Props {
  data: Bar[];
  height?: number;
}

export default function BarChart({ data, height = 160 }: Props) {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5 justify-between" style={{ height }}>
      {data.map((bar) => {
        const barH = Math.max(4, (bar.value / maxVal) * (height - 28));
        return (
          <div
            key={bar.label}
            className="flex flex-col items-center flex-1 min-w-0"
          >
            <p className="text-[9px] text-muted font-medium mb-1 truncate w-full text-center">
              {bar.value > 0 ? `¥${(bar.value / 1000).toFixed(0)}k` : ""}
            </p>
            <div
              className="w-full rounded-t-md bg-primary/70 transition-all"
              style={{ height: barH }}
            />
            <p className="text-[10px] text-muted mt-1">{bar.label}</p>
          </div>
        );
      })}
    </div>
  );
}
