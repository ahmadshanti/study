const R = 90;                       // نصف قطر الحلقة
const DIAL_CIRC = 2 * Math.PI * R;
const TICKS = 12;

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function Dial({ remainingSeconds, totalSeconds, task, phase = "work" }) {
  const fraction = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 1;
  const offset = DIAL_CIRC * (1 - fraction);

  // موقع المؤشر (النقطة) عند نهاية القوس — القوس بيبلش من فوق (بسبب rotate -90)
  const knobAngle = -Math.PI / 2 + 2 * Math.PI * fraction;
  const knobX = 100 + R * Math.cos(knobAngle);
  const knobY = 100 + R * Math.sin(knobAngle);

  const isBreak = phase === "break";

  return (
    <div className="dial">
      <svg viewBox="0 0 200 200">
        <defs>
          <linearGradient id="dialGradWork" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d8b071" />
            <stop offset="100%" stopColor="#a9762f" />
          </linearGradient>
          <linearGradient id="dialGradBreak" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#63b98a" />
            <stop offset="100%" stopColor="#2f8f5f" />
          </linearGradient>
        </defs>

        {/* علامات صغيرة حوالين الحلقة */}
        <g className="dial-ticks">
          {Array.from({ length: TICKS }).map((_, i) => {
            const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
            const x1 = 100 + (R + 7) * Math.cos(a);
            const y1 = 100 + (R + 7) * Math.sin(a);
            const x2 = 100 + (R + 12) * Math.cos(a);
            const y2 = 100 + (R + 12) * Math.sin(a);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>

        <g transform="rotate(-90 100 100)">
          <circle className="dial-track" cx="100" cy="100" r={R} />
          <circle
            className={`dial-progress ${isBreak ? "break" : ""}`}
            cx="100" cy="100" r={R}
            stroke={isBreak ? "url(#dialGradBreak)" : "url(#dialGradWork)"}
            style={{ strokeDasharray: DIAL_CIRC, strokeDashoffset: offset }}
          />
        </g>

        {/* مؤشر نهاية القوس */}
        {fraction > 0 && fraction < 1 && (
          <circle
            className={`dial-knob ${isBreak ? "break" : ""}`}
            cx={knobX} cy={knobY} r="6"
          />
        )}
      </svg>
      <div className="dial-center">
        <div className="dial-time">{formatTime(remainingSeconds)}</div>
        <div className="dial-task">{task}</div>
      </div>
    </div>
  );
}
