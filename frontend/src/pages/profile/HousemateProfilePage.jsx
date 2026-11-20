import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import cookieIcon from "../../assets/cookie.svg";
import { getMemberProfile } from "../../api/households";
import { Toast } from "../../components/forms";
import { ErrorState, LoadingState } from "../../components/states";
import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import usePageLoadTracking from "../../logic/usePageLoadTracking";
import useResident from "../../logic/useResident";
import RoleSheet from "../people/RoleSheet";
import { initials } from "../../logic/format";
import RoleChips from "../../components/ui/RoleChips";

/*
 * HK-69 Housemate profile view (design HK-68): /people/:memberId.
 * Roles, cookies, task counts, current tasks and recently completed ones.
 * The owner can change the housemate's role (same sheet as on People, HK-51).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dueLabel(iso) {
  const days = Math.round((startOfDay(iso) - startOfDay(new Date())) / DAY_MS);
  if (days < 0) return { text: "Overdue", urgent: true };
  if (days === 0) return { text: "Today", urgent: true };
  if (days === 1) return { text: "Tomorrow", urgent: false };
  return { text: `In ${days} days`, urgent: false };
}

function agoLabel(iso) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(iso)) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function HousemateProfilePage() {
  const { memberId } = useParams();
  const { user } = useResident();
  const { current } = useCurrentHousehold();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [roleOpen, setRoleOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const currentId = current?.id;

  usePageLoadTracking("HousemateProfilePage", user);

  const closeToast = useCallback(() => setToast(null), []);
  const closeRole = useCallback(() => setRoleOpen(false), []);

  useEffect(() => {
    if (!currentId || !user || memberId === user.id) {
      return undefined;
    }
    let active = true;
    setError(null);
    getMemberProfile(user, currentId, memberId)
      .then((data) => active && setProfile({ ...data, householdId: currentId }))
      .catch((loadError) => active && setError(loadError));
    return () => {
      active = false;
    };
  }, [currentId, memberId, user, reloadKey]);

  if (user && memberId === user.id) {
    return <Navigate to="/profile" replace />;
  }

  const back = (
    <Link to="/people" className="hk-back">
      People
    </Link>
  );

  if (error) {
    return (
      <div className="hk-household">
        {back}
        <ErrorState
          title={error.code === "not-found" ? "This housemate isn’t here" : undefined}
          text={
            error.code === "not-found"
              ? "They may have left the household, or the link belongs to another household."
              : "We couldn’t load this profile. Check your connection and try again."
          }
          onRetry={error.code === "not-found" ? null : () => setReloadKey((key) => key + 1)}
          homePath={null}
        />
      </div>
    );
  }

  if (!profile || profile.member.id !== memberId || profile.householdId !== currentId) {
    return (
      <div className="hk-household">
        {back}
        <LoadingState label="Loading profile…" variant="rows" count={3} />
      </div>
    );
  }

  const { member, currentTasks, completed, stats } = profile;
  const isOwner = Boolean(profile.viewerIsOwner);
  const firstName = member.name.split(" ")[0];

  return (
    <div className="hk-household hk-profile">
      {back}
      <div className="hk-page-grid hk-page-grid--side-first">
        <section className="hk-card hk-id-card" aria-labelledby="housemate-name">
          <span className="hk-id-card__avatar" aria-hidden="true">
            {initials(member.name)}
          </span>
          <h2 id="housemate-name">{member.name}</h2>
          <span className="hk-id-card__roles">
            <RoleChips roles={member.roles} />
          </span>
          <span className="hk-cookie-total">
            <img src={cookieIcon} alt="" />
            {member.cookies} {member.cookies === 1 ? "cookie" : "cookies"}
          </span>
          <div className="hk-stats">
            <div className="hk-stat">
              <div className="hk-stat__value">{stats.assignedNow}</div>
              <div className="hk-stat__label">Assigned now</div>
            </div>
            <div className="hk-stat">
              <div className="hk-stat__value">{stats.done}</div>
              <div className="hk-stat__label">Done</div>
            </div>
            <div className="hk-stat">
              <div className="hk-stat__value">{stats.doneThisWeek}</div>
              <div className="hk-stat__label">This week</div>
            </div>
          </div>
          {isOwner && (
            <div className="hk-id-card__actions">
              <button type="button" className="hk-btn hk-btn--secondary" onClick={() => setRoleOpen(true)}>
                Change role
              </button>
            </div>
          )}
        </section>

        <div>
          <section className="hk-card" aria-labelledby="current-tasks-heading">
            <h3 className="hk-card__title" id="current-tasks-heading">
              Current tasks
            </h3>
            {currentTasks.length > 0 ? (
              <ul className="hk-task-list">
                {currentTasks.map((task) => {
                  const due = dueLabel(task.due);
                  return (
                    <li key={task.id} className="hk-row">
                      <div>
                        <span className="hk-task-list__title">{task.title}</span>
                        {task.description && <span className="hk-task-list__sub">{task.description}</span>}
                      </div>
                      <span className="hk-row__end">
                        <span className={due.urgent ? "hk-due__when hk-due__when--today" : "hk-due__when"}>{due.text}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="hk-empty-mini">
                <span className="hk-empty-mini__hello">Nothing assigned yet</span>
                <span>{firstName} can pick up an available task on the Task board.</span>
              </div>
            )}
          </section>

          <section className="hk-card hk-section-gap" aria-labelledby="completed-heading">
            <h3 className="hk-card__title" id="completed-heading">
              Recently completed
            </h3>
            {completed.length > 0 ? (
              <ul className="hk-task-list">
                {completed.map((task) => (
                  <li key={task.id} className="hk-row">
                    <span className="hk-done-mark" aria-hidden="true">
                      ✓
                    </span>
                    <div>
                      <span className="hk-task-list__title">{task.title}</span>
                      <span className="hk-task-list__sub">{agoLabel(task.completedAt)}</span>
                    </div>
                    <span className="hk-cookies hk-cookies--small hk-row__end" aria-label={`${task.cookies} cookies earned`}>
                      <img src={cookieIcon} alt="" />+{task.cookies}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="hk-empty-mini">
                <span>No completed tasks yet — cookies will show up here.</span>
              </div>
            )}
          </section>
        </div>
      </div>

      {isOwner && (
        <RoleSheet
          open={roleOpen}
          member={member}
          isSelf={false}
          householdId={profile.householdId}
          householdName={current?.name}
          onClose={closeRole}
          onChanged={(message) => {
            setRoleOpen(false);
            setToast(message);
            setReloadKey((key) => key + 1);
          }}
        />
      )}
      <Toast message={toast} onClose={closeToast} />
    </div>
  );
}

export default HousemateProfilePage;
