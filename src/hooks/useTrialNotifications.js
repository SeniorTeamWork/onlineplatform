import { useEffect, useRef, useState } from "react";

import { useApp } from "../context/AppContext";
import { api } from "../services/cloud";

import {
  unreadTrialLessons,
  markTrialNoticeSeen,
} from "../services/trialNotifications";

const EVENT = "academy-trial-notice-seen";

export function useTrialNotifications(data) {
  const { user, cloud } = useApp();

  const [snapshot, setSnapshot] = useState({
    owner: null,
    ids: [],
  });

  const userId = user?.id;
  const admin = user?.role === "admin";

  useEffect(() => {
    if (!cloud || !userId || !admin) return;

    let alive = true;
    let pending = false;

    async function load() {
      if (
        pending ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      pending = true;

      try {
        const result = await api("trialNoticeStatus");

        if (alive) {
          setSnapshot({
            owner: userId,
            ids: result.studentIds || [],
          });
        }
      } catch {
        // Tekshirish muvaffaqiyatsiz bo‘lsa,
        // oldingi natijani saqlaymiz.
      } finally {
        pending = false;
      }
    }

    load();

    const timer = setInterval(load, 15000);

    window.addEventListener(EVENT, load);
    document.addEventListener("visibilitychange", load);

    return () => {
      alive = false;
      clearInterval(timer);

      window.removeEventListener(EVENT, load);
      document.removeEventListener(
        "visibilitychange",
        load
      );
    };
  }, [cloud, userId, admin]);

  if (!admin) return new Set();

  if (cloud) {
    return new Set(
      snapshot.owner === userId ? snapshot.ids : []
    );
  }

  return new Set(
    (data.users || [])
      .filter(
        (student) =>
          unreadTrialLessons(data, student.id).length > 0
      )
      .map((student) => student.id)
  );
}

export function useMarkTrialNoticeSeen(studentId) {
  const app = useApp();

  const latest = useRef(app);
  latest.current = app;

  const userId = app.user?.id;

  useEffect(() => {
    if (!studentId || !userId) return;

    let alive = true;
    let timer;

    async function mark(attempt = 0) {
      const {
        user,
        cloud,
        command,
        update,
        notify,
      } = latest.current;

      if (!alive || user?.role !== "admin") return;

      try {
        if (cloud) {
          await command("seeTrialNotice", {
            userId: studentId,
          });
        } else {
          const saved = await update((draft) =>
            markTrialNoticeSeen(draft, studentId)
          );

          if (!saved) {
            throw Error(
              "Bildirishnoma ko‘rilganligi saqlanmadi."
            );
          }
        }

        if (alive) {
          window.dispatchEvent(new Event(EVENT));
        }
      } catch (error) {
        if (!alive) return;

        if (attempt < 2) {
          timer = setTimeout(
            () => mark(attempt + 1),
            1000
          );
        } else {
          notify(
            error.message ||
              "Bildirishnoma ko‘rilganligi saqlanmadi."
          );
        }
      }
    }

    mark();

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [studentId, userId]);
}