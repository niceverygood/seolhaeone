import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Datum = { name: string; value: number; color: string };

type Props = {
  title: string;
  unit?: string;
  data: Datum[];
};

export function DonutCard({ title, unit, data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h2 className="font-display text-lg text-text-dark">{title}</h2>
      {unit && <p className="mb-3 text-xs text-text-muted">{unit}</p>}

      <div className="flex items-center gap-4">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={46}
                outerRadius={72}
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #E5E2DA",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs text-text-muted">Total</div>
              <div className="font-display text-base text-text-dark">{total}</div>
            </div>
          </div>
        </div>

        <ul className="flex-1 space-y-2 text-sm">
          {data.map((d) => {
            const pct = ((d.value / total) * 100).toFixed(1);
            return (
              <li key={d.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="text-text-dark">{d.name}</span>
                </div>
                <div className="font-mono text-xs text-text-muted">
                  {d.value} · {pct}%
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
