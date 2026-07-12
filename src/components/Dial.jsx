const DIAL_CIRC = 2 * Math.PI * 90; // نصف قطر الدائرة بالـ SVG = 90
const POMODORO_CYCLE_SECONDS = 25 * 60;

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function Dial({ secondsElapsed, dialTask }) {
  // بندور شوط بصري كل 25 دقيقة (بومودورو تقريبي) بدون ما يوقف التايمر فعلياً
  const progress = (secondsElapsed % POMODORO_CYCLE_SECONDS) / POMODORO_CYCLE_SECONDS;
  const offset = secondsElapsed === 0 ? DIAL_CIRC : DIAL_CIRC * (1 - progress);

  return (
    <div className="dial">
      <svg viewBox="0 0 260 260">
        <circle className="dial-track" cx="130" cy="130" r="118" />
        <circle
          className="dial-progress"
          cx="130" cy="130" r="118"
          style={{ strokeDasharray: DIAL_CIRC, strokeDashoffset: offset }}
        />
      </svg>
      <div className="dial-center">
        <div className="dial-time">{formatTime(secondsElapsed)}</div>
        <div className="dial-task">{dialTask}</div>
      </div>
    </div>
  );
}
