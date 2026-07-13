import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { getRoom } from "../lib/rooms.js";
import { useAuth } from "../context/AuthContext.jsx";
import { usePomodoroTimer, BREAK_SECONDS } from "../hooks/usePomodoroTimer.js";
import Dial from "../components/Dial.jsx";
import AntiCheatOverlay from "../components/AntiCheatOverlay.jsx";
import LeaderboardRows from "../components/LeaderboardRows.jsx";
import LiveList from "../components/LiveList.jsx";
import { UsersIcon, TrophyIcon, BookIcon, PlayIcon, PauseIcon, StopIcon } from "../components/icons.jsx";

const DURATION_OPTIONS = [15, 25, 30, 45, 60, 90];
const BREAKS_OPTIONS = [0, 1, 2, 3, 4];

export default function RoomPage() {
  const { roomId } = useParams();
  const { uid, name } = useAuth();
  const [room, setRoom] = useState(undefined); // undefined = لسا عم يحمّل، null = مش موجودة
  const [members, setMembers] = useState([]);
  const [liveDocs, setLiveDocs] = useState([]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [breaksCount, setBreaksCount] = useState(1);

  const {
    phase, sessionActive, paused, segmentIndex, totalSegments, segmentSeconds, remainingSeconds,
    antiCheatVisible, handleStart: startTimer, handlePause, handleResume, handleStop, handleAntiCheatConfirm,
  } = usePomodoroTimer({ uid, name });

  useEffect(() => {
    (async () => setRoom(await getRoom(roomId)))();
  }, [roomId]);

  useEffect(() => {
    const q = query(collection(db, "rooms", roomId, "members"), orderBy("totalMinutes", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  useEffect(() => {
    const q = query(collection(db, "activeUsers"), where("roomId", "==", roomId));
    const unsub = onSnapshot(q, (snap) => {
      setLiveDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  if (room === undefined) return null;

  if (room === null) {
    return (
      <div className="container">
        <div className="card">
          <h3>ما لقينا هاي الغرفة</h3>
          <p className="muted">تأكد من الكود، أو ارجع للتايمر.</p>
          <Link to="/" className="btn btn-primary">رجوع للتايمر</Link>
        </div>
      </div>
    );
  }

  async function handleStartRoomTimer() {
    await startTimer({
      task: room.topic || room.name,
      subjectId: null,
      subjectName: null,
      roomId,
      durationMinutes,
      breaksCount,
    });
  }

  const dialTaskLabel = phase === "break" ? "استراحة ☕" : (room.topic || room.name);

  return (
    <div className="container">
      <div className="grid-2">
        <div>
          <div className="card">
            <h2>{room.name}</h2>
            {room.topic && (
              <p className="muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <BookIcon width={13} height={13} /> {room.topic}
              </p>
            )}
            <div className="status-chip">
              <UsersIcon /> ليدر الغرفة: {room.createdByName || "غير معروف"}
            </div>
            <Link to="/" className="btn">رجوع للتايمر</Link>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15 }}>تايمر الغرفة</h3>
            <p className="muted">شارك بالتايمر إذا بدك — كل عضو بيحدد قديش بدو يدرس، ووقته بينحسب هون بس داخل الغرفة.</p>

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
                  <button className="btn btn-primary" onClick={handleStartRoomTimer}><PlayIcon /> شارك بالتايمر</button>
                ) : (
                  <>
                    {!paused ? (
                      <button className="btn" onClick={handlePause}><PauseIcon /> إيقاف مؤقت</button>
                    ) : (
                      <button className="btn btn-primary" onClick={handleResume}><PlayIcon /> استكمال</button>
                    )}
                    <button className="btn btn-danger" onClick={handleStop}><StopIcon /> خلص</button>
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
                  <label>عدد البريكات</label>
                  <select value={breaksCount} onChange={(e) => setBreaksCount(Number(e.target.value))}>
                    {BREAKS_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b === 0 ? "بدون بريك" : `${b} بريك`}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-title">
              <h3 style={{ margin: 0, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="dot"></span> شغالين هلق بالغرفة
              </h3>
            </div>
            <LiveList docs={liveDocs} />
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
              <TrophyIcon width={18} height={18} style={{ color: "var(--accent)" }} /> أعضاء الغرفة — مين أنجز أكتر
            </h3>
            <LeaderboardRows items={members} />
          </div>
        </div>
      </div>

      <AntiCheatOverlay visible={antiCheatVisible} onConfirm={handleAntiCheatConfirm} />
    </div>
  );
}
