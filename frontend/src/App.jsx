import { SignInButton, UserButton, useUser } from "@clerk/react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import logo from "./assets/homekeeper-logo.png";
import cookieIcon from "./assets/cookie.svg";
import homeIcon from "./assets/home-green.svg";
import tasksIcon from "./assets/tasks-green.svg";
import peopleIcon from "./assets/members-green.svg";
import settingsIcon from "./assets/settings-green.svg";
import historyIcon from "./assets/book-green.svg";
import HomePage from "./pages/HomePage";
import TaskBoardPage from "./pages/TaskBoardPage";
import PeoplePage from "./pages/PeoplePage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";
import "./App.css";

const navItems = [
  { id: "home", path: "/home", label: "Home", icon: homeIcon },
  { id: "tasks", path: "/tasks", label: "Tasks", icon: tasksIcon },
  { id: "people", path: "/people", label: "People", icon: peopleIcon },
  { id: "history", path: "/history", label: "History", icon: historyIcon },
  { id: "settings", path: "/settings", label: "Settings", icon: settingsIcon },
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
            <span className="points-avatar">
              <img src={cookieIcon} alt="Cookie score icon" />
            </span>
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
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <nav className="bottom-nav nav-with-history" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activePage === item.id ? "nav-button active" : "nav-button"}
            onClick={() => navigate(item.path)}
          >
            <img className="nav-icon-img" src={item.icon} alt={item.label} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
