import { useState } from "react";
import { PlusIcon, KeyIcon } from "./icons.jsx";

/**
 * مودال إنشاء/الانضمام لغرفة — بديل prompt()/alert() القديمة.
 * mode: "create" | "join"
 */
export default function RoomModal({ mode, onClose, onCreate, onJoin }) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isCreate = mode === "create";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isCreate) {
        if (!name.trim() || !password) throw new Error("لازم تعبي اسم الغرفة والباسورد");
        await onCreate({ name, topic, password });
      } else {
        if (!roomId.trim() || !password) throw new Error("لازم تعبي كود الغرفة والباسورد");
        await onJoin({ roomId: roomId.trim(), password });
      }
    } catch (err) {
      setError(err.message || "صار خطأ، جرب كمان مرة");
      setBusy(false);
    }
  }

  return (
    <div className="overlay">
      <div className="overlay-card">
        <h3 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {isCreate ? <PlusIcon /> : <KeyIcon />} {isCreate ? "إنشاء غرفة" : "الانضمام لغرفة"}
        </h3>
        <form onSubmit={handleSubmit}>
          {isCreate ? (
            <>
              <div className="field">
                <label>اسم الغرفة</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: فريق الميدترم" autoFocus />
              </div>
              <div className="field">
                <label>موضوع الدراسة (اختياري)</label>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثال: مراجعة توزيع الاحتمالات" />
              </div>
            </>
          ) : (
            <div className="field">
              <label>كود/اسم الغرفة</label>
              <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="مثال: fريق-الميدترم-ab12" autoFocus />
            </div>
          )}
          <div className="field">
            <label>الباسورد</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          {error && <div className="error-text">{error}</div>}

          <div className="overlay-actions">
            <button type="button" className="btn" onClick={onClose} disabled={busy}>إلغاء</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "..." : isCreate ? "إنشاء" : "انضمام"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
