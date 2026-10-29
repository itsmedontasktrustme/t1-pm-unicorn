import { useState } from "react";
import { SignInButton, UserButton, useUser } from "@clerk/react";
import logo from "./assets/homekeeper-logo.png";
import "./App.css";

const pages = {
  home: { title: "Home Overview", text: "This is a placeholder page for the home overview section." },
  detail: { title: "TASK DETAIL", text: "This task detail page is a placeholder for now." },
  tasks: { title: "Tasks", text: "This is a placeholder page for the task list." },
  people: { title: "People", text: "This is a placeholder page for household members." },
  settings: { title: "Settings", text: "This is a placeholder page for app settings." }
};

const navItems = [
  { id: "home", label: "Home", glyph: "⌂" },
  { id: "tasks", label: "Tasks", glyph: "☰" },
  { id: "people", label: "People", glyph: "◌" },
  { id: "settings", label: "Settings", glyph: "⚙" }
];

const task = {
  name: "Make roast for dinner",
  detail: "Don't forget the dessert",
  assignee: "Harry P.",
  due: "xx/yy/2022",
  reward: "2",
  status: "In progress"
};

function App() {
  const [activePage, setActivePage] = useState("detail");
  const { isLoaded, isSignedIn } = useUser();
  const page = pages[activePage];

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
        {activePage === "detail" ? (
          <section className="task-detail" aria-label="Task details">
            <h2>TASK DETAIL</h2>

            <div className="task-form">
              <div className="field-row">
                <label htmlFor="task-name">Task name:</label>
                <input id="task-name" type="text" value={task.name} readOnly />
              </div>

              <div className="field-row">
                <label htmlFor="task-detail">Task detail:</label>
                <input id="task-detail" type="text" value={task.detail} readOnly />
              </div>

              <div className="field-row">
                <label htmlFor="task-assignee">Assignee:</label>
                <input id="task-assignee" type="text" value={task.assignee} readOnly />
              </div>

              <div className="field-row">
                <label htmlFor="task-due">Due:</label>
                <input id="task-due" type="text" value={task.due} readOnly />
              </div>

              <div className="field-row">
                <label htmlFor="task-reward">Reward:</label>
                <input id="task-reward" type="text" value={task.reward} readOnly />
              </div>

              <div className="field-row">
                <label htmlFor="task-status">Status:</label>
                <input id="task-status" type="text" value={task.status} readOnly />
              </div>
            </div>

            <div className="action-stack">
              <button type="button" className="primary-action">Mark as done</button>
              <button type="button" className="secondary-action">Unassign</button>
              <button type="button" className="tertiary-action">Edit</button>
            </div>
          </section>
        ) : (
          <section className="placeholder-page" aria-label={page.title}>
            <h2>{page.title}</h2>
            <p>{page.text}</p>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activePage === item.id ? "nav-button active" : "nav-button"}
            onClick={() => setActivePage(item.id)}
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