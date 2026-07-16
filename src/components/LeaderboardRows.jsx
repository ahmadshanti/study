import { BADGE_META } from "../lib/sessions.js";
import Avatar from "./Avatar.jsx";

function rankClass(i) {
  if (i === 0) return "top1";
  if (i === 1) return "top2";
  if (i === 2) return "top3";
  return "";
}

export default function LeaderboardRows({ items, showBadges = false, currentUid = null, startRank = 1 }) {
  if (items.length === 0) {
    return <div className="empty-state">ما في بيانات لسا</div>;
  }

  return (
    <>
      {items.map((item, i) => {
        const rank = startRank + i;
        const isMe = currentUid && item.id === currentUid;
        return (
          <div className={`lb-row ${isMe ? "me" : ""}`} key={item.id || i} style={{ gridTemplateColumns: "34px auto 1fr auto" }}>
            <div className={`lb-rank ${rankClass(rank - 1)}`}>{rank}</div>
            <Avatar name={item.name} size={34} />
            <div>
              <div className="lb-name">
                {item.name}
                {isMe && <span className="me-chip">أنت</span>}
              </div>
              {showBadges && item.badges && item.badges.length > 0 && (
                <div className="badges-row">
                  {item.badges.map((b) => {
                    const meta = BADGE_META[b];
                    const Icon = meta?.icon;
                    return (
                      <span className="badge" key={b}>
                        {Icon && <Icon width={12} height={12} />} {meta?.label || b}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="lb-minutes">{Math.round(item.totalMinutes || 0)} د</div>
          </div>
        );
      })}
    </>
  );
}
