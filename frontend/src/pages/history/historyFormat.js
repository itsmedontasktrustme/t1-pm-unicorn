/* Shared helpers for the History views (US10). */

const DAY_MS = 24 * 60 * 60 * 1000;

export function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dayLabel(iso) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(iso)) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Groups items (already sorted newest first) into [{ label, items }] by completion day. */
export function groupByDay(items) {
  return items.reduce((groups, item) => {
    const label = dayLabel(item.completedAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
    return groups;
  }, []);
}
