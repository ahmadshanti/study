import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy, limit, getDocs, onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { getDayKey, getWeekKey, getMonthKey } from "../lib/sessions.js";
import { useAuth } from "../context/AuthContext.jsx";
import LeaderboardRows from "../components/LeaderboardRows.jsx";
import Avatar from "../components/Avatar.jsx";
import { TrophyIcon, GlobeIcon, BookIcon, CrownIcon } from "../components/icons.jsx";

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

function Podium({ items, currentUid }) {
  // الترتيب البصري: الثاني - الأول (بالنص ومرفوع) - الثالث
  const [first, second, third] = items;
  const slots = [
    { item: second, cls: "p2", rank: 2, avatarSize: 52 },
    { item: first, cls: "p1", rank: 1, avatarSize: 68 },
    { item: third, cls: "p3", rank: 3, avatarSize: 46 },
  ];

  return (
    <div className="podium">
      {slots.map(({ item, cls, rank, avatarSize }) =>
        item ? (
          <div className={`podium-slot ${cls}`} key={rank}>
            {rank === 1 && <CrownIcon className="podium-crown" width={22} height={22} />}
            <Avatar name={item.name} size={avatarSize} />
            <div className="podium-name">
              {item.name}
              {currentUid && item.id === currentUid && <span className="me-chip">أنت</span>}
            </div>
            <div className="podium-minutes">{Math.round(item.totalMinutes || 0)} د</div>
            <div className="podium-base">{rank}</div>
          </div>
        ) : (
          <div className={`podium-slot ${cls}`} key={rank} />
        )
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const { uid } = useAuth();
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
    const path = periodCollectionPath(period);
    const q = path
      ? query(collection(db, ...path), orderBy("totalMinutes", "desc"), limit(50))
      : query(collection(db, "users"), orderBy("totalMinutes", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setGlobalItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [period]);

  useEffect(() => {
    if (!subjectId) {
      setSubjectItems([]);
      return;
    }
    const q = query(
      collection(db, "leaderboard_subject", subjectId, "students"),
      orderBy("totalMinutes", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setSubjectItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [subjectId]);

  function renderBoard(items, { showBadges = false } = {}) {
    if (items.length === 0) {
      return <div className="empty-state">ما في بيانات لهالفترة لسا</div>;
    }
    const top3 = items.slice(0, 3);
    const rest = items.slice(3);
    return (
      <>
        <Podium items={top3} currentUid={uid} />
        {rest.length > 0 && (
          <LeaderboardRows items={rest} showBadges={showBadges} currentUid={uid} startRank={4} />
        )}
      </>
    );
  }

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
        <div style={{ marginBottom: 14, maxWidth: 320 }}>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="card">
        {activeTab === "global" && renderBoard(globalItems, { showBadges: period === "all" })}
        {activeTab === "subject" && (
          subjects.length === 0
            ? <div className="empty-state">لسا ما في مواد تنافسية مفعّلة</div>
            : renderBoard(subjectItems)
        )}
      </div>
    </div>
  );
}
