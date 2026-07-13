const DIAL_CIRC = 2 * Math.PI * 90; // نصف قطر الدائرة بالـ SVG = 90

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function Dial({ remainingSeconds, totalSeconds, task, phase = "work" }) {
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  const offset = DIAL_CIRC * (1 - progress);

  return (
    <div className="dial">
      <svg viewBox="0 0 200 200">
        <circle className="dial-track" cx="100" cy="100" r="90" />
        <circle
          className={`dial-progress ${phase === "break" ? "break" : ""}`}
          cx="100" cy="100" r="90"
          style={{ strokeDasharray: DIAL_CIRC, strokeDashoffset: offset }}
        />
      </svg>
      <div className="dial-center">
        <div className="dial-time">{formatTime(remainingSeconds)}</div>
        <div className="dial-task">{task}</div>
      </div>
    </div>
  );
}
