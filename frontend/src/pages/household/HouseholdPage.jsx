import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import cookieIcon from "../../assets/cookie.svg";
import { getHousehold } from "../../api/households";
import { ErrorState, LoadingState } from "../../components/states";
import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import usePageLoadTracking from "../../logic/usePageLoadTracking";
import useResident from "../../logic/useResident";

/*
 * HK-60 Household view (design HK-59) — the Home tab.
 * ?created=1 / ?joined=1 show a one-time "ready" banner after US1 / US3.
 */

const ROLE_LABELS = { owner: "Owner", manager: "Manager", housemate: "Housemate" };
const AVATAR_COLOURS = ["var(--hk-orange)", "var(--hk-lime)", "var(--hk-peach)", "#e9dcc8"];
const DAY_MS = 24 * 60 * 60 * 1000;

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function RoleChips({ roles }) {
  return roles.map((role) => (
    <span key={role} className={`hk-chip hk-chip--${role}`}>
      {ROLE_LABELS[role] || role}
    </span>
  ));
}

function dueLabel(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / DAY_MS);

  if (days < 0) return { text: "Overdue", today: true };
  if (days === 0) return { text: "Today", today: true };
  if (days === 1) return { text: "Tomorrow", today: false };
  return { text: `In ${days} days`, today: false };
}

function HouseholdPage() {
  const { user } = useResident();
  const { households, current, error: listError, isLoading, refresh } = useCurrentHousehold();
  const [searchParams] = useSearchParams();
  const [household, setHousehold] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const currentId = current?.id;

  usePageLoadTracking("HouseholdPage", user);

  useEffect(() => {
    if (!currentId || !user) {
      return undefined;
    }

    let active = true;
    setHousehold(null);
    setError(null);
    getHousehold(user, currentId)
      .then((data) => active && setHousehold(data))
      .catch((loadError) => active && setError(loadError));

    return () => {
      active = false;
    };
  }, [currentId, user, reloadKey]);

  if (listError) {
    return <ErrorState text="We couldn’t load your households. Check your connection and try again." onRetry={refresh} homePath={null} />;
  }

  if (!isLoading && households?.length === 0) {
    // US0 step 9: a resident without a household chooses to create or join one.
    return <Navigate to="/welcome" replace />;
  }

  if (error) {
    return (
      <ErrorState
        text="We couldn’t load this household. Check your connection and try again."
        onRetry={() => setReloadKey((key) => key + 1)}
        homePath={null}
      />
    );
  }

  if (isLoading || !household) {
    return <LoadingState label="Loading your household…" count={2} />;
  }

  const me = household.members.find((member) => member.id === user?.id);
  const isOwner = me?.roles.includes("owner");
  const openTasks = household.tasks.filter((task) => task.status !== "done");
  const myTasks = openTasks.filter((task) => task.assigneeName && task.assigneeName === me?.name);
  const dueSoon = [...openTasks].sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 3);
  const justCreated = searchParams.get("created") === "1";
  const justJoined = searchParams.get("joined") === "1";

  return (
    <div className="hk-household">
      {(justCreated || justJoined) && (
        <div className="hk-household__ready" role="status">
          <div>
            <strong>{justCreated ? `${household.name} is ready!` : `Welcome to ${household.name}!`}</strong>
            <p>
              {justCreated
                ? "You’re the owner and a manager. Invite the people you live with to get started."
                : "You’re now a housemate. Pick up a task to earn your first cookies."}
            </p>
          </div>
        </div>
      )}

      <div className="hk-household__head">
        <h2>{household.name}</h2>
        {me && <RoleChips roles={me.roles} />}
      </div>

      <div className="hk-household__grid">
        <div>
          <div className="hk-stats">
            <div className="hk-stat">
              <div className="hk-stat__value">{openTasks.length}</div>
              <div className="hk-stat__label">Open tasks</div>
            </div>
            <div className="hk-stat">
              <div className="hk-stat__value">{myTasks.length}</div>
              <div className="hk-stat__label">Assigned to you</div>
            </div>
            <div className="hk-stat hk-stat--cookies">
              <div className="hk-stat__value">
                <img src={cookieIcon} alt="" />
                {me?.cookies ?? 0}
              </div>
              <div className="hk-stat__label">Your cookies</div>
            </div>
          </div>

          <section className="hk-card" aria-labelledby="due-soon-title">
            <h3 className="hk-card__title" id="due-soon-title">
              Due soon
              {dueSoon.length > 0 && <Link to="/tasks">Task board ›</Link>}
            </h3>
            {dueSoon.length > 0 ? (
              <ul className="hk-due">
                {dueSoon.map((task) => {
                  const label = dueLabel(task.due);
                  return (
                    <li key={task.id}>
                      <div>
                        <span className="hk-due__title">{task.title}</span>
                        <span className="hk-due__who">{task.assigneeName || "Available"}</span>
                      </div>
                      <span className={label.today ? "hk-due__when hk-due__when--today" : "hk-due__when"}>{label.text}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="hk-lonely">
                <p>No tasks yet. Create the first one — or invite your housemates first.</p>
                <Link to="/tasks" className="hk-btn hk-btn--secondary">
                  Create task
                </Link>
              </div>
            )}
          </section>
        </div>

        <section className="hk-card" aria-labelledby="housemates-title">
          <h3 className="hk-card__title" id="housemates-title">
            Housemates ({household.members.length})
            {isOwner && household.members.length > 1 && <Link to="/people">Manage roles ›</Link>}
          </h3>
          <ul className="hk-members">
            {household.members.map((member, index) => (
              <li key={member.id} className="hk-member">
                <span className="hk-avatar" style={{ background: AVATAR_COLOURS[index % AVATAR_COLOURS.length] }} aria-hidden="true">
                  {initials(member.name)}
                </span>
                <div>
                  <span className="hk-member__name">
                    {member.name} {member.id === user?.id && <span className="hk-member__you">(you)</span>}
                  </span>
                  <span className="hk-member__roles">
                    <RoleChips roles={member.roles} />
                  </span>
                </div>
                <span className="hk-member__cookies" aria-label={`${member.cookies} cookies`}>
                  <img src={cookieIcon} alt="" />
                  {member.cookies}
                </span>
              </li>
            ))}
          </ul>
          {household.members.length === 1 && (
            <div className="hk-lonely">
              <span className="hk-lonely__hello">It’s just you for now</span>
              <p>Send an invitation link or code — it’s valid for 7 days.</p>
            </div>
          )}
          {isOwner && (
            <div className="hk-card__actions">
              <Link to="/people" className="hk-btn hk-btn--primary">
                Invite housemates
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default HouseholdPage;
