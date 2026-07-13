import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../lib/auth.js";
import UniversityEmailField, { buildUniversityEmail } from "../components/UniversityEmailField.jsx";

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "في حساب موجود بهاد الرقم الجامعي من قبل",
  "auth/invalid-email": "الرقم الجامعي مش صح",
  "auth/weak-password": "الباسورد لازم يكون 6 أحرف/أرقام على الأقل",
  "permission-denied": "لازم تستخدم رقمك الجامعي الصحيح",
};

export default function SignupPage() {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("لازم تحط اسمك، رح يظهر بالليدربورد");
      return;
    }
    if (!studentId.trim()) {
      setError("لازم تحط رقمك الجامعي");
      return;
    }
    setBusy(true);
    try {
      await signUp({ name: name.trim(), email: buildUniversityEmail(studentId), password });
      navigate("/");
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || "صار خطأ، جرب كمان مرة");
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h2>حساب جديد</h2>
        <p className="muted">سجل حساب وابلش تدرس مع باقي الطلاب Live</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>الاسم</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="شو اسمك؟ (رح يظهر بالليدربورد)" />
          </div>
          <UniversityEmailField studentId={studentId} onChange={setStudentId} />
          <div className="field">
            <label>الباسورد</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" />
          </div>

          {error && <div className="error-text">{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "..." : "إنشاء حساب"}
          </button>
        </form>

        <div className="auth-switch">
          عندك حساب؟ <Link to="/login">سجل دخولك</Link>
        </div>
      </div>
    </div>
  );
}
