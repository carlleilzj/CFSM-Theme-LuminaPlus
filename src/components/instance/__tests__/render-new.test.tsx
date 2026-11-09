import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RouteBackboneCard } from "@/components/instance/RouteBackboneCard";
import { ThreeNetIpv6Panel } from "@/components/instance/ThreeNetIpv6Panel";
import type { CarrierNames, RouteInfo } from "@/types/cfsm";
import type { PingLiveSample } from "@/services/pingLiveStore";

const names: CarrierNames = {
  ct: "电信", cu: "联通", cm: "移动", bd: "BGP",
  node_1: "Node 1", node_2: "Node 2", node_3: "Node 3", node_4: "Node 4",
};

// 线上真实数据快照（绿云-日本软银1313 / 2026-11-09）
const route = {
  updated_at: Date.now() - 3_600_000,
  family: "ipv6",
  ct: { status: "backbone", asn: 4134, name: "CHINANET-BACKBONE", label: "电信普通骨干", hit_hop: 8 },
  cu: { status: "backbone", asn: 4837, name: "CHINA169-Backbone", label: "联通 169 骨干", hit_hop: 6 },
  cm: { status: "backbone", asn: 58453, name: "CMI-INT", label: "CMI 普通", hit_hop: 5 },
} as unknown as RouteInfo;

const samples = Array.from({ length: 12 }, (_, i) => ({
  time: Date.now() - (11 - i) * 120_000,
  ping: {
    ct: 370 + i, cu: 290 + i, cm: 110 + i,
    bd: null, node_1: null, node_2: null, node_3: null, node_4: null,
    lossCt: 0, lossCu: 0, lossCm: 0, lossBd: null,
    lossNode1: null, lossNode2: null, lossNode3: null, lossNode4: null,
  },
})) as unknown as PingLiveSample[];

const live = {
  ct: { latency: 373, loss: 0, unavailable: false },
  cu: { latency: 294, loss: 0, unavailable: false },
  cm: { latency: 113, loss: 0, unavailable: false },
};

describe("新组件渲染", () => {
  it("回程卡片：三家标签 + 相对时间 + 骨干强调", () => {
    const html = renderToStaticMarkup(<RouteBackboneCard route={route} names={names} />);
    expect(html).toContain("三网回程");
    expect(html).toContain("电信普通骨干");
    expect(html).toContain("联通 169 骨干");
    expect(html).toContain("CMI 普通");
    expect(html).toContain("1小时前");
    expect(html).toContain("is-backbone");
    expect(html).toContain("○→");
  });

  it("回程卡片：无数据占位", () => {
    const html = renderToStaticMarkup(<RouteBackboneCard route={null} names={names} />);
    expect(html).toContain("暂无路由数据");
  });

  it("IPv6 面板：延迟/丢包两列 + 三网 + 数值", () => {
    const html = renderToStaticMarkup(
      <ThreeNetIpv6Panel samples={samples} live={live} windowHours={1} names={names} />,
    );
    expect(html).toContain("国内三网 IPv6");
    expect(html).toContain("延迟");
    expect(html).toContain("丢包");
    expect(html).toContain("373 ms");
    expect(html).toContain("ipv6-strip-bucket");
    // 12 个采样 × 3 家 × 2 列
    const buckets = (html.match(/ipv6-strip-bucket/g) || []).length;
    expect(buckets).toBeGreaterThanOrEqual(72);
  });

  it("IPv6 面板：无采样时整块不渲染", () => {
    const html = renderToStaticMarkup(
      <ThreeNetIpv6Panel samples={[]} live={live} windowHours={1} names={names} />,
    );
    expect(html).toBe("");
  });
});
