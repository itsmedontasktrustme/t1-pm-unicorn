import cookieImage from "../assets/haveAcookie.jpg";
import { useUser } from "@clerk/react";
import { useEffect, useRef } from "react";
import { trackAction } from "../logic/HistoryTracker";

function NotFoundPage() {
    const { user } = useUser();
    const hasTrackedLoad = useRef(false);

    useEffect(() => {
        if (hasTrackedLoad.current) {
            return;
        }

        hasTrackedLoad.current = true;
        trackAction("NotFoundPage", user, "got lost");
    }, [user]);

    return (
    <section className="placeholder-page not-found-page" aria-label="Page not found">
      <h2>Huh?</h2>
      <p>Can’t find what you’re looking for.</p>
      <p>Have a cookie and try again later.</p>
      <img src={cookieImage} alt="Have a Cookie" className="not-found-image" />
    </section>
  );
}

export default NotFoundPage;
