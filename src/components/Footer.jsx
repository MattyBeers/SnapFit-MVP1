import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Footer() {
  const { user } = useAuth() || {};

  const [expanded, setExpanded] = useState(false);

  // Expand by default on larger viewports so desktop users see full footer
  useEffect(() => {
    try {
      if (window.innerWidth >= 992) setExpanded(true);
    } catch (e) {
      // ignore (server-side or test env)
    }
  }, []);

  const email = user?.email || "";

  const handleSubscribe = (e) => {
    e.preventDefault();
    const form = e.target;
    const val = form.elements?.email?.value || "";
    console.log("Subscribe requested:", val);
    // TODO: wire this to an API / Supabase function later
    form.reset();
  };

  return (
    <footer className={`site-footer ${expanded ? "site-footer--expanded" : "site-footer--collapsed"}`}>
      <div className="site-footer__container">
        {/* Collapsed bar: small, low-contrast links and an expand button */}
        <div className="site-footer__bar">
          <ul className="site-footer__mini list-unstyled">
            <li><Link to="/terms">Terms</Link></li>
            <li><Link to="/privacy">Privacy</Link></li>
            <li><Link to="/status">Status</Link></li>
          </ul>
          <button
            aria-expanded={expanded}
            aria-controls="site-footer-full"
            className="sf-btn sf-btn-ghost site-footer__toggle"
            onClick={() => setExpanded((s) => !s)}
          >
            {expanded ? "Close" : "More"}
          </button>
        </div>

        <div id="site-footer-full" className={`site-footer__content ${expanded ? "is-visible" : "is-hidden"}`}>
        <div className="footer-row">
          <div className="footer-column">
            <h4 className="footer-head">My Account</h4>
            <ul className="footer-list">
              <li><Link to="/profile">Profile</Link></li>
              <li><Link to="/closet">My Closet</Link></li>
              <li><Link to="/outfits">My Outfits</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-head">Help</h4>
            <ul className="footer-list">
              <li><a href="#">FAQ</a></li>
              <li><a href="#">Getting Started</a></li>
              <li><a href="#">Support</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-head">Legal</h4>
            <ul className="footer-list">
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-head">About Us</h4>
            <ul className="footer-list">
              <li><a href="#">Our Story</a></li>
              <li><a href="#">Careers</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-head">Contact Us</h4>
            <ul className="footer-list">
              <li><a href="mailto:hello@snapfit.app">Email</a></li>
              <li><a href="#">Press</a></li>
            </ul>
          </div>

          <div className="footer-column footer-subscribe">
            <h4 className="footer-head">Email Sign Up</h4>
            <form onSubmit={handleSubscribe} className="footer-subscribe__form">
              <input name="email" type="email" className="footer-input" placeholder="you@example.com" aria-label="email" defaultValue={email} />
              <button className="sf-btn sf-btn-primary footer-submit">Sign up</button>
            </form>
          </div>
        </div>
        </div>

        <div className="footer-bottom">
          <div>© {new Date().getFullYear()} SnapFit. All rights reserved.</div>
          <div className="footer-bottom-right">Built with ♥ — <Link to="/about">About SnapFit</Link></div>
        </div>
      </div>
    </footer>
  );
}
