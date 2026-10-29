import { SignInButton, UserButton, useUser } from "@clerk/react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import logo from "./assets/homekeeper-logo.png";
import HomePage from "./pages/HomePage";
import TaskBoardPage from "./pages/TaskBoardPage";
import PeoplePage from "./pages/PeoplePage";
import SettingsPage from "./pages/SettingsPage";
import "./App.css";

const navItems = [
  { id: "home", path: "/home", label: "Home", glyph: "⌂" },
  { id: "tasks", path: "/tasks", label: "Tasks", glyph: "☰" },
  { id: "people", path: "/people", label: "People", glyph: "◌" },
  { id: "settings", path: "/settings", label: "Settings", glyph: "⚙" }
];

function App() {
  const { isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = location.pathname.replace("/", "") || "home";

  return (
    <div className="homekeeper-app">
      <header className="topbar">
        <div className="brand-block" aria-label="Homekeeper brand">
          <div className="brand-mark">
            <img src={logo} alt="Homekeeper logo" className="brand-logo" />
          </div>

          <div className="brand-copy">
            <div className="brand-title">HomeKeeper</div>
            <div className="brand-subtitle">Private Drive No. 4</div>
          </div>
        </div>

        <div className="header-actions">
          <div className="points-pill" aria-label="Score">
            <span className="points-avatar">◉</span>
            <span>120</span>
          </div>

          <div className="user-widget">
            {!isLoaded ? (
              <span className="auth-loading">Loading…</span>
            ) : isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <SignInButton mode="modal" />
            )}
          </div>
        </div>
      </header>

      <main className="content-panel">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/tasks" element={<TaskBoardPage />} />
          <Route path="/task" element={<Navigate to="/tasks" replace />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activePage === item.id ? "nav-button active" : "nav-button"}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon" aria-hidden="true">{item.glyph}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
