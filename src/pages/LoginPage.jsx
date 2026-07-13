import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logIn } from "../lib/auth.js";
import UniversityEmailField, { buildUniversityEmail } from "../components/UniversityEmailField.jsx";

const ERROR_MESSAGES = {
  "auth/invalid-credential": "الإيميل أو الباسورد غلط",
  "auth/invalid-email": "صيغة الإيميل مش صح",
  "auth/user-not-found": "ما في حساب بهاد الإيميل",
  "auth/wrong-password": "الباسورد غلط",
  "auth/too-many-requests": "محاولات كتير غلط، جرب بعد شوي",
};

export default function LoginPage() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await logIn({ email: buildUniversityEmail(studentId), password });
      navigate("/");
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || "صار خطأ، جرب كمان مرة");
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h2>تسجيل الدخول</h2>
        <p className="muted">أهلين فيك، سجل دخولك تكمل مذاكرتك</p>

        <form onSubmit={handleSubmit}>
          <UniversityEmailField studentId={studentId} onChange={setStudentId} />
          <div className="field">
            <label>الباسورد</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          {error && <div className="error-text">{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "..." : "دخول"}
          </button>
        </form>

        <div className="auth-switch">
          ما عندك حساب؟ <Link to="/signup">سجل حساب جديد</Link>
        </div>
      </div>
    </div>
  );
}
