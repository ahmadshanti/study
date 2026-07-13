import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { logOut } from "../lib/auth.js";
import { LogoutIcon } from "./icons.jsx";

export default function Topbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logOut();
    navigate("/login");
  }

  return (
    <div className="topbar">
      <div className="brand">
        <img src="/assets/img/logo.png" alt="شعار حركة الشبيبة الطلابية" className="brand-logo" />
        <div className="brand-title">
          <span className="dot"></span> حركة الشبيبة الطلابية — كلية تكنولوجيا المعلومات والذكاء الاصطناعي
        </div>
      </div>
      {user && (
        <div className="nav-links">
          <NavLink to="/" end>التايمر</NavLink>
          <NavLink to="/leaderboard">الليدربورد</NavLink>
          <button className="btn-logout" onClick={handleLogout}>
            <LogoutIcon width={13} height={13} />
            خروج
          </button>
        </div>
      )}
    </div>
  );
}
