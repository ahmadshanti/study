import { useEffect, useState } from "react";
import {
  collection, addDoc, doc, updateDoc, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { PlusIcon } from "../components/icons.jsx";

// ⚠️ حماية بسيطة جداً بباسورد ثابت بالكود — كافية لتمنع الطلاب العاديين
// من الدخول بالغلط، لكنها مش حماية حقيقية (أي حدا يفتح الكود بيشوفه).
// لو بدك حماية أقوى لاحقاً: استخدم Firebase custom claims + Firestore rules.
const ADMIN_PASSWORD = "GDSC-ADMIN-2026";

export default function AdminPage() {
  const [gated, setGated] = useState(false);
  const [gateInput, setGateInput] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjects, setSubjects] = useState([]);

  function handleGateSubmit(e) {
    e.preventDefault();
    if (gateInput === ADMIN_PASSWORD) {
      setGated(true);
    } else {
      alert("باسورد غلط");
    }
  }

  useEffect(() => {
    if (!gated) return;
    const unsub = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [gated]);

  async function handleAddSubject(e) {
    e.preventDefault();
    const name = newSubjectName.trim();
    if (!name) return;
    await addDoc(collection(db, "subjects"), {
      name,
      isActive: true,
      createdAt: serverTimestamp(),
    });
    setNewSubjectName("");
  }

  async function toggleSubject(id, isActive) {
    await updateDoc(doc(db, "subjects", id), { isActive: !isActive });
  }

  if (!gated) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: 360, margin: "40px auto" }}>
          <h3>دخول الأدمن</h3>
          <form onSubmit={handleGateSubmit}>
            <div className="field">
              <label>الباسورد</label>
              <input type="password" value={gateInput} onChange={(e) => setGateInput(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h3>إدارة المواد التنافسية</h3>
        <p className="muted">المواد يلي بتضيفها هون بتظهر عند الطلاب كخيارات بالتايمر، وبيصير إلها ليدربورد خاص.</p>
        <form onSubmit={handleAddSubject} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            placeholder="مثال: Operating Systems"
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}><PlusIcon /> إضافة</button>
        </form>
      </div>

      <div className="card">
        {subjects.length === 0 ? (
          <div className="empty-state">ما في مواد لسا، ضيف وحدة فوق</div>
        ) : (
          subjects.map((s) => (
            <div className="lb-row" key={s.id}>
              <div></div>
              <div>
                <div className="lb-name">{s.name}</div>
                <div className="lb-sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.isActive ? "var(--live)" : "var(--text-muted)", display: "inline-block" }} />
                  {s.isActive ? "مفعّلة" : "متوقفة"}
                </div>
              </div>
              <button className="btn" onClick={() => toggleSubject(s.id, s.isActive)}>
                {s.isActive ? "إيقاف" : "تفعيل"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
