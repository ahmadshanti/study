import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy, limit, getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase.js";
import LeaderboardRows from "../components/LeaderboardRows.jsx";
import { TrophyIcon, GlobeIcon, BookIcon, UsersIcon } from "../components/icons.jsx";

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("global");
  const [globalItems, setGlobalItems] = useState([]);
  const [teamItems, setTeamItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [subjectItems, setSubjectItems] = useState([]);

  useEffect(() => {
    (async () => {
      const q = query(collection(db, "users"), orderBy("totalMinutes", "desc"), limit(50));
      const snap = await getDocs(q);
      setGlobalItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    })();

    (async () => {
      const q = query(collection(db, "rooms"), orderBy("totalMinutes", "desc"), limit(50));
      const snap = await getDocs(q);
      setTeamItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    })();

    (async () => {
      const q = query(collection(db, "subjects"), where("isActive", "==", true));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, name: d.data().name }));
      setSubjects(list);
      if (list.length > 0) setSubjectId(list[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!subjectId) {
      setSubjectItems([]);
      return;
    }
    (async () => {
      const q = query(
        collection(db, "leaderboard_subject", subjectId, "students"),
        orderBy("totalMinutes", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      setSubjectItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    })();
  }, [subjectId]);

  return (
    <div className="container">
      <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}><TrophyIcon width={24} height={24} style={{ color: "var(--accent)" }} /> الليدربورد</h2>
      <p className="muted" style={{ marginBottom: 24 }}>مين أكتر واحد ثابر هالفترة؟</p>

      <div className="tabs">
        <div className={`tab ${activeTab === "global" ? "active" : ""}`} onClick={() => setActiveTab("global")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><GlobeIcon width={13} height={13} /> عام</span>
        </div>
        <div className={`tab ${activeTab === "subject" ? "active" : ""}`} onClick={() => setActiveTab("subject")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><BookIcon width={13} height={13} /> حسب المادة</span>
        </div>
        <div className={`tab ${activeTab === "team" ? "active" : ""}`} onClick={() => setActiveTab("team")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><UsersIcon width={13} height={13} /> الفرق</span>
        </div>
      </div>

      {activeTab === "subject" && (
        <div style={{ marginBottom: 14 }}>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="card">
        {activeTab === "global" && <LeaderboardRows items={globalItems} showBadges />}
        {activeTab === "subject" && (
          subjects.length === 0
            ? <div className="empty-state">لسا ما في مواد تنافسية مفعّلة</div>
            : <LeaderboardRows items={subjectItems} />
        )}
        {activeTab === "team" && <LeaderboardRows items={teamItems} />}
      </div>
    </div>
  );
}
