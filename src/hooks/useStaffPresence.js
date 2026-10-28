import { useEffect } from "react";
import { api } from "../services/cloud";

export default function useStaffPresence(user, cloud) {
  const id = user?.id;
  const enabled = cloud && user?.role === "admin" && user?.active === true;
  useEffect(() => {
    if (!enabled || !id) return;
    let stopped = false;
    let pending = false;
    let lastSent = 0;
    async function heartbeat() {
      if (stopped || pending || document.visibilityState !== "visible") return;
      if (Date.now() - lastSent < 25000) return;
      pending = true;
      lastSent = Date.now();
      try {
        await api("staffHeartbeat");
      } catch {
        // A monitoring outage must not interrupt ordinary work.
        // The overview reports loading errors and expires stale presence.
      } finally {
        pending = false;
      }
    }
    heartbeat();
    const timer = setInterval(heartbeat, 30000);
    document.addEventListener("visibilitychange", heartbeat);
    window.addEventListener("focus", heartbeat);
    window.addEventListener("online", heartbeat);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", heartbeat);
      window.removeEventListener("focus", heartbeat);
      window.removeEventListener("online", heartbeat);
    };
  }, [id, enabled]);
}
