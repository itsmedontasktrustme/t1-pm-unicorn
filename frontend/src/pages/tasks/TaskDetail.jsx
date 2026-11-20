import { useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import cookieIcon from "../../assets/cookie.svg";
import Sheet from "../../components/Sheet";
import { FormBanner } from "../../components/forms";
import { initials } from "../../logic/format";
import { assignTask, deleteTask, giveBackTask, handOverTask, markTaskDone, pickUpTask, returnTask } from "../../api/tasks";
import { StatusChip } from "./TaskCard";
import { announceCookiesChanged, completedText, detailDue, doneToast, isOverdue } from "./taskFormat";

/*
 * HK-78 Task detail (design HK-77) and HK-84 status / assignment controls (design HK-83).
 * Actions follow US6–US9 as updated on 20.11.: the responsible manager edits, deletes, assigns,
 * hands over and returns the task; only the assignee marks it as done.
 * Actions the resident may not take are not offered.
 */

function Avatar({ name, size }) {
  return (
    <span className={size ? `hk-avatar hk-avatar--${size}` : "hk-avatar"} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

function ConfirmSheet({ open, title, text, cancel, confirm, busy, onCancel, onConfirm }) {
  return (
    <Sheet open={open} onClose={onCancel} labelledBy="task-confirm-title">
      <h2 id="task-confirm-title">{title}</h2>
      <p>{text}</p>
      <div className="hk-sheet__actions hk-sheet__actions--two">
        <button type="button" className="hk-btn hk-btn--secondary" onClick={onCancel}>
          {cancel}
        </button>
        <button type="button" className="hk-btn hk-btn--primary" disabled={busy} onClick={onConfirm}>
          {confirm}
        </button>
      </div>
    </Sheet>
  );
}

function AssignSheet({ open, task, members, meId, busy, onCancel, onAssign }) {
  const [choice, setChoice] = useState(task.assigneeId);
  const chosen = members.find((member) => member.id === choice);

  return (
    <Sheet open={open} onClose={onCancel} labelledBy="task-assign-title">
      <h2 id="task-assign-title">{task.assigneeId ? "Reassign task" : "Assign task"}</h2>
      <div className="hk-tasks__sheet-task">
        <strong>{task.title}</strong>
        <span className="hk-cookies">
          {task.cookies}
          <img src={cookieIcon} alt="" />
        </span>
      </div>
      <div className="hk-people-pick" role="radiogroup" aria-label="Housemate">
        {members.map((member) => (
          <label key={member.id} className={choice === member.id ? "hk-person hk-person--on" : "hk-person"}>
            <input
              type="radio"
              name="assignee"
              value={member.id}
              checked={choice === member.id}
              onChange={() => setChoice(member.id)}
            />
            <Avatar name={member.name} size="medium" />
            <span>
              {member.name}
              {member.id === meId && <small>you</small>}
              {member.id === task.assigneeId && <small>assigned now</small>}
            </span>
          </label>
        ))}
      </div>
      {task.assigneeId && chosen && chosen.id !== task.assigneeId && (
        <p className="hk-hint">{task.assigneeName} will no longer see this task in their list.</p>
      )}
      <div className="hk-sheet__actions hk-sheet__actions--two">
        <button type="button" className="hk-btn hk-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="hk-btn hk-btn--primary"
          disabled={busy || !chosen || chosen.id === task.assigneeId}
          onClick={() => onAssign(chosen)}
        >
          {chosen && chosen.id !== task.assigneeId ? `Assign to ${chosen.id === meId ? "me" : chosen.name.split(" ")[0]}` : "Assign"}
        </button>
      </div>
    </Sheet>
  );
}

/** US6 4c–4d: choose another manager of the household who becomes responsible for the task. */
function HandOverSheet({ open, task, managers, busy, onCancel, onHandOver }) {
  const [choice, setChoice] = useState(null);
  const chosen = managers.find((member) => member.id === choice);

  return (
    <Sheet open={open} onClose={onCancel} labelledBy="task-handover-title">
      <h2 id="task-handover-title">Hand over responsibility</h2>
      <div className="hk-tasks__sheet-task">
        <strong>{task.title}</strong>
      </div>
      <div className="hk-people-pick" role="radiogroup" aria-label="Manager">
        {managers.map((member) => (
          <label key={member.id} className={choice === member.id ? "hk-person hk-person--on" : "hk-person"}>
            <input type="radio" name="manager" value={member.id} checked={choice === member.id} onChange={() => setChoice(member.id)} />
            <Avatar name={member.name} size="medium" />
            <span>{member.name}</span>
          </label>
        ))}
      </div>
      <p className="hk-hint">They will edit, assign and return this task instead of you.</p>
      <div className="hk-sheet__actions hk-sheet__actions--two">
        <button type="button" className="hk-btn hk-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="hk-btn hk-btn--primary" disabled={busy || !chosen} onClick={() => onHandOver(chosen)}>
          {chosen ? `Hand over to ${chosen.name.split(" ")[0]}` : "Hand over"}
        </button>
      </div>
    </Sheet>
  );
}

function Fact({ label, children, extra }) {
  return (
    <div className="hk-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
      {extra || <span />}
    </div>
  );
}

function TaskDetail() {
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data, user, householdId, householdName, reload, showToast } = useOutletContext();
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const query = searchParams.toString() ? `?${searchParams}` : "";
  const backTo = `/tasks${query}`;

  const task = data.tasks.find((item) => item.id === taskId);
  const { me, members } = data;

  if (!task) {
    return (
      <div className="hk-card hk-tasks__panel">
        <Link className="hk-back" to={backTo}>
          Tasks
        </Link>
        <p>This task no longer exists.</p>
      </div>
    );
  }

  const isMine = task.assigneeId === me.id;
  const isResponsible = task.managerId === me.id;
  const otherManagers = members.filter((member) => member.roles.includes("manager") && member.id !== task.managerId);
  const overdue = isOverdue(task);

  const run = async (action, after) => {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      setSheet(null);
      after?.(result);
      reload();
    } catch (actionError) {
      setSheet(null);
      setError(actionError.message);
      reload();
    } finally {
      setBusy(false);
    }
  };

  const markDone = () =>
    run(
      () => markTaskDone(user, householdId, task.id),
      ({ credited }) => {
        showToast(doneToast(credited, isMine, task.assigneeName));
        announceCookiesChanged();
      }
    );
  const pickUp = () => run(() => pickUpTask(user, householdId, task.id), () => showToast(`You picked up “${task.title}”`));

  let actions = null;
  if (task.status === "available") {
    actions = isResponsible ? (
      <div className="hk-tasks__actions hk-tasks__actions--two">
        <button type="button" className="hk-btn hk-btn--secondary" onClick={() => setSheet("assign")}>
          Assign
        </button>
        <button type="button" className="hk-btn hk-btn--primary" disabled={busy} onClick={pickUp}>
          Pick up task
        </button>
      </div>
    ) : (
      <div className="hk-tasks__actions">
        <button type="button" className="hk-btn hk-btn--primary" disabled={busy} onClick={pickUp}>
          Pick up task
        </button>
      </div>
    );
  } else if (task.status === "assigned" && isMine) {
    actions = (
      <>
        <div className="hk-tasks__actions hk-tasks__actions--two">
          <button type="button" className="hk-btn hk-btn--secondary" onClick={() => setSheet("giveback")}>
            Give back
          </button>
          <button type="button" className="hk-btn hk-btn--primary" disabled={busy} onClick={markDone}>
            Mark as done
          </button>
        </div>
        {overdue && <p className="hk-hint">It can still be marked as done, but you get no cookies for it.</p>}
      </>
    );
  } else if (task.status === "assigned") {
    // US9 5a: only the assignee marks it as done; the responsible manager can still reassign it.
    actions = (
      <div className="hk-tasks__note">
        {isResponsible
          ? `Only ${task.assigneeName} can mark this task as done.`
          : "Only the responsible manager can hand this task over to someone else."}
      </div>
    );
  } else if (task.status === "done" && isResponsible) {
    actions = (
      <>
        <div className="hk-tasks__note">A task with the status DONE cannot be edited. Return it first to make changes.</div>
        <div className="hk-tasks__actions">
          <button type="button" className="hk-btn hk-btn--secondary" onClick={() => setSheet("return")}>
            Return task
          </button>
        </div>
      </>
    );
  }

  const assigneeExtra =
    isResponsible && task.status === "assigned" ? (
      <button type="button" className="hk-link-btn" onClick={() => setSheet("assign")}>
        Reassign
      </button>
    ) : null;

  return (
    <div className="hk-card hk-tasks__panel">
      <Link className="hk-back" to={backTo}>
        Tasks
      </Link>
      <div className="hk-tasks__detail">
        {error && <FormBanner title={error} />}

        <div className="hk-tasks__detail-head">
          <StatusChip status={task.status} />
          <h2>{task.title}</h2>
          {task.description ? <p className="hk-tasks__desc">{task.description}</p> : <p className="hk-hint">No description.</p>}
        </div>

        <dl className="hk-facts">
          <Fact label="Assignee" extra={assigneeExtra}>
            {task.assigneeName ? (
              <>
                <Avatar name={task.assigneeName} />
                <span>
                  {task.assigneeName}
                  {isMine && <small>you</small>}
                </span>
              </>
            ) : (
              <>
                <span className="hk-nobody" aria-hidden="true" />
                <span>
                  Nobody yet
                  <small>Anyone can pick it up</small>
                </span>
              </>
            )}
          </Fact>
          <Fact label="Responsible">
            {task.managerName ? (
              <>
                <Avatar name={task.managerName} />
                <span>
                  {task.managerName}
                  {isResponsible && <small>you</small>}
                </span>
              </>
            ) : (
              <span>—</span>
            )}
          </Fact>
          {task.status === "done" ? (
            <Fact label="Completed">
              <span>{completedText(task)}</span>
            </Fact>
          ) : (
            <Fact label="Due">
              {task.due ? (
                <span>
                  {overdue ? (
                    <span className="hk-due-late">
                      <span className="hk-due-late__icon" aria-hidden="true">!</span>
                      {detailDue(task)}
                    </span>
                  ) : (
                    detailDue(task)
                  )}
                  <small className={overdue ? "hk-due-late__note" : undefined}>
                    {overdue ? "No cookies once the due date has passed" : "Cookies only if it’s done by then"}
                  </small>
                </span>
              ) : (
                <span>
                  No due date
                  <small>Cookies whenever it’s done</small>
                </span>
              )}
            </Fact>
          )}
          <Fact label="Cookies">
            <span className="hk-cookies">
              {task.status === "done" ? `+${task.creditedCookies ?? task.cookies}` : task.cookies}
              <img src={cookieIcon} alt="" />
            </span>
            {task.status === "done" && task.assigneeName && (
              <small>credited to {isMine ? "you" : task.assigneeName}</small>
            )}
          </Fact>
        </dl>

        {actions}

        {isResponsible && task.status !== "done" && (
          <div className="hk-tasks__manage">
            <Link className="hk-link-btn" to={`/tasks/${task.id}/edit${query}`}>
              Edit task
            </Link>
            {otherManagers.length > 0 && (
              <button type="button" className="hk-link-btn" onClick={() => setSheet("handover")}>
                Hand over responsibility
              </button>
            )}
            <button type="button" className="hk-link-btn hk-link-btn--quiet" onClick={() => setSheet("delete")}>
              Delete task
            </button>
          </div>
        )}
      </div>

      {sheet === "assign" && (
        <AssignSheet
          open
          task={task}
          members={members}
          meId={me.id}
          busy={busy}
          onCancel={() => setSheet(null)}
          onAssign={(member) =>
            run(
              () => assignTask(user, householdId, task.id, member.id),
              () => showToast(`Assigned to ${member.id === me.id ? "you" : member.name}`)
            )
          }
        />
      )}
      {sheet === "handover" && (
        <HandOverSheet
          open
          task={task}
          managers={otherManagers}
          busy={busy}
          onCancel={() => setSheet(null)}
          onHandOver={(manager) =>
            run(
              () => handOverTask(user, householdId, task.id, manager.id),
              () => showToast(`${manager.name} is now responsible for this task`)
            )
          }
        />
      )}
      <ConfirmSheet
        open={sheet === "giveback"}
        title="Give this task back?"
        text={`“${task.title}” becomes Available again. Anyone can pick it up, or the responsible manager can assign it.`}
        cancel="Keep it"
        confirm="Give back"
        busy={busy}
        onCancel={() => setSheet(null)}
        onConfirm={() => run(() => giveBackTask(user, householdId, task.id), () => showToast("Task given back"))}
      />
      <ConfirmSheet
        open={sheet === "return"}
        title="Return this task?"
        text={`“${task.title}” goes back to TO DO${task.assigneeName ? ` and stays with ${task.assigneeName}` : ""}. Its cookies are no longer counted.`}
        cancel="Cancel"
        confirm="Return task"
        busy={busy}
        onCancel={() => setSheet(null)}
        onConfirm={() =>
          run(
            () => returnTask(user, householdId, task.id),
            () => {
              showToast("Task returned");
              announceCookiesChanged();
            }
          )
        }
      />
      <ConfirmSheet
        open={sheet === "delete"}
        title="Delete this task?"
        text={`“${task.title}” disappears for everyone in ${householdName}. This cannot be undone.`}
        cancel="Keep task"
        confirm="Delete task"
        busy={busy}
        onCancel={() => setSheet(null)}
        onConfirm={() =>
          run(
            () => deleteTask(user, householdId, task.id),
            () => {
              showToast("Task deleted");
              navigate(backTo);
            }
          )
        }
      />
    </div>
  );
}

export default TaskDetail;
