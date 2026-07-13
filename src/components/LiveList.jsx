import { useEffect, useState } from "react";

function rankClass(i) {
  if (i === 0) return "top1";
  if (i === 1) return "top2";
  if (i === 2) return "top3";
  return "";
}

export default function LiveList({ docs }) {
  const [, forceTick] = useState(0);

  // نعيد الرندر كل دقيقة عشان "elapsedMin" يبقى محدث حتى بدون تغيير بالداتا
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (docs.length === 0) {
    return <div className="empty-state">محدا شغال هلق... يلا كون أول واحد 👀</div>;
  }

  const ranked = docs
    .map((data) => ({
      ...data,
      elapsedMin: data.startedAtClient ? Math.floor((Date.now() - data.startedAtClient) / 60000) : 0,
    }))
    .sort((a, b) => b.elapsedMin - a.elapsedMin);

  return (
    <>
      {ranked.map((data, i) => {
        const initials = (data.name || "?").trim().slice(0, 1);
        return (
          <div className="live-item" key={data.id}>
            <div className={`live-rank ${rankClass(i)}`}>{i + 1}</div>
            <div className="live-avatar">{initials}</div>
            <div className="live-meta">
              <div className="live-name">{data.name}</div>
              <div className="live-subject">{data.subjectName || data.task || "بدون عنوان"}</div>
            </div>
            <div className="live-elapsed">{data.elapsedMin} د</div>
          </div>
        );
      })}
    </>
  );
}
