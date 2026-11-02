import homeIcon from "../../assets/home-green.svg";
import membersIcon from "../../assets/members-green.svg";
import GuestLayout from "../../components/auth/GuestLayout";
import { EmptyState } from "../../components/states";

/*
 * Temporary target for the Welcome screen choices.
 * Replaced by the real screens in Group 2: HK-63 Create / join household view.
 */
function HouseholdStartPlaceholder({ mode }) {
  const isJoin = mode === "join";

  return (
    <GuestLayout backTo="/welcome">
      <section className="hk-auth-card">
        <EmptyState
          iconSrc={isJoin ? membersIcon : homeIcon}
          title={isJoin ? "Joining a household is coming soon" : "Creating a household is coming soon"}
          text="This screen is being built right now. Check back in a little while."
        />
      </section>
    </GuestLayout>
  );
}

export default HouseholdStartPlaceholder;
