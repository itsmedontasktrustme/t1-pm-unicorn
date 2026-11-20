/* Formatting helpers for the Tasks tab (HK-72…HK-84). */

// Tells the cookie counter in the header to reload after cookies changed (US9).
export function announceCookiesChanged() {
  window.dispatchEvent(new Event("homekeeper:cookies-changed"));
}

/** Toast after Mark as done (US9): cookies for the resident, for the assignee, or none. */
export function doneToast(credited, forMe, assigneeName) {
  if (credited > 0) {
    return (
      <>
        <span className="hk-toast__hand">Nice work!</span> +{credited} cookies {forMe ? "for you" : `for ${assigneeName}`}
      </>
    );
  }
  return "Marked as done. No cookies for this one.";
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const STATUS_LABELS = { available: "Available", assigned: "Assigned", done: "Done" };

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayDiff(date, now) {
  return Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
}

function time(date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dayMonth(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function weekdayDayMonth(date) {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function isOverdue(task, now = new Date()) {
  return task.status !== "done" && Boolean(task.due) && new Date(task.due) < now;
}

/** Short due text for a task card: "Due today", "Overdue · was due yesterday", "No due date". */
export function cardDue(task, now = new Date()) {
  if (!task.due) {
    return { text: "No due date", tone: "plain" };
  }
  const due = new Date(task.due);
  const days = dayDiff(due, now);

  if (isOverdue(task, now)) {
    if (days === 0) return { text: `Overdue · was due ${time(due)}`, tone: "late" };
    if (days === -1) return { text: "Overdue · was due yesterday", tone: "late" };
    return { text: `Overdue · was due ${dayMonth(due)}`, tone: "late" };
  }
  if (days === 0) return { text: "Due today", tone: "today" };
  if (days === 1) return { text: "Due tomorrow", tone: "plain" };
  return { text: `Due ${weekdayDayMonth(due)}`, tone: "plain" };
}

/** Long due text for the task detail: "Today, Sat 14 Nov, 18:00" or "Overdue · 13 Nov, 18:00". */
export function detailDue(task, now = new Date()) {
  const due = new Date(task.due);
  const days = dayDiff(due, now);
  const at = `${weekdayDayMonth(due)}, ${time(due)}`;

  if (isOverdue(task, now)) return `Overdue · ${dayMonth(due)}, ${time(due)}`;
  if (days === 0) return `Today, ${at}`;
  if (days === 1) return `Tomorrow, ${at}`;
  return at;
}

export function completedText(task) {
  return task.completedAt ? dayMonth(new Date(task.completedAt)) : "";
}

/** Splits open tasks into "Overdue and today" and "Later", each sorted by due date (no due date last). */
export function groupOpenTasks(tasks, now = new Date()) {
  const byDue = [...tasks].sort((a, b) => {
    if (!a.due && !b.due) return a.title.localeCompare(b.title);
    if (!a.due) return 1;
    if (!b.due) return -1;
    return new Date(a.due) - new Date(b.due);
  });
  const soon = byDue.filter((task) => task.due && (isOverdue(task, now) || dayDiff(new Date(task.due), now) === 0));
  const later = byDue.filter((task) => !soon.includes(task));
  return { soon, later, hasOverdue: soon.some((task) => isOverdue(task, now)) };
}

/** Value for <input type="date"> and <input type="time"> from an ISO string, and back. */
export function splitDue(iso) {
  if (!iso) return { date: "", time: "" };
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}

export function joinDue(date, timeValue) {
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = (timeValue || "23:59").split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}
