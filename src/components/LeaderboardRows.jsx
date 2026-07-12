import { FlameIcon, TrophyIcon, BookIcon, ClockIcon } from "./icons.jsx";

const BADGE_META = {
  streak_7: { icon: FlameIcon, label: "أسبوع كامل" },
  streak_30: { icon: TrophyIcon, label: "شهر كامل" },
  total_10h: { icon: BookIcon, label: "10 ساعات تراكمي" },
  deep_focus_2h: { icon: ClockIcon, label: "تركيز ساعتين+" },
};

function rankClass(i) {
  if (i === 0) return "top1";
  if (i === 1) return "top2";
  if (i === 2) return "top3";
  return "";
}

export default function LeaderboardRows({ items, showBadges = false }) {
  if (items.length === 0) {
    return <div className="empty-state">ما في بيانات لسا</div>;
  }

  return (
    <>
      {items.map((item, i) => (
        <div className="lb-row" key={item.id || i}>
          <div className={`lb-rank ${rankClass(i)}`}>{i + 1}</div>
          <div>
            <div className="lb-name">{item.name}</div>
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
      ))}
    </>
  );
}
