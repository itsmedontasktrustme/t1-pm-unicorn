import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import cookieIcon from "../../assets/cookie.svg";
import historyIcon from "../../assets/book-green.svg";
import { listHouseholdHistory } from "../../api/households";
import { EmptyState, ErrorState, LoadingState } from "../../components/states";
import { groupByDay, initials } from "./historyFormat";

/*
 * HK-90 Household history view (design HK-89, US10 steps 2–5):
 * completed tasks of the current household with assignee, who marked it done and cookies,
 * plus every housemate's total cookies.
 */

const AVATAR_COLOURS = ["var(--hk-orange)", "var(--hk-lime)", "#e9dcc8", "var(--hk-peach)"];

function HouseholdHistory({ user, householdId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!householdId || !user) {
      return undefined;
    }
    let active = true;
    setError(null);
    listHouseholdHistory(user, householdId)
      .then((result) => active && setData({ ...result, householdId }))
      .catch((loadError) => active && setError(loadError));
    return () => {
      active = false;
    };
  }, [householdId, user, reloadKey]);

  if (error) {
    return <ErrorState text="We couldn’t load the history. Check your connection and try again." onRetry={() => setReloadKey((key) => key + 1)} homePath={null} />;
  }

  if (!data || data.householdId !== householdId) {
    return <LoadingState label="Loading history…" variant="rows" count={4} />;
  }

  const lead = (
    <p className="hk-history__lead">
      Completed tasks and cookies in <strong>{data.householdName}</strong>. Switch the household next to the logo.
    </p>
  );

  if (data.completed.length === 0) {
    return (
      <>
        {lead}
        <EmptyState
          iconSrc={historyIcon}
          title="There are no completed tasks in this household yet"
          text="When housemates finish tasks, you’ll see who did what, who marked it done and the cookies they earned."
          actions={
            <Link to="/tasks" className="hk-btn hk-btn--secondary">
              Go to Task board
            </Link>
          }
        />
      </>
    );
  }

  const colourOf = (memberId) => AVATAR_COLOURS[Math.max(0, data.totals.findIndex((item) => item.id === memberId)) % AVATAR_COLOURS.length];
  const maxCookies = Math.max(1, ...data.totals.map((item) => item.cookies));

  return (
    <>
      {lead}
      <div className="hk-history__grid">
        <section className="hk-card hk-history__totals" aria-labelledby="totals-heading">
          <h3 className="hk-card__title" id="totals-heading">
            Cookies by housemate
          </h3>
          {data.totals.map((item) => (
            <div key={item.id} className="hk-bar-row">
              <span className="hk-avatar" style={{ background: colourOf(item.id) }} aria-hidden="true">
                {initials(item.name)}
              </span>
              <div>
                <span className="hk-bar-row__name">
                  {item.name} {item.id === user?.id && <span className="hk-member__you">(you)</span>}
                </span>
                <div className="hk-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(2, Math.round((item.cookies / maxCookies) * 100))}%` }} />
                </div>
              </div>
              <span className="hk-bar-row__cookies" aria-label={`${item.cookies} cookies`}>
                <img src={cookieIcon} alt="" />
                {item.cookies}
              </span>
            </div>
          ))}
        </section>

        <section className="hk-card" aria-labelledby="completed-heading">
          <h3 className="hk-card__title" id="completed-heading">
            Completed tasks
          </h3>
          {groupByDay(data.completed).map((group) => (
            <div key={group.label}>
              <div className="hk-history__day">{group.label}</div>
              <ul className="hk-day-list">
                {group.items.map((task) => (
                  <li key={task.id} className="hk-done">
                    <span className="hk-done-mark" aria-hidden="true">
                      ✓
                    </span>
                    <div>
                      <span className="hk-done__title">{task.title}</span>
                      <span className="hk-done__who">
                        <span className="hk-avatar" style={{ background: colourOf(task.memberId) }} aria-hidden="true">
                          {initials(task.assigneeName)}
                        </span>
                        <span>
                          {task.assigneeName} · marked done by {task.markedById === user?.id ? "you" : task.markedByName}
                        </span>
                      </span>
                    </div>
                    <span className="hk-done__cookies" aria-label={`${task.cookies} cookies`}>
                      <img src={cookieIcon} alt="" />+{task.cookies}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

export default HouseholdHistory;
