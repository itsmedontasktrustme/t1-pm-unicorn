import { useUser } from "@clerk/react";
import usePageLoadTracking from "../logic/usePageLoadTracking";

function PeoplePage() {
  const { user } = useUser();

  usePageLoadTracking("PeoplePage", user);

  return (
    <section className="placeholder-page" aria-label="People">
      <h2>People</h2>
      <p>This is a placeholder page for household members.</p>
    </section>
  );
}

export default PeoplePage;
