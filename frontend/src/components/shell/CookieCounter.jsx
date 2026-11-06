import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import cookieIcon from "../../assets/cookie.svg";
import { listMyHistory } from "../../api/households";
import { useCurrentHousehold } from "../../logic/CurrentHousehold";
import useResident from "../../logic/useResident";

/*
 * HK-264: the resident's own cookies in the current household (was a fixed 120).
 * Re-read when the household or the page changes, so a finished task shows up after navigating.
 * Opens History → Mine.
 */
function CookieCounter() {
  const { user } = useResident();
  const { current } = useCurrentHousehold();
  const { pathname } = useLocation();
  const [cookies, setCookies] = useState(null);
  const householdId = current?.id;

  useEffect(() => {
    if (!user || !householdId) {
      setCookies(null);
      return undefined;
    }
    let active = true;
    listMyHistory(user)
      .then((data) => {
        if (active) {
          setCookies(data.perHousehold.find((item) => item.id === householdId)?.cookies ?? 0);
        }
      })
      .catch(() => active && setCookies(null));
    return () => {
      active = false;
    };
  }, [user, householdId, pathname]);

  if (!current) {
    return null;
  }

  const label = cookies === null ? "Your cookies are loading" : `Your cookies in ${current.name}: ${cookies}. Open your history`;

  return (
    <Link to="/history?view=mine" className="points-pill" aria-label={label}>
      <img src={cookieIcon} alt="" className="points-icon" />
      <span className="points-value">{cookies === null ? "…" : cookies}</span>
      <span className="points-label">your cookies here</span>
    </Link>
  );
}

export default CookieCounter;
