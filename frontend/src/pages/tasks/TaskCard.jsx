import { Link } from "react-router-dom";
import cookieIcon from "../../assets/cookie.svg";
import { initials } from "../history/historyFormat";
import { cardDue, completedText, STATUS_LABELS } from "./taskFormat";

/* One task in the list (HK-72): status, name, assignee, due date, cookies and a quick action. */

export function StatusChip({ status }) {
  return <span className={`hk-status hk-status--${status}`}>{STATUS_LABELS[status]}</span>;
}

export function DueText({ due }) {
  if (due.tone === "late") {
    return (
      <span className="hk-due-late">
        <span className="hk-due-late__icon" aria-hidden="true">!</span>
        {due.text}
      </span>
    );
  }
  return <span className={due.tone === "today" ? "hk-due-today" : undefined}>{due.text}</span>;
}

function TaskCard({ task, meId, selected, to, busy, onQuickAction }) {
  const isMine = task.assigneeId === meId;
  const done = task.status === "done";
  const due = done ? { text: `Done ${completedText(task)}`, tone: "plain" } : cardDue(task);

  let action = null;
  if (task.status === "available") {
    action = (
      <button type="button" className="hk-btn hk-btn--secondary" disabled={busy} onClick={() => onQuickAction(task)}>
        Pick up
      </button>
    );
  } else if (task.status === "assigned" && isMine) {
    action = (
      <button type="button" className="hk-btn hk-btn--primary" disabled={busy} onClick={() => onQuickAction(task)}>
        Mark as done
      </button>
    );
  }

  return (
    <article className={["hk-task", selected && "hk-task--selected", done && "hk-task--done"].filter(Boolean).join(" ")}>
      <div className="hk-task__main">
        <StatusChip status={task.status} />
        <Link className="hk-task__title" to={to} aria-current={selected ? "true" : undefined}>
          {task.title}
        </Link>
        <div className="hk-task__meta">
          {task.assigneeName ? (
            <span className="hk-task__who">
              <span className="hk-avatar hk-avatar--tiny" aria-hidden="true">
                {initials(task.assigneeName)}
              </span>
              {isMine ? "You" : task.assigneeName}
            </span>
          ) : (
            <span>No assignee</span>
          )}
          <span aria-hidden="true">·</span>
          <DueText due={due} />
        </div>
      </div>
      <div className="hk-task__side">
        <span className="hk-task__cookies" aria-label={`${done ? task.creditedCookies ?? task.cookies : task.cookies} cookies`}>
          {done ? "+" : ""}
          {done ? task.creditedCookies ?? task.cookies : task.cookies}
          <img src={cookieIcon} alt="" />
        </span>
        {action}
      </div>
    </article>
  );
}

export default TaskCard;
