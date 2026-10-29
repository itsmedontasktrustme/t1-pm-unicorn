import { useState } from "react";

const tasks = [
  {
    id: 1,
    title: "Clean the toy room",
    description: "-",
    status: "Unassigned",
    due: "Due tomorrow · 4",
    assignedTo: "",
    badge: "Assign to me",
    action: "Task detail",
    selected: true
  },
  {
    id: 2,
    title: "Make roast for dinner",
    description: "Don't forget the dessert",
    status: "In progress",
    due: "Due today · 2",
    assignedTo: "Harry P.",
    badge: "Mark as done",
    action: "Task detail",
    selected: false
  },
  {
    id: 3,
    title: "Vacuum the 1st floor",
    description: "Make sure it's spotless, or else I'll...",
    status: "In progress",
    due: "Due in 3 days · 2",
    assignedTo: "Harry P.",
    badge: "Mark started",
    action: "Task detail",
    selected: false
  },
  {
    id: 4,
    title: "Slaughter a goat",
    description: "Make her suffer",
    status: "To do",
    due: "Due in 3 days · 5",
    assignedTo: "Petunia D.",
    badge: "Mark started",
    action: "Task detail",
    selected: false
  }
];

const taskDetail = {
  name: "Make roast for dinner",
  detail: "Don't forget the dessert",
  assignee: "Harry P.",
  due: "xx/yy/2022",
  reward: "2",
  status: "In progress"
};

function TaskBoardPage() {
  const [selectedTaskId, setSelectedTaskId] = useState(2);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || tasks[0];

  return (
    <div className="task-board-layout">
      <section className="task-board" aria-label="Task board">
        <h2>TASK BOARD</h2>
        <div className="task-filters">All | Mine | Unassigned | Due today</div>

        {tasks.map((taskItem) => (
          <div
            key={taskItem.id}
            className={selectedTaskId === taskItem.id ? "task-card selected" : "task-card"}
          >
            <div className="task-card-main">
              <div className="task-title-row">
                <div className="task-title">{taskItem.title}</div>
                <button
                  type="button"
                  className={selectedTaskId === taskItem.id ? "task-badge active" : "task-badge"}
                  onClick={() => setSelectedTaskId(taskItem.id)}
                >
                  {taskItem.badge}
                </button>
              </div>

              <div className="task-desc">{taskItem.description}</div>
              <div className="task-meta">
                <span>{taskItem.assignedTo ? `${taskItem.assignedTo} · ` : "Unassigned · "}</span>
                <span>{taskItem.due}</span>
              </div>
            </div>

            <button
              type="button"
              className="task-detail-button"
              onClick={() => setSelectedTaskId(taskItem.id)}
            >
              {taskItem.action}
            </button>
          </div>
        ))}
      </section>

      <section className="task-detail" aria-label="Task details">
        <h2>TASK DETAIL</h2>

        <div className="task-form">
          <div className="field-row">
            <label htmlFor="task-name">Task name:</label>
            <input id="task-name" type="text" value={selectedTask.title || taskDetail.name} readOnly />
          </div>

          <div className="field-row">
            <label htmlFor="task-detail">Task detail:</label>
            <input id="task-detail" type="text" value={selectedTask.description || taskDetail.detail} readOnly />
          </div>

          <div className="field-row">
            <label htmlFor="task-assignee">Assignee:</label>
            <input id="task-assignee" type="text" value={selectedTask.assignedTo || taskDetail.assignee} readOnly />
          </div>

          <div className="field-row">
            <label htmlFor="task-due">Due:</label>
            <input id="task-due" type="text" value={selectedTask.due || taskDetail.due} readOnly />
          </div>

          <div className="field-row">
            <label htmlFor="task-reward">Reward:</label>
            <input id="task-reward" type="text" value={taskDetail.reward} readOnly />
          </div>

          <div className="field-row">
            <label htmlFor="task-status">Status:</label>
            <input id="task-status" type="text" value={selectedTask.status || taskDetail.status} readOnly />
          </div>
        </div>

        <div className="action-stack">
          <button type="button" className="primary-action">Mark as done</button>
          <button type="button" className="secondary-action">Unassign</button>
          <button type="button" className="tertiary-action">Edit</button>
        </div>
      </section>
    </div>
  );
}

export default TaskBoardPage;
