import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Closet from "./pages/Closet";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import Outfits from "./pages/Outfits";
import OutfitBuilder from "./pages/OutfitBuilder";
import AIStylist from "./pages/AIStylist";
import Wishlist from "./pages/Wishlist";
import VirtualFittingRoomPage from "./pages/VirtualFittingRoom";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel";
import Navigation from "./components/Navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AuthStatus from "./components/AuthStatus";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <AuthStatus />
        <div style={{ paddingTop: 80, paddingBottom: 60, minHeight: "100vh" }}>
          <Navigation />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/closet" element={<Closet />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/vfr" element={<VirtualFittingRoomPage />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/outfits" element={<Outfits />} />
            <Route path="/outfits/builder" element={<OutfitBuilder />} />
            <Route path="/outfits/stylist" element={<AIStylist />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:username" element={<Profile />} />
          </Routes>
        </div>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
