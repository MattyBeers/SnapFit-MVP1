import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useState } from "react";

export default function Header() {
  const { user } = useAuth() || {};
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <header className="site-header">
      <button
        className="header-hamburger"
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((s) => !s)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="site-header__left">
        <Link to="/" className="site-brand-link" aria-label="SnapFit home">
          <img src="/SnapFit-.png" alt="SnapFit" className="site-logo" />
          <span className="site-brand">SnapFit</span>
        </Link>
      </div>

      <nav className="site-nav" aria-label="Main navigation">
        <Link to="/" className="site-nav__link">Home</Link>
        <Link to="/closet" className="site-nav__link">Closet</Link>
        <Link to="/wishlist" className="site-nav__link wishlist-link">
          ✨ Wishlist
        </Link>
        <Link to="/vfr" className="site-nav__link site-nav__link--vfr">
          🪞 VFR
        </Link>
        <Link to="/outfits" className="site-nav__link">Outfits</Link>
        <Link to="/explore" className="site-nav__link">Explore</Link>
      </nav>

      {/* Mobile/docked nav drawer (visible when header-hamburger toggled) */}
      {menuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-label="Mobile navigation">
          <div className="mobile-nav-inner">
            <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/closet" onClick={() => setMenuOpen(false)}>Closet</Link>
            <Link to="/wishlist" onClick={() => setMenuOpen(false)}>Wishlist</Link>
            <Link to="/vfr" onClick={() => setMenuOpen(false)}>VFR</Link>
            <Link to="/outfits" onClick={() => setMenuOpen(false)}>Outfits</Link>
            <Link to="/explore" onClick={() => setMenuOpen(false)}>Explore</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
          </div>
          <button className="mobile-nav-close" aria-label="Close" onClick={() => setMenuOpen(false)}>Close</button>
        </div>
      )}

      <div className="site-header__actions">
        <div className="site-actions-vertical">
          <div className="site-actions-stack">
            {user ? (
              <>
                <div className="site-user">{user.email}</div>
                <button className="site-btn site-btn--primary" onClick={handleLogout}>Logout</button>
                <Link to="/settings" className="site-settings" aria-label="Settings">
                  <svg className="site-settings__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                    <path d="M19.14 12.936c.036-.303.057-.61.057-.936s-.02-.633-.057-.936l2.037-1.58a.5.5 0 00.12-.637l-1.927-3.337a.5.5 0 00-.607-.22l-2.4.96a7.012 7.012 0 00-1.615-.936l-.36-2.54A.5.5 0 0013.8 2h-3.6a.5.5 0 00-.493.422l-.36 2.54a7.08 7.08 0 00-1.615.936l-2.4-.96a.5.5 0 00-.607.22L2.68 8.484a.5.5 0 00.12.637l2.037 1.58c-.037.303-.057.61-.057.936s.02.633.057.936L2.8 15.09a.5.5 0 00-.12.637l1.927 3.337c.15.26.46.36.737.26l2.4-.96c.503.392 1.045.718 1.615.936l.36 2.54a.5.5 0 00.493.422h3.6a.5.5 0 00.493-.422l.36-2.54c.57-.218 1.112-.544 1.615-.936l2.4.96c.277.11.587 0 .737-.26l1.927-3.337a.5.5 0 00-.12-.637l-2.037-1.58zM12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7z" />
                  </svg>
                  <span className="site-settings__label">Settings</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="site-btn site-btn--primary">Login</Link>
                <Link to="/settings" className="site-settings" aria-label="Settings">
                  <svg className="site-settings__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                    <path d="M19.14 12.936c.036-.303.057-.61.057-.936s-.02-.633-.057-.936l2.037-1.58a.5.5 0 00.12-.637l-1.927-3.337a.5.5 0 00-.607-.22l-2.4.96a7.012 7.012 0 00-1.615-.936l-.36-2.54A.5.5 0 0013.8 2h-3.6a.5.5 0 00-.493.422l-.36 2.54a7.08 7.08 0 00-1.615.936l-2.4-.96a.5.5 0 00-.607.22L2.68 8.484a.5.5 0 00.12.637l2.037 1.58c-.037.303-.057.61-.057.936s.02.633.057.936L2.8 15.09a.5.5 0 00-.12.637l1.927 3.337c.15.26.46.36.737.26l2.4-.96c.503.392 1.045.718 1.615.936l.36 2.54a.5.5 0 00.493.422h3.6a.5.5 0 00.493-.422l.36-2.54c.57-.218 1.112-.544 1.615-.936l2.4.96c.277.11.587 0 .737-.26l1.927-3.337a.5.5 0 00-.12-.637l-2.037-1.58zM12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7z" />
                  </svg>
                  <span className="site-settings__label">Settings</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
