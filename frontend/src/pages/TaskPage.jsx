const task = {
  name: "Make roast for dinner",
  detail: "Don't forget the dessert",
  assignee: "Harry P.",
  due: "xx/yy/2022",
  reward: "2",
  status: "In progress"
};

function TaskPage() {
  return (
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
  );
}

export default TaskPage;
