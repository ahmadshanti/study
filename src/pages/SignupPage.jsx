import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../lib/auth.js";

const UNIVERSITY_EMAIL_DOMAIN = "@stu.najah.edu";

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "في حساب موجود بهاد الإيميل من قبل",
  "auth/invalid-email": "صيغة الإيميل مش صح",
  "auth/weak-password": "الباسورد لازم يكون 6 أحرف/أرقام على الأقل",
  "permission-denied": `لازم تستخدم إيميلك الجامعي (بيخلص بـ ${UNIVERSITY_EMAIL_DOMAIN})`,
};

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
    if (!email.trim().toLowerCase().endsWith(UNIVERSITY_EMAIL_DOMAIN)) {
      setError(`لازم تستخدم إيميلك الجامعي (بيخلص بـ ${UNIVERSITY_EMAIL_DOMAIN})`);
      return;
    }
    setBusy(true);
    try {
      await signUp({ name: name.trim(), email, password });
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
          <div className="field" style={{ marginBottom: 6 }}>
            <label>الإيميل الجامعي</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`s12345678${UNIVERSITY_EMAIL_DOMAIN}`} />
          </div>
          <p className="hint-text">لازم يكون إيميلك الجامعي (بيخلص بـ {UNIVERSITY_EMAIL_DOMAIN})</p>
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
