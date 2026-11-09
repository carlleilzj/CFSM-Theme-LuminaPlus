import type { CarrierNames, RouteCarrier, RouteInfo } from "@/types/cfsm";
import { t } from "@/i18n";

/**
 * 三网回程卡片。
 *
 * 展示后端用 ASN 数据判断出的「这台机器的回程走的是哪家运营商的哪条骨干」，
 * 例如电信 CN2/4134、联通 9929/169、移动 CMI。判定文案由后端给出（`label`），
 * 主题只负责按 status 决定视觉权重：
 * - backbone：命中骨干，强调色
 * - destination_only / none：未走骨干 / 未见该运营商，低调灰
 * - unknown：无数据，最低对比
 */

const ROUTE_KEYS = ["ct", "cu", "cm"] as const;

const CARRIER_DOT_CLASS = {
  ct: "is-ct",
  cu: "is-cu",
  cm: "is-cm",
} as const;

function formatRelative(updatedAt: number, now = Date.now()): string {
  const diff = now - updatedAt;
  if (!Number.isFinite(diff) || diff < 0) return "";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t("route.justNow");
  if (minutes < 60) return t("route.minutesAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("route.hoursAgo", { n: hours });
  return t("route.daysAgo", { n: Math.floor(hours / 24) });
}

function carrierLabel(carrier: RouteCarrier | undefined): string {
  if (!carrier || !carrier.label) return t("route.noData");
  return carrier.label;
}

export function RouteBackboneCard({
  route,
  names,
}: {
  route: RouteInfo | null;
  names: CarrierNames;
}) {
  if (!route) {
    return (
      <section className="route-back-card is-empty">
        <header className="route-back-head">
          <span className="route-back-title">{t("route.title")}</span>
        </header>
        <p className="route-back-placeholder">{t("route.noData")}</p>
      </section>
    );
  }

  return (
    <section className="route-back-card">
      <header className="route-back-head">
        <span className="route-back-title">{t("route.title")}</span>
        <span className="route-back-time">
          {formatRelative(route.updated_at)}
        </span>
      </header>
      <ul className="route-back-list">
        {ROUTE_KEYS.map((key) => {
          const carrier = route[key];
          const status = carrier?.status ?? "unknown";
          return (
            <li className="route-back-row" key={key}>
              <span
                className={`route-back-dot ${CARRIER_DOT_CLASS[key]}`}
                aria-hidden
              />
              <span className="route-back-name">{names[key]}</span>
              <span className="route-back-arrow" aria-hidden>
                ○→
              </span>
              <span
                className={`route-back-pill is-${status}`}
                title={
                  carrier?.name
                    ? `${carrier.name}${carrier.hit_hop ? ` · ${t("route.hitHop", { n: carrier.hit_hop })}` : ""}`
                    : undefined
                }
              >
                {carrierLabel(carrier)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
