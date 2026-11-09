import { useMemo } from "react";
import { t } from "@/i18n";
import { lossHeatColor } from "@/utils/metricTone";
import type { PingLiveSample } from "@/services/pingLiveStore";
import {
  IPV6_CARRIER_KEYS,
  type CarrierNames,
  type Ipv6CarrierPing,
} from "@/types/cfsm";

/**
 * 「国内三网 IPv6」面板：延迟 / 丢包两组柱状网格，与 IPv4 三网面板视觉对称。
 *
 * 数据来自 `parseIpv6LatencyWindow`（后端 ping6/loss6 窗口）。
 * 与 IPv4 的关键差异：`loss6 = -1` 表示探测点不可用（目标无 AAAA 或本机无 IPv6 出口），
 * 这类格子既不画延迟也不画丢包，与「100% 丢包」的红格严格区分。
 */

const CARRIER_DOT_CLASS = {
  ct: "is-ct",
  cu: "is-cu",
  cm: "is-cm",
} as const;

const MAX_BUCKETS = 48;

interface CarrierRow {
  key: (typeof IPV6_CARRIER_KEYS)[number];
  label: string;
  latestLatency: number | null;
  averageLoss: number | null;
  buckets: Array<{ latency: number | null; loss: number | null }>;
}

function latencyTone(value: number): string {
  if (value <= 60) return "var(--latency-excellent)";
  if (value <= 120) return "var(--latency-good)";
  if (value <= 200) return "var(--latency-moderate)";
  if (value <= 300) return "var(--latency-poor)";
  return "var(--latency-bad)";
}

function buildBuckets(samples: PingLiveSample[], key: string) {
  const recent = samples.slice(-MAX_BUCKETS);
  return recent.map((sample) => {
    const row = sample.ping as unknown as Record<string, number | null>;
    const latency = row[key] ?? null;
    const loss = row[`loss${key.charAt(0).toUpperCase()}${key.slice(1)}`] ?? null;
    return { latency, loss };
  });
}

function buildRows(
  samples: PingLiveSample[],
  live: Ipv6CarrierPing,
  names: CarrierNames,
): CarrierRow[] {
  return IPV6_CARRIER_KEYS.map((key) => {
    const buckets = buildBuckets(samples, key);
    const latencyValues = buckets
      .map((bucket) => bucket.latency)
      .filter((value): value is number => typeof value === "number" && value > 0);
    const lossValues = buckets
      .map((bucket) => bucket.loss)
      .filter((value): value is number => typeof value === "number" && value >= 0);

    return {
      key,
      label: names[key],
      latestLatency:
        latencyValues.length > 0
          ? latencyValues[latencyValues.length - 1]
          : live[key].latency,
      averageLoss:
        lossValues.length > 0
          ? lossValues.reduce((sum, value) => sum + value, 0) / lossValues.length
          : live[key].loss,
      buckets,
    };
  }).filter((row) => row.buckets.length > 0);
}

function Grid({
  rows,
  mode,
}: {
  rows: CarrierRow[];
  mode: "latency" | "loss";
}) {
  return (
    <div className="ipv6-strip-grid">
      {rows.map((row) => (
        <div className="ipv6-strip-row" key={`${mode}-${row.key}`}>
          <div className="ipv6-strip-head">
            <span
              className={`ipv6-strip-dot ${CARRIER_DOT_CLASS[row.key]}`}
              aria-hidden
            />
            <span className="ipv6-strip-name">{row.label}</span>
            <strong className="ipv6-strip-value">
              {mode === "latency"
                ? row.latestLatency !== null
                  ? `${Math.round(row.latestLatency)} ms`
                  : t("ipv6.timeout")
                : row.averageLoss !== null
                  ? `${Math.round(row.averageLoss)}%`
                  : "--"}
            </strong>
          </div>
          <div className="ipv6-strip-buckets">
            {row.buckets.map((bucket, index) => {
              const value = mode === "latency" ? bucket.latency : bucket.loss;
              const has = typeof value === "number" && value >= 0;
              const color =
                mode === "latency"
                  ? has
                    ? latencyTone(value as number)
                    : "var(--fill-tertiary)"
                  : has
                    ? lossHeatColor(value as number)
                    : "var(--fill-tertiary)";
              return (
                <span
                  key={index}
                  className="ipv6-strip-bucket"
                  style={{
                    background: color,
                    opacity: has ? 0.95 : 0.35,
                  }}
                  title={
                    has
                      ? mode === "latency"
                        ? `${Math.round(value as number)} ms`
                        : `${Math.round(value as number)}%`
                      : t("ipv6.noSample")
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ThreeNetIpv6Panel({
  samples,
  live,
  windowHours,
  names,
}: {
  samples: PingLiveSample[];
  live: Ipv6CarrierPing;
  windowHours: number;
  names: CarrierNames;
}) {
  const rows = useMemo(
    () => buildRows(samples, live, names),
    [samples, live, names],
  );
  if (rows.length === 0) return null;

  const total = rows[0]?.buckets.length ?? 0;

  return (
    <section className="ipv6-section">
      <header className="ipv6-section-head">
        <span className="ipv6-section-title">{t("ipv6.title")}</span>
        <span className="ipv6-section-meta">
          {t("ipv6.window", { hours: windowHours, points: total })}
        </span>
      </header>
      <div className="ipv6-section-body">
        <div className="ipv6-subcard">
          <div className="ipv6-subcard-title">{t("ipv6.latency")}</div>
          <Grid rows={rows} mode="latency" />
        </div>
        <div className="ipv6-subcard">
          <div className="ipv6-subcard-title">{t("ipv6.loss")}</div>
          <Grid rows={rows} mode="loss" />
        </div>
      </div>
    </section>
  );
}
