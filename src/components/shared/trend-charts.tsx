"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Chart tren (token warna dari globals.css).
 * Label SIMULATOR wajib di dekat chart kondisi (PRD).
 */

const dayFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

function dayTick(day: string) {
  const d = new Date(day);
  return Number.isNaN(d.getTime()) ? day : dayFmt.format(d);
}

function fullDay(day: string) {
  const d = new Date(day);
  return Number.isNaN(d.getTime())
    ? day
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(d);
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--ink)",
} as const;

export function ConditionTrendChart({
  data,
  height = 360,
}: {
  data: Array<{ day: string; compliant: number; atRisk: number }>;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="compliantFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--compliant)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--compliant)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="atRiskFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--warning)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={dayTick}
            tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : Number(value ?? 0);
              const label = name === "compliant" ? "Sesuai batas" : "Di luar batas";
              return [v, label] as [number, string];
            }}
            labelFormatter={(label) => fullDay(String(label))}
            contentStyle={tooltipStyle}
          />
          <Area
            type="monotone"
            dataKey="compliant"
            stroke="var(--compliant)"
            strokeWidth={2}
            fill="url(#compliantFill)"
          />
          <Area
            type="monotone"
            dataKey="atRisk"
            stroke="var(--warning)"
            strokeWidth={2}
            fill="url(#atRiskFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HandoffTrendChart({
  data,
  height = 360,
}: {
  data: Array<{ day: string; dicatat: number; dikonfirmasi: number }>;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }} barGap={4}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={dayTick}
            tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="dicatat" name="Dicatat" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="dikonfirmasi"
            name="Dikonfirmasi"
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
