import { useEffect, useRef, useState } from "react";
import {
  ANTI_CHEAT_INTERVAL_SECONDS,
  ANTI_CHEAT_RESPONSE_WINDOW_SECONDS,
  LEADERBOARD_FLUSH_SECONDS,
} from "../lib/firebase.js";
import { startActiveSession, clearActiveSession, recordStudyMinutes } from "../lib/sessions.js";

export const BREAK_SECONDS = 5 * 60;

/**
 * منطق تايمر بومودورو (مدة + عدد بريكات + عد تنازلي + anti-cheat) —
 * مشترك بين تايمر الطالب الشخصي (TimerPage) وتايمر الغرفة (RoomPage).
 *
 * العد التنازلي محسوب من ساعة الجهاز (وقت انتهاء الشوط كـ timestamp) مش من
 * عدد مرات تكّة setInterval — لأنه المتصفح بيبطّئ التايمرات بالتابات المخفية،
 * وإلا الشوط "بيتجمد" لو الطالب طلع من التاب وبضل شغال للأبد.
 *
 * الدقايق المنجزة بترتفع للليدربورد كل LEADERBOARD_FLUSH_SECONDS أثناء الشوط
 * (مش بس بآخره) عشان تقدم الطالب يظهر قدام الكل أول بأول.
 */
