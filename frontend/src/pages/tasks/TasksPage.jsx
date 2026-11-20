import { useCallback, useEffect, useState } from "react";
import { Outlet, useMatch } from "react-router-dom";
import { listTasks } from "../../api/tasks";
import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import useResident from "../../logic/useResident";
import usePageLoadTracking from "../../logic/usePageLoadTracking";
import { ErrorState, LoadingState } from "../../components/states";
import { Toast } from "../../components/forms";
import TaskList from "./TaskList";

/*
 * Tasks tab (design HK-71…HK-83, Confluence "Group 7 — Tasks").
 * Phone: the list, a task and the form are separate screens.
 * Desktop (≥1024 px): the list on the left, the selected task or the form on the right.
 * Child routes: index (nothing selected), new, :taskId, :taskId/edit.
 */

function TasksPage() {
  const { user } = useResident();
  const { current, isLoading: householdLoading } = useCurrentHousehold();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const sideMatch = useMatch("/tasks/:taskId/*");
  const selectedId = sideMatch && sideMatch.params.taskId !== "new" ? sideMatch.params.taskId : null;

  usePageLoadTracking("TasksPage", user);

  const householdId = current?.id;

  useEffect(() => {
    if (!householdId || !user) {
      return undefined;
    }
    let active = true;
    setError(null);
    listTasks(user, householdId)
      .then((result) => active && setData({ ...result, householdId }))
      .catch((loadError) => active && setError(loadError));
    return () => {
      active = false;
    };
  }, [user, householdId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const closeToast = useCallback(() => setToast(null), []);

  if (error) {
    return <ErrorState onRetry={reload} />;
  }

  if (householdLoading || !data || data.householdId !== householdId) {
    return <LoadingState label="Loading tasks…" count={3} />;
  }

  const outlet = { data, householdId, householdName: current.name, user, reload, showToast: setToast };

  return (
    <div className={["hk-tasks", sideMatch && "hk-tasks--side", data.tasks.length === 0 && !sideMatch && "hk-tasks--empty"].filter(Boolean).join(" ")}>
      <section className="hk-tasks__list" aria-label="Task list">
        <TaskList data={data} selectedId={selectedId} context={outlet} />
      </section>
      <section className="hk-tasks__side">
        <Outlet context={outlet} />
      </section>
      <Toast message={toast} onClose={closeToast} />
    </div>
  );
}

export default TasksPage;
