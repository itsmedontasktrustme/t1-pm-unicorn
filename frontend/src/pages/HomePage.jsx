import { useUser } from "@clerk/react";
import usePageLoadTracking from "../logic/usePageLoadTracking";

function HomePage() {
  const { user } = useUser();

  usePageLoadTracking("HomePage", user);

  return (
    <section className="placeholder-page" aria-label="Home Overview">
      <h2>Home Overview</h2>
      <p>This is a placeholder page for the home overview section.</p>
    </section>
  );
}

export default HomePage;
