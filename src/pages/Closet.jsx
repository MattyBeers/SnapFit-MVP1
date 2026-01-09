import { useAuth } from "../context/AuthContext";
import ClosetScreen from "../components/ClosetScreen";

export default function Closet() {
  const { user, userProfile } = useAuth();

  if (!user) {
    return <div className="sf-card">Please log in to view your closet.</div>;
  }

  return <ClosetScreen userId={user.id} userProfile={userProfile} />;
}
