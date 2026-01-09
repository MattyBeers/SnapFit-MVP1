import { useNavigate, useLocation } from "react-router-dom";

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: "Home", path: "/", icon: "🏠" },
    { label: "Closet", path: "/closet", icon: "👔" },
    { label: "VFR", path: "/vfr", icon: "🪞", featured: true, gradient: true },
    { label: "Wishlist", path: "/wishlist", icon: "✨" },
    { label: "Outfits", path: "/outfits", icon: "👗" },
    { label: "Explore", path: "/explore", icon: "🔍" },
    { label: "Profile", path: "/profile", icon: "👤" },
  ];

  return (
    <div className="sf-bottom-nav">
      <div className="sf-bottom-nav-inner">
        {tabs.map((tab) => (
          <div
            key={tab.path}
            className={
              "sf-nav-item " +
              (location.pathname === tab.path ? "sf-nav-item--active" : "") +
              (tab.featured ? " sf-nav-item--featured" : "") +
              (tab.gradient ? " sf-nav-item--gradient" : "")
            }
            onClick={() => navigate(tab.path)}
            role="button"
            tabIndex={0}
            aria-label={tab.label}
            aria-current={location.pathname === tab.path ? "page" : undefined}
          >
            {tab.icon && <span role="img" aria-hidden="true">{tab.icon}</span>}
            <div>{tab.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
