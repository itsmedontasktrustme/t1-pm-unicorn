import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import cookieIcon from "../../assets/cookie.svg";
import historyIcon from "../../assets/book-green.svg";
import { listMyHistory } from "../../api/households";
import { EmptyState, ErrorState, LoadingState } from "../../components/states";
import { groupByDay } from "./historyFormat";

/*
 * HK-87 Resident history view (design HK-86, US10 2a–2b):
 * the resident's own completed tasks and cookies across all their households.
 */
function MyHistory({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) {
      return undefined;
    }
    let active = true;
    setError(null);
    listMyHistory(user)
      .then((result) => active && setData(result))
      .catch((loadError) => active && setError(loadError));
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  if (error) {
    return <ErrorState text="We couldn’t load your history. Check your connection and try again." onRetry={() => setReloadKey((key) => key + 1)} homePath={null} />;
  }

  if (!data) {
    return <LoadingState label="Loading your history…" variant="rows" count={3} />;
  }

  return (
    <>
      <p className="hk-history__lead">Your completed tasks and cookies across all your households.</p>
      <div className="hk-history__grid">
        <section className="hk-card hk-mine-total hk-history__totals" aria-label="Your cookies">
          <span className="hk-mine-total__value">
            <img src={cookieIcon} alt="" />
            {data.totalCookies}
          </span>
          <span className="hk-mine-total__label">{data.totalCookies === 1 ? "cookie" : "cookies"} in total</span>
          <div className="hk-mine-total__split">
            {data.perHousehold.map((item) => (
              <span key={item.id}>
                <img src={cookieIcon} alt="" />
                {item.cookies} · {item.name}
              </span>
            ))}
          </div>
        </section>

        <section className="hk-card" aria-labelledby="my-completed-heading">
          <h3 className="hk-card__title" id="my-completed-heading">
            Your completed tasks
          </h3>
          {data.completed.length === 0 ? (
            <EmptyState
              iconSrc={historyIcon}
              title="You haven’t completed any tasks yet"
              text="Pick up an available task to earn your first cookies."
              actions={
                <Link to="/tasks" className="hk-btn hk-btn--secondary">
                  Go to Task board
                </Link>
              }
            />
          ) : (
            groupByDay(data.completed).map((group) => (
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
                          <span className="hk-hh-tag">{task.householdName}</span>
                          <span>marked done by {task.markedById === user?.id ? "you" : task.markedByName}</span>
                        </span>
                      </div>
                      <span className="hk-done__cookies" aria-label={`${task.cookies} cookies`}>
                        <img src={cookieIcon} alt="" />+{task.cookies}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}

export default MyHistory;
