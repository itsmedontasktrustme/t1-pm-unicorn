import { useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { trackAction } from "../logic/HistoryTracker";

function HomePage() {
  const { user } = useUser();
  const hasTrackedLoad = useRef(false);

  useEffect(() => {
    if (hasTrackedLoad.current) {
      return;
    }

    hasTrackedLoad.current = true;
    trackAction("HomePage", user, "load");
  }, [user]);

  return (
    <section className="placeholder-page" aria-label="Home Overview">
      <h2>Home Overview</h2>
      <p>This is a placeholder page for the home overview section.</p>
    </section>
  );
}

export default HomePage;
