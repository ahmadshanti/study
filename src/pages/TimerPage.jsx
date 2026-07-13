import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getRoom } from "../lib/rooms.js";
import { createRoom, joinRoom } from "../lib/rooms.js";
import { usePomodoroTimer, BREAK_SECONDS } from "../hooks/usePomodoroTimer.js";
import Dial from "../components/Dial.jsx";
import LiveList from "../components/LiveList.jsx";
import AntiCheatOverlay from "../components/AntiCheatOverlay.jsx";
import RoomModal from "../components/RoomModal.jsx";
import { PlayIcon, PauseIcon, StopIcon, PlusIcon, KeyIcon, DoorExitIcon, UsersIcon, EyeIcon } from "../components/icons.jsx";

const DEFAULT_ROOM_STATUS = "مش داخل أي غرفة (بتدرس منفرد وبتنحسب بالعام برضو)";
const DURATION_OPTIONS = [15, 25, 30, 45, 60, 90];
const BREAKS_OPTIONS = [0, 1, 2, 3, 4];

export default function TimerPage() {
  const { uid, name } = useAuth();
  const navigate = useNavigate();

  // إعداد الجلسة (قبل ما تبلش)
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [breaksCount, setBreaksCount] = useState(1);
  const [task, setTask] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");

  const [roomId, setRoomId] = useState(null);
  const [roomStatus, setRoomStatus] = useState(DEFAULT_ROOM_STATUS);
  const [liveDocs, setLiveDocs] = useState([]);
  const [roomModalMode, setRoomModalMode] = useState(null);

  const timer = usePomodoroTimer({ uid, name });
  const {
    phase, sessionActive, paused, segmentIndex, totalSegments, segmentSeconds, remainingSeconds,
    antiCheatVisible, currentTask, handleStart: startTimer, handlePause, handleResume, handleStop, handleAntiCheatConfirm,
  } = timer;

  // نسترجع الغرفة يلي كان الطالب داخلها لو رجع فتح الصفحة (بتتخزن محلياً بالمتصفح)
  const [roomRestoring, setRoomRestoring] = useState(!!localStorage.getItem("sp_room_id"));
  useEffect(() => {
    const savedRoomId = localStorage.getItem("sp_room_id");
    if (!savedRoomId) return;
    (async () => {
      const room = await getRoom(savedRoomId);
      if (room) {
        setRoomId(savedRoomId);
        setRoomStatus(`✅ داخل غرفة: ${room.name}`);
      } else {
        localStorage.removeItem("sp_room_id");
      }
      setRoomRestoring(false);
    })();
  }, []);

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

  async function handleStart() {
    const t = task.trim() || "بدون عنوان";
    const subject = subjects.find((s) => s.id === subjectId);
    await startTimer({
      task: t,
      subjectId: subjectId || null,
      subjectName: subject ? subject.name : null,
      roomId,
      durationMinutes,
      breaksCount,
    });
  }

  async function handleCreateRoom({ name: roomName, topic, password }) {
    const newRoomId = await createRoom({ name: roomName, topic, password, uid, creatorName: name });
    setRoomId(newRoomId);
    setRoomStatus(`✅ داخل غرفة: ${roomName} — شارك الكود: ${newRoomId}`);
    localStorage.setItem("sp_room_id", newRoomId);
    setRoomModalMode(null);
  }

  async function handleJoinRoom({ roomId: joinId, password }) {
    const room = await joinRoom({ roomId: joinId, password, uid, memberName: name });
    setRoomId(room.roomId);
    setRoomStatus(`✅ داخل غرفة: ${room.name}`);
    localStorage.setItem("sp_room_id", room.roomId);
    setRoomModalMode(null);
  }

  function handleLeaveRoom() {
    setRoomId(null);
    setRoomStatus(DEFAULT_ROOM_STATUS);
    localStorage.removeItem("sp_room_id");
  }

  const dialTaskLabel = phase === "break" ? "استراحة ☕" : currentTask || "جاهز تبلش؟";

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
                  <button className="btn btn-primary" onClick={handleStart} disabled={roomRestoring}><PlayIcon /> ابلش الجلسة</button>
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
              {roomId && (
                <button className="btn btn-primary" onClick={() => navigate(`/room/${roomId}`)}><EyeIcon /> عرض الغرفة</button>
              )}
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
