import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy, limit, getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { getDayKey, getWeekKey, getMonthKey } from "../lib/sessions.js";
import LeaderboardRows from "../components/LeaderboardRows.jsx";
import { TrophyIcon, GlobeIcon, BookIcon } from "../components/icons.jsx";

const PERIODS = [
  { key: "all", label: "الكل" },
  { key: "day", label: "اليوم" },
  { key: "week", label: "الأسبوع" },
  { key: "month", label: "الشهر" },
];

function periodCollectionPath(period) {
  if (period === "day") return ["leaderboard_daily", getDayKey(), "students"];
  if (period === "week") return ["leaderboard_weekly", getWeekKey(), "students"];
  if (period === "month") return ["leaderboard_monthly", getMonthKey(), "students"];
  return null; // all-time يستخدم users مباشرة
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("global");
  const [period, setPeriod] = useState("all");
  const [globalItems, setGlobalItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [subjectItems, setSubjectItems] = useState([]);

  useEffect(() => {
    (async () => {
      const q = query(collection(db, "subjects"), where("isActive", "==", true));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, name: d.data().name }));
      setSubjects(list);
      if (list.length > 0) setSubjectId(list[0].id);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const path = periodCollectionPath(period);
      const q = path
        ? query(collection(db, ...path), orderBy("totalMinutes", "desc"), limit(50))
        : query(collection(db, "users"), orderBy("totalMinutes", "desc"), limit(50));
      const snap = await getDocs(q);
      setGlobalItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    })();
  }, [period]);

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
      </div>

      {activeTab === "global" && (
        <div className="period-tabs">
          {PERIODS.map((p) => (
            <div key={p.key} className={`period-tab ${period === p.key ? "active" : ""}`} onClick={() => setPeriod(p.key)}>
              {p.label}
            </div>
          ))}
        </div>
      )}

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
        {activeTab === "global" && (
          globalItems.length === 0
            ? <div className="empty-state">ما في بيانات لهالفترة لسا</div>
            : <LeaderboardRows items={globalItems} showBadges={period === "all"} />
        )}
        {activeTab === "subject" && (
          subjects.length === 0
            ? <div className="empty-state">لسا ما في مواد تنافسية مفعّلة</div>
            : <LeaderboardRows items={subjectItems} />
        )}
      </div>
    </div>
  );
}
