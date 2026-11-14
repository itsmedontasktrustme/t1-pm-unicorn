import { Link } from "react-router-dom";
import useResident from "../../logic/useResident";
import { initials } from "../../logic/format";

/*
 * HK-264: own avatar in the header (phone) / at the bottom of the sidebar (desktop).
 * Opens the own profile, where the resident can also sign out.
 */
function ProfileLink() {
  const { user } = useResident();

  if (!user) {
    return null;
  }

  const name = user.fullName || user.firstName || "You";

  return (
    <Link to="/profile" className="profile-link" aria-label="Your profile">
      <span className="profile-link__avatar" aria-hidden="true">
        {user.imageUrl ? <img src={user.imageUrl} alt="" /> : initials(name)}
      </span>
      <span className="profile-link__text" aria-hidden="true">
        <b>{name}</b>
        <small>Your profile</small>
      </span>
    </Link>
  );
}

export default ProfileLink;
