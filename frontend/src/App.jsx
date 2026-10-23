import { useState } from "react";

const pages = {
  overview: {
    title: "Overview",
    text: "This is a placeholder for the home overview page."
  },
  tasks: {
    title: "Tasks",
    text: "This is a placeholder for the task management page."
  }
};

function App() {
  const [activePage, setActivePage] = useState("overview");
  const page = pages[activePage];

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Welcome to Homekeeper, the best app on the internet!</h1>
      </header>

      <div className="main-layout">
        <aside className="sidebar" aria-label="Sidebar navigation">
          <button
            className={activePage === "overview" ? "nav-button active" : "nav-button"}
            onClick={() => setActivePage("overview")}
            type="button"
          >
            Overview
          </button>
          <button
            className={activePage === "tasks" ? "nav-button active" : "nav-button"}
            onClick={() => setActivePage("tasks")}
            type="button"
          >
            Tasks
          </button>
        </aside>

        <main className="page-panel">
          <h2>{page.title}</h2>
          <p>{page.text}</p>
        </main>
      </div>
    </div>
  );
}

export default App;