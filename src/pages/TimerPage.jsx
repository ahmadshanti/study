import { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db, ANTI_CHEAT_INTERVAL_SECONDS, ANTI_CHEAT_RESPONSE_WINDOW_SECONDS } from "../lib/firebase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { startActiveSession, clearActiveSession, recordStudyMinutes } from "../lib/sessions.js";
import { createRoom, joinRoom } from "../lib/rooms.js";
import Dial from "../components/Dial.jsx";
import LiveList from "../components/LiveList.jsx";
import AntiCheatOverlay from "../components/AntiCheatOverlay.jsx";
import RoomModal from "../components/RoomModal.jsx";
import { PlayIcon, PauseIcon, StopIcon, PlusIcon, KeyIcon, DoorExitIcon, UsersIcon } from "../components/icons.jsx";

const DEFAULT_ROOM_STATUS = "مش داخل أي غرفة (بتدرس منفرد وبتنحسب بالعام برضو)";
const DURATION_OPTIONS = [15, 25, 30, 45, 60, 90];
const BREAKS_OPTIONS = [0, 1, 2, 3, 4];
const BREAK_SECONDS = 5 * 60;

export default function TimerPage() {
  const { uid, name } = useAuth();

  // إعداد الجلسة (قبل ما تبلش)
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [breaksCount, setBreaksCount] = useState(1);
  const [task, setTask] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");

  // حالة الجلسة الشغالة
  const [phase, setPhase] = useState("idle"); // idle | work | break
  const [sessionActive, setSessionActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [totalSegments, setTotalSegments] = useState(1);
  const [segmentSeconds, setSegmentSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [roomId, setRoomId] = useState(null);
  const [roomStatus, setRoomStatus] = useState(DEFAULT_ROOM_STATUS);
  const [liveDocs, setLiveDocs] = useState([]);
  const [antiCheatVisible, setAntiCheatVisible] = useState(false);
  const [roomModalMode, setRoomModalMode] = useState(null);

  const sessionInfoRef = useRef({ task: "", subjectId: null, subjectName: null, roomId: null });
  const antiCheatTimeoutRef = useRef(null);
  const antiCheatDeadlineRef = useRef(null);
  const hiddenAtRef = useRef(null);

  // تحميل المواد التنافسية
  useEffect(() => {
    (async () => {
      const q = query(collection(db, "subjects"), where("isActive", "==", true));
      const snap = await getDocs(q);
      setSubjects(snap.docs.map((d) => ({ id: d.id, name: d.data().name })));
    })();
  }, []);

  // قائمة الشغالين هلق (Live)
  useEffect(() => {
    const q = query(collection(db, "activeUsers"));
    const unsub = onSnapshot(q, (snap) => {
      setLiveDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

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
        try { await clearActiveSession(uid); } catch (err) { /* لا شي نعمله هون، الجلسة خلصت أصلاً */ }
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

  async function handleStart() {
    const t = task.trim() || "بدون عنوان";
    const subject = subjects.find((s) => s.id === subjectId);

    sessionInfoRef.current = {
      task: t,
      subjectId: subjectId || null,
      subjectName: subject ? subject.name : null,
      roomId,
    };

    const segments = breaksCount + 1;
    const workSeconds = Math.max(60, Math.round((durationMinutes * 60) / segments));

    await startActiveSession({
      uid, name,
      task: t,
      subjectId: sessionInfoRef.current.subjectId,
      subjectName: sessionInfoRef.current.subjectName,
      roomId,
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

  async function handleCreateRoom({ name: roomName, password }) {
    const newRoomId = await createRoom({ name: roomName, password, uid });
    setRoomId(newRoomId);
    setRoomStatus(`✅ داخل غرفة: ${roomName} — شارك الكود: ${newRoomId}`);
    setRoomModalMode(null);
  }

  async function handleJoinRoom({ roomId: joinId, password }) {
    const room = await joinRoom({ roomId: joinId, password });
    setRoomId(room.roomId);
    setRoomStatus(`✅ داخل غرفة: ${room.name}`);
    setRoomModalMode(null);
  }

  function handleLeaveRoom() {
    setRoomId(null);
    setRoomStatus(DEFAULT_ROOM_STATUS);
  }

  const dialTaskLabel = phase === "break" ? "استراحة ☕" : sessionInfoRef.current.task || "جاهز تبلش؟";

  return (
    <div className="container">
      <div className="grid-2">
        <div>
          <div className="card">
            <h2>أهلين، <span>{name || "..."}</span> 👋</h2>
            <p className="muted">حدد مدة الدراسة وعدد البريكات، وابلش. رح يظهرك لباقي الطلاب بالـ Live لحد ما تخلص.</p>

            <div className="dial-wrap">
              <Dial
                remainingSeconds={sessionActive ? remainingSeconds : durationMinutes * 60}
                totalSeconds={sessionActive ? (phase === "break" ? BREAK_SECONDS : segmentSeconds) : durationMinutes * 60}
                task={dialTaskLabel}
                phase={phase === "break" ? "break" : "work"}
              />

              {sessionActive && (
                <span className={`phase-badge ${phase === "break" ? "break" : "work"}`}>
                  {phase === "break" ? "وقت استراحة" : `شوط ${segmentIndex + 1} من ${totalSegments}`}
                </span>
              )}

              {sessionActive && totalSegments > 1 && (
                <div className="segment-dots">
                  {Array.from({ length: totalSegments }).map((_, i) => (
                    <span key={i} className={i < segmentIndex ? "done" : i === segmentIndex && phase === "work" ? "current" : ""} />
                  ))}
                </div>
              )}

              {sessionActive && paused && (
                <p className="muted" style={{ margin: 0 }}>الوقت متوقف مؤقتاً</p>
              )}

              <div className="timer-actions">
                {!sessionActive ? (
                  <button className="btn btn-primary" onClick={handleStart}><PlayIcon /> ابلش الجلسة</button>
                ) : (
                  <>
                    {!paused ? (
                      <button className="btn" onClick={handlePause}><PauseIcon /> إيقاف مؤقت</button>
                    ) : (
                      <button className="btn btn-primary" onClick={handleResume}><PlayIcon /> استكمال</button>
                    )}
                    <button className="btn btn-danger" onClick={handleStop}><StopIcon /> خلص الجلسة</button>
                  </>
                )}
              </div>
            </div>

            {!sessionActive && (
              <div className="setup-row" style={{ marginTop: 8 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>مدة الدراسة</label>
                  <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}>
                    {DURATION_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m} دقيقة{m >= 60 ? ` (${m / 60} ساعة)` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>عدد البريكات (5 دقايق لكل وحدة)</label>
                  <select value={breaksCount} onChange={(e) => setBreaksCount(Number(e.target.value))}>
                    {BREAKS_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b === 0 ? "بدون بريك" : `${b} بريك`}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="field" style={{ marginTop: 20 }}>
              <label>شو رح تدرس؟ (تاسك حر)</label>
              <input
                type="text"
                value={task}
                disabled={sessionActive}
                onChange={(e) => setTask(e.target.value)}
                placeholder="مثال: مراجعة Chapter 3 - Operating Systems"
              />
            </div>

            <div className="field">
              <label>أو اختار مادة تنافسية (بتنحسب بليدربورد خاص فيها)</label>
              <select value={subjectId} disabled={sessionActive} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">— بدون مادة تنافسية (تاسك حر) —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card">
            <div className="section-title"><h3 style={{ margin: 0, fontSize: 15 }}>الغرفة (اختياري)</h3></div>
            <div className="status-chip"><UsersIcon /> {roomStatus}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => setRoomModalMode("create")}><PlusIcon /> إنشاء غرفة</button>
              <button className="btn" onClick={() => setRoomModalMode("join")}><KeyIcon /> انضمام لغرفة</button>
              <button className="btn" onClick={handleLeaveRoom}><DoorExitIcon /> مغادرة الغرفة</button>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="section-title">
              <h3 style={{ margin: 0, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="dot"></span> شغالين الان
              </h3>
            </div>
            <div>
              <LiveList docs={liveDocs} />
            </div>
          </div>
        </div>
      </div>

      <AntiCheatOverlay visible={antiCheatVisible} onConfirm={handleAntiCheatConfirm} />

      {roomModalMode && (
        <RoomModal
          mode={roomModalMode}
          onClose={() => setRoomModalMode(null)}
          onCreate={handleCreateRoom}
          onJoin={handleJoinRoom}
        />
      )}
    </div>
  );
}
