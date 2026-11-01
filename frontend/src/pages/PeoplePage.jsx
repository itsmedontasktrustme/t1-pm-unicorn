import { useEffect } from "react";
import { useUser } from "@clerk/react";
import { trackAction } from "../logic/HistoryTracker";

function PeoplePage() {
  const { user } = useUser();

  useEffect(() => {
    trackAction("PeoplePage", user, "load");
  }, [user]);

  return (
    <section className="placeholder-page" aria-label="People">
      <h2>People</h2>
      <p>This is a placeholder page for household members.</p>
    </section>
  );
}

export default PeoplePage;
