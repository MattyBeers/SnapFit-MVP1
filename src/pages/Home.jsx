import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import HomeScreen from "../components/HomeScreen";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const username =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "snapfit_user";

  const handleWelcomeContinue = () => {
    if (!user) {
      navigate("/login");
    }
    // If logged in, just stay on home (modal closes)
  };

  return (
    <HomeScreen
      username={username}
      onContinue={() => navigate("/closet")}
      onWelcomeContinue={handleWelcomeContinue}
    />
  );
}
