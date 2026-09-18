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

export function ConditionBarChart({
  data,
  height = 300,
}: {
  data: Array<{ day: string; compliant: number; atRisk: number }>;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }} barGap={6}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={dayTick}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
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
          <Bar
            dataKey="compliant"
            name="Sesuai batas"
            fill="#10B981"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="atRisk"
            name="Di luar batas"
            fill="#F43F5E"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConditionTrendChart({
  data,
  height = 320,
}: {
  data: Array<{ day: string; compliant: number; atRisk: number }>;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="compliantFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="atRiskFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={dayTick}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
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
            name="Sesuai batas"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#compliantFill)"
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="atRisk"
            name="Di luar batas"
            stroke="#F43F5E"
            strokeWidth={2}
            fill="url(#atRiskFill)"
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalesPurchaseBarChart({
  data,
  height = 260,
}: {
  data?: Array<{ day: string; purchase: number; sales: number }>;
  height?: number;
}) {
  const sampleData = [
    { month: "Jan", purchase: 52000, sales: 48000 },
    { month: "Feb", purchase: 58000, sales: 46000 },
    { month: "Mar", purchase: 44000, sales: 52000 },
    { month: "Apr", purchase: 36000, sales: 43000 },
    { month: "May", purchase: 42000, sales: 45000 },
    { month: "Jun", purchase: 28000, sales: 41000 },
    { month: "Jul", purchase: 54000, sales: 48000 },
    { month: "Aug", purchase: 44000, sales: 42000 },
    { month: "Sep", purchase: 45000, sales: 43000 },
    { month: "Oct", purchase: 38000, sales: 44000 },
  ];

  const chartData =
    data && data.length > 0
      ? data.map((d) => ({
          month: dayTick(d.day),
          purchase: d.purchase,
          sales: d.sales,
        }))
      : sampleData;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -10 }} barGap={6}>
          <CartesianGrid stroke="#F0F1F3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#858D9D", fontSize: 11 }}
            axisLine={{ stroke: "#E4E7EC" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#858D9D", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E4E7EC",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            }}
          />
          <Bar
            dataKey="purchase"
            name="Purchase"
            fill="#5DD4EE"
            radius={[4, 4, 0, 0]}
            maxBarSize={14}
          />
          <Bar dataKey="sales" name="Sales" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderSummaryCurveChart({ height = 260 }: { height?: number }) {
  const curveData = [
    { month: "Jan", ordered: 3800, delivered: 2800 },
    { month: "Feb", ordered: 2100, delivered: 3600 },
    { month: "Mar", ordered: 2800, delivered: 3400 },
    { month: "Apr", ordered: 1800, delivered: 2600 },
    { month: "May", ordered: 2600, delivered: 3500 },
  ];

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={curveData} margin={{ top: 12, right: 12, bottom: 0, left: -15 }}>
          <defs>
            <linearGradient id="orderedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="deliveredFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#F0F1F3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#858D9D", fontSize: 11 }}
            axisLine={{ stroke: "#E4E7EC" }}
            tickLine={false}
          />
          <YAxis tick={{ fill: "#858D9D", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E4E7EC",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            }}
          />
          <Area
            type="monotone"
            dataKey="ordered"
            name="Ordered"
            stroke="#F59E0B"
            strokeWidth={2.5}
            fill="url(#orderedFill)"
          />
          <Area
            type="monotone"
            dataKey="delivered"
            name="Delivered"
            stroke="#60A5FA"
            strokeWidth={2.5}
            fill="url(#deliveredFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HandoffTrendChart({
  data,
  height = 260,
}: {
  data: Array<{ day: string; dicatat: number; dikonfirmasi: number }>;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -15 }}>
          <defs>
            <linearGradient id="dicatatFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1570EF" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#1570EF" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="dikonfirmasiFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#F0F1F3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={dayTick}
            tick={{ fill: "#858D9D", fontSize: 11 }}
            axisLine={{ stroke: "#E4E7EC" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#858D9D", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : Number(value ?? 0);
              const label = name === "dicatat" ? "Inisiasi (Pending)" : "Dikonfirmasi";
              return [v, label] as [number, string];
            }}
            labelFormatter={(label) => fullDay(String(label))}
            contentStyle={tooltipStyle}
          />
          <Area
            type="monotone"
            dataKey="dicatat"
            name="dicatat"
            stroke="#1570EF"
            strokeWidth={2}
            fill="url(#dicatatFill)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="dikonfirmasi"
            name="dikonfirmasi"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#dikonfirmasiFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BatchTelemetryChart({
  readings,
  height = 240,
}: {
  readings: Array<{
    readAt: string;
    values: Array<{ code: string; unit: string; valuePPM: string | null }>;
  }>;
  height?: number;
}) {
  const chartData = readings
    .slice()
    .reverse()
    .map((r) => {
      const d = new Date(r.readAt);
      const time = Number.isNaN(d.getTime())
        ? r.readAt
        : new Intl.DateTimeFormat("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }).format(d);

      const tempVal = r.values.find((v) => v.code === "TEMPERATURE");
      const humVal = r.values.find((v) => v.code === "HUMIDITY");

      const temperature =
        tempVal && tempVal.valuePPM !== null ? Number(tempVal.valuePPM) / 1_000_000 : null;
      const humidity =
        humVal && humVal.valuePPM !== null ? Number(humVal.valuePPM) / 1_000_000 : null;

      return {
        time,
        temperature,
        humidity,
      };
    });

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-ink-muted">
        Belum ada data sensor telemetri untuk ditampilkan pada grafik.
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
        <AreaChart data={chartData} margin={{ top: 12, right: 16, bottom: 0, left: -15 }}>
          <defs>
            <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="humFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#F0F1F3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#858D9D", fontSize: 11 }}
            axisLine={{ stroke: "#E4E7EC" }}
            tickLine={false}
          />
          <YAxis tick={{ fill: "#858D9D", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E4E7EC",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            }}
            formatter={(val, name) => {
              if (val === null || val === undefined) return ["–", String(name)];
              const num = Number(val).toFixed(1);
              return [
                `${num} ${name === "temperature" ? "°C" : "%"}`,
                name === "temperature" ? "Suhu" : "Kelembapan",
              ];
            }}
          />
          <Area
            type="monotone"
            dataKey="temperature"
            name="temperature"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#tempFill)"
            connectNulls
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="humidity"
            name="humidity"
            stroke="#06B6D4"
            strokeWidth={2}
            fill="url(#humFill)"
            connectNulls
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
