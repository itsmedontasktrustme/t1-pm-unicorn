import { useEffect } from "react";
import { UserButton, useAuth, useUser } from "@clerk/react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import logo from "./assets/homekeeper-logo.png";
import cookieIcon from "./assets/cookie.svg";
import homeIcon from "./assets/home-green.svg";
import tasksIcon from "./assets/tasks-green.svg";
import peopleIcon from "./assets/members-green.svg";
import settingsIcon from "./assets/settings-green.svg";
import historyIcon from "./assets/book-green.svg";
import HouseholdPage from "./pages/household/HouseholdPage";
import TaskBoardPage from "./pages/TaskBoardPage";
import PeoplePage from "./pages/people/PeoplePage";
import ProfilePage from "./pages/profile/ProfilePage";
import HousemateProfilePage from "./pages/profile/HousemateProfilePage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";
import NotFoundPage from "./pages/NotFoundPage";
import UiStatesPage from "./pages/UiStatesPage";
import SignInPage from "./pages/auth/SignInPage";
import SsoCallbackPage from "./pages/auth/SsoCallbackPage";
import WelcomePage from "./pages/auth/WelcomePage";
import HouseholdStartPage from "./pages/household/HouseholdStartPage";
import { CurrentHouseholdProvider, useCurrentHousehold } from "./logic/CurrentHousehold";
import { subscribeSessionToken } from "./logic/SessionToken";
import "./App.css";
import "./styles/auth.css";
import "./styles/household.css";
import "./styles/people.css";
import "./styles/profile.css";

const navItems = [
  { id: "home", path: "/home", label: "Home", icon: homeIcon },
  { id: "tasks", path: "/tasks", label: "Tasks", icon: tasksIcon },
  { id: "people", path: "/people", label: "People", icon: peopleIcon },
  { id: "history", path: "/history", label: "History", icon: historyIcon },
  { id: "settings", path: "/settings", label: "Settings", icon: settingsIcon },
];

// Screens shown before the user is in the app: no header, no bottom navigation.
const GUEST_PATHS = ["/sign-in", "/sso-callback"];
// Signed-in screens before the resident is in a household: also without the app shell.
const ONBOARDING_PATHS = ["/welcome", "/household/new", "/household/join"];
// Development-only pages that must work without signing in.
const DEV_PUBLIC_PATHS = process.env.NODE_ENV !== "production" ? ["/ui-states"] : [];

// Current household under the app name; a switcher when the resident is in several (HK-60).
function HouseholdSwitcher() {
  const { households, current, select } = useCurrentHousehold();

  if (!current) {
    return <div className="brand-subtitle">&nbsp;</div>;
  }

  if (households.length < 2) {
    return <div className="brand-subtitle">{current.name}</div>;
  }

  return (
    <select
      className="brand-switcher"
      aria-label="Switch household"
      value={current.id}
      onChange={(event) => select(event.target.value)}
    >
      {households.map((household) => (
        <option key={household.id} value={household.id}>
          {household.name}
        </option>
      ))}
    </select>
  );
}

function AppContent() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // First path segment decides the active tab; profiles live under People.
  const section = location.pathname.split("/")[1] || "home";
  const activePage = section === "profile" ? "people" : section;

  useEffect(() => {
    return subscribeSessionToken(getToken, { isLoaded, isSignedIn }, () => {});
  }, [getToken, isLoaded, isSignedIn]);

  if (GUEST_PATHS.includes(location.pathname)) {
    return (
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sso-callback" element={<SsoCallbackPage />} />
      </Routes>
    );
  }

  // Guests are sent to the sign-in page; the app shell is for signed-in residents only.
  if (isLoaded && !isSignedIn && !DEV_PUBLIC_PATHS.includes(location.pathname)) {
    return <Navigate to="/sign-in" replace />;
  }

  if (ONBOARDING_PATHS.includes(location.pathname)) {
    return (
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/household/new" element={<HouseholdStartPage mode="create" />} />
        <Route path="/household/join" element={<HouseholdStartPage mode="join" />} />
      </Routes>
    );
  }

  return (
    <div className="homekeeper-app">
      <header className="topbar">
        <div className="brand-block" aria-label="Homekeeper brand">
          <div className="brand-mark">
            <img src={logo} alt="Homekeeper logo" className="brand-logo" />
          </div>

          <div className="brand-copy">
            <div className="brand-title">HomeKeeper</div>
            <HouseholdSwitcher />
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
            ) : (
              isSignedIn && <UserButton afterSignOutUrl="/sign-in" />
            )}
          </div>
        </div>
      </header>

      <main className="content-panel">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HouseholdPage />} />
          <Route path="/tasks" element={<TaskBoardPage />} />
          <Route path="/task" element={<Navigate to="/tasks" replace />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/people/:memberId" element={<HousemateProfilePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {process.env.NODE_ENV !== "production" && <Route path="/ui-states" element={<UiStatesPage />} />}
          <Route path="*" element={<NotFoundPage />} />
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

function App() {
  return (
    <CurrentHouseholdProvider>
      <AppContent />
    </CurrentHouseholdProvider>
  );
}

export default App;