export function usePomodoroTimer({ uid, name }) {
  const [phase, setPhase] = useState("idle"); // idle | work | break
  const [sessionActive, setSessionActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [totalSegments, setTotalSegments] = useState(1);
  const [segmentSeconds, setSegmentSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [antiCheatVisible, setAntiCheatVisible] = useState(false);

  const sessionInfoRef = useRef({ task: "", subjectId: null, subjectName: null, roomId: null });
  const segmentEndAtRef = useRef(null);      // timestamp (ms) نهاية الشوط الحالي
  const flushedSecondsRef = useRef(0);        // قديش انرفع للليدربورد من الشوط الحالي
  const flushingRef = useRef(false);
  const flushCooldownUntilRef = useRef(0);    // لو فشل الرفع، ما نعيد المحاولة كل ثانية
  const antiCheatTimeoutRef = useRef(null);
  const antiCheatDeadlineRef = useRef(null);
  const hiddenAtRef = useRef(null);

  // عداد العد التنازلي — بيحسب المتبقي من ساعة الجهاز كل تكّة
  useEffect(() => {
    if (!sessionActive || paused) return;

    function tick() {
      const remaining = Math.max(0, Math.round((segmentEndAtRef.current - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      maybeFlushProgress(remaining);
    }

    tick(); // تكّة فورية عشان الرندر الأول يكون دقيق
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionActive, paused, phase, segmentSeconds]);

  // لما الوقت يخلص لشوط العمل أو الاستراحة الحالي
  useEffect(() => {
    if (!sessionActive || remainingSeconds > 0) return;
    handleSegmentComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  /**
   * بترفع الدقايق المتراكمة (يلي لسا ما انرفعت) للليدربورد كل فترة أثناء شوط العمل.
   */
  function maybeFlushProgress(remaining) {
    if (phase !== "work" || flushingRef.current || remaining <= 0) return;
    if (Date.now() < flushCooldownUntilRef.current) return;

    const elapsed = segmentSeconds - remaining;
    const unflushed = elapsed - flushedSecondsRef.current;
    if (unflushed < LEADERBOARD_FLUSH_SECONDS) return;

    flushingRef.current = true;
    const info = sessionInfoRef.current;
    recordStudyMinutes({
      uid, name,
      task: info.task,
      subjectId: info.subjectId,
      subjectName: info.subjectName,
      roomId: info.roomId,
      minutes: unflushed / 60,
    })
      .then(() => { flushedSecondsRef.current += unflushed; })
      .catch(() => { flushCooldownUntilRef.current = Date.now() + 60 * 1000; })
      .finally(() => { flushingRef.current = false; });
  }

  async function handleSegmentComplete() {
    if (phase === "work") {
      const info = sessionInfoRef.current;
      const unflushedSeconds = segmentSeconds - flushedSecondsRef.current;
      if (unflushedSeconds > 0) {
        try {
          await recordStudyMinutes({
            uid, name,
            task: info.task,
            subjectId: info.subjectId,
            subjectName: info.subjectName,
            roomId: info.roomId,
            minutes: unflushedSeconds / 60,
          });
        } catch (err) {
          alert("صار خطأ بتسجيل الوقت (تأكد إنك متصل بالإنترنت) — بس رح نكمل الجلسة.");
        }
      }
      flushedSecondsRef.current = 0;

      const nextIndex = segmentIndex + 1;
      if (nextIndex >= totalSegments) {
        try { await clearActiveSession(uid); } catch (err) { /* الجلسة خلصت أصلاً */ }
        setSessionActive(false);
        setPhase("idle");
        clearAntiCheat();
        alert(`🎉 خلصت الجلسة! سجلنا ${Math.round((segmentSeconds / 60) * totalSegments)} دقيقة إجمالي.`);
        return;
      }

      setSegmentIndex(nextIndex);
      setPhase("break");
      segmentEndAtRef.current = Date.now() + BREAK_SECONDS * 1000;
      setRemainingSeconds(BREAK_SECONDS);
      clearAntiCheat();
    } else if (phase === "break") {
      setPhase("work");
      segmentEndAtRef.current = Date.now() + segmentSeconds * 1000;
      setRemainingSeconds(segmentSeconds);
      scheduleAntiCheat();
    }
  }

  function clearAntiCheat() {
    if (antiCheatTimeoutRef.current) clearTimeout(antiCheatTimeoutRef.current);
    if (antiCheatDeadlineRef.current) clearTimeout(antiCheatDeadlineRef.current);
    antiCheatTimeoutRef.current = null;
    antiCheatDeadlineRef.current = null;
    setAntiCheatVisible(false);
  }

  function scheduleAntiCheat() {
    clearAntiCheat();
    antiCheatTimeoutRef.current = setTimeout(() => {
      setAntiCheatVisible(true);
      notifyIfHidden();
      antiCheatDeadlineRef.current = setTimeout(() => {
        setAntiCheatVisible(false);
        handleStop();
      }, ANTI_CHEAT_RESPONSE_WINDOW_SECONDS * 1000);
    }, ANTI_CHEAT_INTERVAL_SECONDS * 1000);
  }

  // لو الطالب برا التاب لما يطلع سؤال "لسا عم تدرس؟"، منبعتله إشعار متصفح
  // عشان ينتبه قبل ما تنوقف الجلسة تلقائياً.
  function notifyIfHidden() {
    try {
      if (!document.hidden || !("Notification" in window)) return;
      if (Notification.permission === "granted") {
        new Notification("لسا عم تدرس؟ 📚", {
          body: `ارجع للتاب وأكد خلال ${ANTI_CHEAT_RESPONSE_WINDOW_SECONDS} ثانية وإلا رح نوقف حسبة الوقت.`,
        });
      }
    } catch (err) {
      // الإشعارات مش أساسية — لو فشلت منكمل عادي
    }
  }

  function handleAntiCheatConfirm() {
    if (antiCheatDeadlineRef.current) clearTimeout(antiCheatDeadlineRef.current);
    setAntiCheatVisible(false);
    scheduleAntiCheat();
  }

  useEffect(() => () => clearAntiCheat(), []);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && sessionActive) {
        hiddenAtRef.current = Date.now();
      } else if (!document.hidden && sessionActive && hiddenAtRef.current) {
        const awaySeconds = (Date.now() - hiddenAtRef.current) / 1000;
        if (awaySeconds > 180) {
          alert("لاحظنا إنك سكرت التاب فترة طويلة — انتبه إنه سؤال التأكيد بيطلع كل 10 دقايق وبيوقف الجلسة لو ما جاوبت.");
        }
        hiddenAtRef.current = null;
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [sessionActive]);

  useEffect(() => {
    function handleBeforeUnload() {
      if (sessionActive) {
        navigator.sendBeacon && navigator.sendBeacon("about:blank");
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionActive]);

  async function handleStart({ task, subjectId, subjectName, roomId, durationMinutes, breaksCount }) {
    sessionInfoRef.current = {
      task,
      subjectId: subjectId || null,
      subjectName: subjectName || null,
      roomId: roomId || null,
    };

    const segments = breaksCount + 1;
    const workSeconds = Math.max(60, Math.round((durationMinutes * 60) / segments));

    await startActiveSession({
      uid, name,
      task,
      subjectId: sessionInfoRef.current.subjectId,
      subjectName: sessionInfoRef.current.subjectName,
      roomId: sessionInfoRef.current.roomId,
    });

    // منطلب إذن الإشعارات هون (لازم يكون ضمن تفاعل مستخدم حتى المتصفح يقبل)
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch (err) { /* مش أساسي */ }

    flushedSecondsRef.current = 0;
    flushCooldownUntilRef.current = 0;
    segmentEndAtRef.current = Date.now() + workSeconds * 1000;
    setTotalSegments(segments);
    setSegmentSeconds(workSeconds);
    setSegmentIndex(0);
    setPhase("work");
    setRemainingSeconds(workSeconds);
    setSessionActive(true);
    setPaused(false);
    scheduleAntiCheat();
  }

  function handlePause() {
    clearAntiCheat();
    // منثبّت المتبقي الحالي — وقت الاستئناف منرجع نحسب نهاية جديدة من هلق
    const remaining = Math.max(0, Math.round((segmentEndAtRef.current - Date.now()) / 1000));
    setRemainingSeconds(remaining);
    setPaused(true);
  }

  function handleResume() {
    segmentEndAtRef.current = Date.now() + remainingSeconds * 1000;
    setPaused(false);
    if (phase === "work") scheduleAntiCheat();
  }

  async function handleStop() {
    clearAntiCheat();

    if (phase === "work") {
      const remaining = paused
        ? remainingSeconds
        : Math.max(0, Math.round((segmentEndAtRef.current - Date.now()) / 1000));
      const elapsedSeconds = segmentSeconds - remaining;
      const unflushedSeconds = elapsedSeconds - flushedSecondsRef.current;
      const info = sessionInfoRef.current;
      if (unflushedSeconds > 0) {
        try {
          await recordStudyMinutes({
            uid, name,
            task: info.task,
            subjectId: info.subjectId,
            subjectName: info.subjectName,
            roomId: info.roomId,
            minutes: unflushedSeconds / 60,
          });
        } catch (err) {
          alert("صار خطأ بتسجيل الوقت (تأكد إنك متصل بالإنترنت).");
        }
      }
    }

    try { await clearActiveSession(uid); } catch (err) { /* بنصفّر الحالة محلياً برضو */ }

    flushedSecondsRef.current = 0;
    setSessionActive(false);
    setPaused(false);
    setPhase("idle");
    setSegmentIndex(0);
    setRemainingSeconds(0);
  }

  return {
    phase,
    sessionActive,
    paused,
    segmentIndex,
    totalSegments,
    segmentSeconds,
    remainingSeconds,
    antiCheatVisible,
    currentTask: sessionInfoRef.current.task,
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    handleAntiCheatConfirm,
  };
}
