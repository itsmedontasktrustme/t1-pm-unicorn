import wordmark from "../../assets/wordmark.svg";
import homeIcon from "../../assets/home-green.svg";
import tasksIcon from "../../assets/tasks-green.svg";
import cookieIcon from "../../assets/cookie.svg";

const TAGLINE = "Shared chores, clear owners — and cookies for every job done.";

/**
 * Layout for screens shown before the user is in the app (no header, no bottom nav).
 * Desktop: brand panel on the left, content on the right. Phone: content only.
 */
function GuestLayout({ children }) {
  return (
    <div className="hk-guest">
      <aside className="hk-guest__brand" aria-hidden="true">
        <img className="hk-guest__brand-wordmark" src={wordmark} alt="" />
        <p className="hk-guest__tagline">{TAGLINE}</p>
        <ul className="hk-guest__benefits">
          <li>
            <span className="hk-guest__benefit-icon"><img src={homeIcon} alt="" /></span>
            One place for your whole household
          </li>
          <li>
            <span className="hk-guest__benefit-icon"><img src={tasksIcon} alt="" /></span>
            Everyone sees who does what and by when
          </li>
          <li>
            <span className="hk-guest__benefit-icon"><img src={cookieIcon} alt="" /></span>
            Earn cookies for finished tasks
          </li>
        </ul>
      </aside>
      <main className="hk-guest__main">{children}</main>
    </div>
  );
}

export { TAGLINE };
export default GuestLayout;
