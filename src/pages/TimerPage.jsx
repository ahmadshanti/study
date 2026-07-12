import { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db, ANTI_CHEAT_INTERVAL_SECONDS, ANTI_CHEAT_RESPONSE_WINDOW_SECONDS } from "../lib/firebase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { startActiveSession, endActiveSession } from "../lib/sessions.js";
import { createRoom, joinRoom } from "../lib/rooms.js";
import Dial from "../components/Dial.jsx";
import LiveList from "../components/LiveList.jsx";
import AntiCheatOverlay from "../components/AntiCheatOverlay.jsx";
import RoomModal from "../components/RoomModal.jsx";
import { PlayIcon, PauseIcon, StopIcon, PlusIcon, KeyIcon, DoorExitIcon, UsersIcon } from "../components/icons.jsx";

const DEFAULT_ROOM_STATUS = "مش داخل أي غرفة (بتدرس منفرد وبتنحسب بالعام برضو)";

export default function TimerPage() {
  const { uid, name } = useAuth();

  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dialTask, setDialTask] = useState("جاهز تبلش؟");
  const [task, setTask] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [roomStatus, setRoomStatus] = useState(DEFAULT_ROOM_STATUS);
  const [liveDocs, setLiveDocs] = useState([]);
  const [antiCheatVisible, setAntiCheatVisible] = useState(false);
  const [roomModalMode, setRoomModalMode] = useState(null);

  const secondsRef = useRef(0);
  const sessionInfoRef = useRef({ task: "", subjectId: null, subjectName: null, roomId: null });
  const antiCheatTimeoutRef = useRef(null);
  const antiCheatDeadlineRef = useRef(null);
  const hiddenAtRef = useRef(null);

  useEffect(() => {
    secondsRef.current = secondsElapsed;
  }, [secondsElapsed]);

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

  // عداد الوقت
  useEffect(() => {
    if (!sessionActive || paused) return;
    const id = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [sessionActive, paused]);

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

  // تنظيف المؤقتات لو المستخدم غادر الصفحة والجلسة لسا شغالة
  useEffect(() => () => clearAntiCheat(), []);

  // تحذير لو سكر التاب فترة طويلة
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

    await startActiveSession({
      uid,
      name,
      task: t,
      subjectId: sessionInfoRef.current.subjectId,
      subjectName: sessionInfoRef.current.subjectName,
      roomId,
    });

    secondsRef.current = 0;
    setSecondsElapsed(0);
    setDialTask(t);
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
    scheduleAntiCheat();
  }

  async function handleStop() {
    clearAntiCheat();
    setSessionActive(false);
    setPaused(false);

    const info = sessionInfoRef.current;
    const elapsedMinutes = secondsRef.current / 60;

    const { savedMinutes } = await endActiveSession({
      uid,
      name,
      task: info.task,
      subjectId: info.subjectId,
      subjectName: info.subjectName,
      roomId: info.roomId,
      elapsedMinutes,
    });

    setDialTask("جاهز تبلش؟");
    setSecondsElapsed(0);
    secondsRef.current = 0;

    if (savedMinutes > 0) {
      alert(`💪 سجلنا ${savedMinutes} دقيقة! استمر.`);
    }
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

  return (
    <div className="container">
      <div className="grid-2">
        <div>
          <div className="card">
            <h2>أهلين، <span>{name || "..."}</span> 👋</h2>
            <p className="muted">اختار شو رح تدرس، وابلش. رح يظهرك لباقي الطلاب بالـ Live لحد ما تخلص.</p>

            <div className="dial-wrap">
              <Dial secondsElapsed={secondsElapsed} dialTask={dialTask} />

              {sessionActive && paused && (
                <p className="muted" style={{ margin: "-8px 0 0" }}>الوقت متوقف مؤقتاً</p>
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
                <span className="dot"></span> شغالين هلق
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
