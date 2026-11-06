import { Link } from "react-router-dom";
import { useUser } from "@clerk/react";
import cookieIcon from "../assets/cookie.svg";
import usePageLoadTracking from "../logic/usePageLoadTracking";
import { EmptyState } from "../components/states";

// Unknown address inside the app (HK-93): the shared empty state, top-aligned like every other state.
function NotFoundPage() {
  const { user } = useUser();

  usePageLoadTracking("NotFoundPage", user, "got lost");

  return (
    <EmptyState
      iconSrc={cookieIcon}
      title="Huh? We can’t find this page"
      text="The link may be old or mistyped. Have a cookie and head back home."
      actions={
        <Link to="/home" className="hk-btn hk-btn--primary">
          Go to Home
        </Link>
      }
    />
  );
}

export default NotFoundPage;
