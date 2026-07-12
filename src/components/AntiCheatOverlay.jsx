import { ClockIcon } from "./icons.jsx";

export default function AntiCheatOverlay({ visible, onConfirm }) {
  if (!visible) return null;

  return (
    <div className="overlay">
      <div className="overlay-card">
        <ClockIcon width={26} height={26} style={{ color: "var(--accent)", marginBottom: 10 }} />
        <h3>لسا عم تدرس؟</h3>
        <p className="muted">دوس تأكيد وإلا رح نوقف حسبة الوقت خلال 45 ثانية</p>
        <button className="btn btn-primary" onClick={onConfirm} style={{ width: "100%", justifyContent: "center" }}>إي، لسا عم أدرس</button>
      </div>
    </div>
  );
}
