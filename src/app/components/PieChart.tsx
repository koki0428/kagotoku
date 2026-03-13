"use client";

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: Slice[];
  size?: number;
}

export default function PieChart({ data, size = 160 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const r = size / 2;
  const cx = r;
  const cy = r;
  const innerR = r * 0.55; // ドーナツ型

  let startAngle = -Math.PI / 2;
  const paths = data.map((slice) => {
    const angle = (slice.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");

    startAngle = endAngle;
    return { d, color: slice.color, label: slice.label, value: slice.value };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} />
        ))}
        {/* 中央テキスト */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="11"
          fill="#888"
        >
          合計
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#333"
        >
          ¥{total.toLocaleString()}
        </text>
      </svg>

      {/* 凡例 */}
      <div className="flex flex-col gap-1.5">
        {data.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2 text-xs">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-foreground">{slice.label}</span>
            <span className="text-muted ml-auto font-medium">
              ¥{slice.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
