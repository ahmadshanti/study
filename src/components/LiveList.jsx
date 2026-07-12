import { useEffect, useState } from "react";

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

  return (
    <>
      {docs.map((data) => {
        const initials = (data.name || "?").trim().slice(0, 1);
        const elapsedMin = data.startedAtClient
          ? Math.floor((Date.now() - data.startedAtClient) / 60000)
          : 0;
        return (
          <div className="live-item" key={data.id}>
            <div className="live-avatar">{initials}</div>
            <div className="live-meta">
              <div className="live-name">{data.name}</div>
              <div className="live-subject">{data.subjectName || data.task || "بدون عنوان"}</div>
            </div>
            <div className="live-elapsed">{elapsedMin} د</div>
          </div>
        );
      })}
    </>
  );
}
