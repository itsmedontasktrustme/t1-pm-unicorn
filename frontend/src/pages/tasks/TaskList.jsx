import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { markTaskDone, pickUpTask } from "../../api/tasks";
import { EmptyState } from "../../components/states";
import { FormBanner } from "../../components/forms";
import tasksIcon from "../../assets/tasks-green.svg";
import TaskCard from "./TaskCard";
import { announceCookiesChanged, doneToast, groupOpenTasks } from "./taskFormat";

/*
 * HK-72 Task list (design HK-71).
 * Filters Open / Mine / Available / Done (kept in ?filter=), open tasks grouped by due date,
 * quick actions Pick up (Available) and Mark as done (own task). Create task only for managers.
 */

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "mine", label: "Mine" },
  { id: "available", label: "Available" },
  { id: "done", label: "Done" }
];

function TaskList({ data, selectedId, context }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const filter = FILTERS.some((item) => item.id === searchParams.get("filter")) ? searchParams.get("filter") : "open";
  const { tasks, me, isManager } = data;

  const open = tasks.filter((task) => task.status !== "done");
  const byFilter = {
    open,
    mine: open.filter((task) => task.assigneeId === me.id),
    available: open.filter((task) => task.status === "available"),
    done: tasks
      .filter((task) => task.status === "done")
      .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
  };

  const choose = (id) => setSearchParams(id === "open" ? {} : { filter: id }, { replace: true });
  const query = filter === "open" ? "" : `?filter=${filter}`;

  const quickAction = async (task) => {
    setBusyId(task.id);
    setError(null);
    try {
      if (task.status === "available") {
        await pickUpTask(context.user, context.householdId, task.id);
        context.showToast(`You picked up “${task.title}”`);
      } else {
        const { credited } = await markTaskDone(context.user, context.householdId, task.id);
        context.showToast(doneToast(credited, true));
        announceCookiesChanged();
      }
      context.reload();
    } catch (actionError) {
      setError(actionError.message);
      context.reload();
    } finally {
      setBusyId(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <>
        <div className="hk-tasks__head">
          <h2>Tasks</h2>
        </div>
        <EmptyState
          iconSrc={tasksIcon}
          title="All clear – no tasks yet!"
          text={
            isManager
              ? "Create the first one: give it a name, and add a due date and cookies if you like."
              : "When a manager adds a task, you’ll see it here."
          }
          actions={
            isManager && (
              <Link to="/tasks/new" className="hk-btn hk-btn--primary">
                + Create task
              </Link>
            )
          }
        />
      </>
    );
  }

  const card = (task) => (
    <TaskCard
      key={task.id}
      task={task}
      meId={me.id}
      selected={task.id === selectedId}
      to={`/tasks/${task.id}${query}`}
      busy={busyId === task.id}
      onQuickAction={quickAction}
    />
  );

  const shown = byFilter[filter];
  const { soon, later, hasOverdue } = groupOpenTasks(shown);

  return (
    <>
      <div className="hk-tasks__head">
        <h2>Tasks</h2>
        {isManager && (
          <Link to={`/tasks/new${query}`} className="hk-btn hk-btn--primary">
            + Create task
          </Link>
        )}
      </div>

      <div className="hk-tasks__filters" role="group" aria-label="Show tasks">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => choose(item.id)}>
            {item.label} <span className="hk-tasks__count">{byFilter[item.id].length}</span>
          </button>
        ))}
      </div>

      {error && <FormBanner title={error} />}

      {shown.length === 0 && (
        <p className="hk-tasks__none">
          {filter === "mine" && "You have no assigned tasks. Pick up an Available one to earn cookies."}
          {filter === "available" && "No Available tasks right now."}
          {filter === "done" && "No completed tasks yet."}
          {filter === "open" && "All tasks are done. Nice!"}
        </p>
      )}

      {filter === "done" ? (
        <div className="hk-tasks__cards">{shown.map(card)}</div>
      ) : (
        <>
          {soon.length > 0 && (
            <>
              <h3 className="hk-group-label">{hasOverdue ? "Overdue and today" : "Today"}</h3>
              <div className="hk-tasks__cards">{soon.map(card)}</div>
            </>
          )}
          {later.length > 0 && (
            <>
              <h3 className="hk-group-label">Later</h3>
              <div className="hk-tasks__cards">{later.map(card)}</div>
            </>
          )}
        </>
      )}
    </>
  );
}

export default TaskList;
