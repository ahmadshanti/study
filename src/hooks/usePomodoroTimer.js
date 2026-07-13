import { useEffect, useRef, useState } from "react";
import { ANTI_CHEAT_INTERVAL_SECONDS, ANTI_CHEAT_RESPONSE_WINDOW_SECONDS } from "../lib/firebase.js";
import { startActiveSession, clearActiveSession, recordStudyMinutes } from "../lib/sessions.js";

export const BREAK_SECONDS = 5 * 60;

/**
 * منطق تايمر بومودورو (مدة + عدد بريكات + عد تنازلي + anti-cheat) —
 * مشترك بين تايمر الطالب الشخصي (TimerPage) وتايمر الغرفة (RoomPage).
 * كل استدعاء لهاد الهووك بيصير جلسة "شغالة هلق" (activeUsers) مستقلة
 * بس مفتاحها uid المستخدم، فما بينفع تشغيل جلستين بنفس الوقت لنفس الطالب.
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
  const antiCheatTimeoutRef = useRef(null);
  const antiCheatDeadlineRef = useRef(null);
  const hiddenAtRef = useRef(null);

  // عداد العد التنازلي
  useEffect(() => {
    if (!sessionActive || paused) return;
    const id = setInterval(() => setRemainingSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [sessionActive, paused]);

  // لما الوقت يخلص لشوط العمل أو الاستراحة الحالي
  useEffect(() => {
    if (!sessionActive || remainingSeconds > 0) return;
    handleSegmentComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  async function handleSegmentComplete() {
    if (phase === "work") {
      const info = sessionInfoRef.current;
      try {
        await recordStudyMinutes({
          uid, name,
          task: info.task,
          subjectId: info.subjectId,
          subjectName: info.subjectName,
          roomId: info.roomId,
          minutes: segmentSeconds / 60,
        });
      } catch (err) {
        alert("صار خطأ بتسجيل الوقت (تأكد إنك متصل بالإنترنت) — بس رح نكمل الجلسة.");
      }

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
      setRemainingSeconds(BREAK_SECONDS);
      clearAntiCheat();
    } else if (phase === "break") {
      setPhase("work");
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
      antiCheatDeadlineRef.current = setTimeout(() => {
        setAntiCheatVisible(false);
        handleStop();
      }, ANTI_CHEAT_RESPONSE_WINDOW_SECONDS * 1000);
    }, ANTI_CHEAT_INTERVAL_SECONDS * 1000);
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
          alert("لاحظنا إنك سكرت التاب فترة طويلة، فوقفنا حسبة الوقت لهاي الفترة.");
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
    setPaused(true);
  }

  function handleResume() {
    setPaused(false);
    if (phase === "work") scheduleAntiCheat();
  }

  async function handleStop() {
    clearAntiCheat();

    if (phase === "work") {
      const elapsedSeconds = segmentSeconds - remainingSeconds;
      const info = sessionInfoRef.current;
      if (elapsedSeconds > 0) {
        try {
          await recordStudyMinutes({
            uid, name,
            task: info.task,
            subjectId: info.subjectId,
            subjectName: info.subjectName,
            roomId: info.roomId,
            minutes: elapsedSeconds / 60,
          });
        } catch (err) {
          alert("صار خطأ بتسجيل الوقت (تأكد إنك متصل بالإنترنت).");
        }
      }
    }

    try { await clearActiveSession(uid); } catch (err) { /* بنصفّر الحالة محلياً برضو */ }

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
