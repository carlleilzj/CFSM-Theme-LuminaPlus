import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parseIpv6LatencyWindow } from "@/services/cfsm/mappers";
import type { PingLiveSample } from "@/services/pingLiveStore";
import {
  getRawServerSnapshot,
  subscribeToNodeMeta,
} from "@/services/wsStore";

/**
 * IPv6 三网的探测窗口。
 *
 * 与 IPv4 的区别：IPv4 的窗口会写进 pingLiveStore 逐点累积（wsStore 的
 * `seedPingHistory`），那是为图表服务的共享状态。IPv6 面板目前只出现在详情页，
 * 没必要为此改动全局 store 的存储结构——直接从原始 server 对象解析即可，
 * 订阅 `subscribeToNodeMeta` 保证后端推送到达时重新计算。
 */
export function useIpv6LatencyWindow(uuid: string): PingLiveSample[] {
  const subscribe = useCallback(
    (callback: () => void) => subscribeToNodeMeta(uuid, callback),
    [uuid],
  );
  const getSnapshot = useCallback(
    () => getRawServerSnapshot(uuid),
    [uuid],
  );
  const raw = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo(() => (raw ? parseIpv6LatencyWindow(raw) : []), [raw]);
}
