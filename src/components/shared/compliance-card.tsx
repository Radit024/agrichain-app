import { AlertTriangle } from "lucide-react";
import { SourceBadge } from "@/components/status/status-badges";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDateTime, formatPPMDisplay } from "./handoff-timeline";
import { cn } from "@/lib/utils";

/**
 * ComplianceCard (DESIGN.md §9.3): parameter aktif per profil, nilai
 * terakhir, rentang terpasang, waktu baca, sumber, alasan, dan alert
 * operasional. Wajib menyatakan "Evaluasi terhadap data tercatat" —
 * BUKAN "produk aman".
 */

export interface ComplianceRule {
  code: string;
  unit: string;
  required: boolean;
  minPPM: string | number | null;
  maxPPM: string | number | null;
  toleranceSeconds: number | null;
  severity: string;
}

const codeLabels: Record<string, string> = {
  TEMPERATURE: "Suhu",
  HUMIDITY: "Kelembapan",
  SHOCK_LEVEL: "Guncangan",
  DOOR_OPEN_DURATION: "Durasi pintu terbuka",
  COOLING_STATE: "Status pendingin",
  DEVICE_HEALTH: "Kesehatan perangkat",
  CHECKPOINT_ID: "Titik distribusi",
};

export function parameterLabel(code: string): string {
  return codeLabels[code] ?? code;
}

export function ComplianceCard({
  rules,
  reading,
  evaluation,
  className,
}: {
  rules: ComplianceRule[];
  reading: {
    readAt: string;
    deviceHealth: string;
    values: Array<{ code: string; unit: string; valuePPM: string | null }>;
  } | null;
  evaluation: {
    reasons: string[];
    alerts: string[];
    evaluatedAt: string;
  } | null;
  className?: string;
}) {
  return (
    <Card
      className={cn("rounded-xl border border-border bg-card p-5 gap-0", className)}
      aria-label="Kepatuhan data kondisi tercatat"
    >
      <CardHeader className="p-0 pb-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-ink">Data kondisi tercatat</CardTitle>
          <SourceBadge />
        </div>
        <p className="mt-1 text-xs leading-4 text-ink-muted font-normal">
          Evaluasi terhadap data kondisi yang tercatat — bukan bukti kondisi fisik produk.
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {reading ? (
          <>
            <dl className="mt-4 divide-y divide-border">
              {rules.map((rule) => {
                const m = reading.values.find((v) => v.code === rule.code);
                const value = m?.valuePPM ?? null;
                return (
                  <div
                    key={rule.code}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-2 py-2.5"
                  >
                    <div>
                      <dt className="text-sm font-medium text-ink">
                        {parameterLabel(rule.code)}
                        {rule.required ? (
                          <span className="ml-1.5 text-xs font-normal text-ink-muted">Wajib</span>
                        ) : null}
                      </dt>
                      <dd className="text-xs text-ink-muted">
                        {rangeLabel(rule)}
                        {rule.toleranceSeconds ? ` · toleransi ${rule.toleranceSeconds}s` : ""}
                      </dd>
                    </div>
                    <dd className="tnum text-right text-sm font-semibold text-ink">
                      {value !== null ? formatPPMDisplay(value) : "Belum tercatat"}
                      {value !== null ? (
                        <span className="ml-1 text-xs font-normal text-ink-muted">{rule.unit}</span>
                      ) : null}
                    </dd>
                  </div>
                );
              })}
            </dl>

            <p className="mt-3 text-xs text-ink-muted">
              Pembacaan terakhir {formatDateTime(reading.readAt)} · perangkat{" "}
              {reading.deviceHealth === "ONLINE"
                ? "daring"
                : reading.deviceHealth === "STALE"
                  ? "tertunda"
                  : "di luar jaringan"}
            </p>
          </>
        ) : (
          <p className="mt-4 rounded-lg bg-surface-muted px-3 py-3 text-sm text-ink-muted">
            Belum ada pembacaan tercatat untuk batch ini.
          </p>
        )}

        {evaluation && evaluation.alerts.length > 0 ? (
          <div className="mt-4 space-y-2">
            {evaluation.alerts.map((a, i) => (
              <p
                key={i}
                className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs leading-4 text-warning"
              >
                <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {a}
              </p>
            ))}
          </div>
        ) : null}

        {evaluation && evaluation.reasons.length > 0 ? (
          <p className="mt-3 text-xs leading-4 text-ink-muted">
            Alasan evaluasi: {evaluation.reasons.join(", ")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function rangeLabel(rule: ComplianceRule): string {
  if (
    rule.minPPM !== null &&
    rule.minPPM !== undefined &&
    rule.maxPPM !== null &&
    rule.maxPPM !== undefined
  ) {
    return `Batas ${formatPPMDisplay(rule.minPPM)}–${formatPPMDisplay(rule.maxPPM)} ${rule.unit}`;
  }
  if (rule.maxPPM !== null && rule.maxPPM !== undefined) {
    return `Maksimum ${formatPPMDisplay(rule.maxPPM)} ${rule.unit}`;
  }
  if (rule.minPPM !== null && rule.minPPM !== undefined) {
    return `Minimum ${formatPPMDisplay(rule.minPPM)} ${rule.unit}`;
  }
  return "Konteks (tanpa batas)";
}
