import { Navigate, Route, Routes } from "react-router-dom";
import Topbar from "./components/Topbar.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RedirectIfAuthed from "./components/RedirectIfAuthed.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import TimerPage from "./pages/TimerPage.jsx";
import LeaderboardPage from "./pages/LeaderboardPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

export default function App() {
  return (
    <>
      <Topbar />
      <Routes>
        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/" element={<TimerPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
