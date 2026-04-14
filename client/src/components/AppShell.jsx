import React, { useState, useEffect, useRef } from 'react';

const nbccTextbookLockup = process.env.PUBLIC_URL + '/brand/nbcctxtbook.svg';

function AppShell({ user, currentPage, onNavigate, onLogout, isLoggingOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const mobileUserRef = useRef(null);
  const desktopUserRef = useRef(null);

  const go = (id) => {
    onNavigate(id);
    setMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const toggleSiteMenu = () => {
    setMenuOpen((o) => !o);
    setUserDropdownOpen(false);
  };

  const toggleAccountMenu = () => {
    setUserDropdownOpen((o) => !o);
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const m = mobileUserRef.current;
      const d = desktopUserRef.current;
      if (m?.contains(e.target) || d?.contains(e.target)) return;
      setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials =
    ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase() || '?';

  const navLink = (id, label) => (
    <button
      type="button"
      className={`nav-link border-0 w-auto text-start ${currentPage === id ? 'active' : ''}`}
      onClick={() => go(id)}
    >
      {label}
    </button>
  );

  const dropdownItem = (id, icon, label) => (
    <button
      type="button"
      className={`user-dropdown-item${currentPage === id ? ' active' : ''}`}
      onClick={() => go(id)}
    >
      <span className="user-dropdown-icon" aria-hidden="true">{icon}</span>
      {label}
    </button>
  );

  const userDropdownMenu = (
    <>
      {dropdownItem('mylistings', '📚', 'My Listings')}
      {dropdownItem('bookmarks', '🔖', 'Bookmarks')}
      {dropdownItem('profile', '👤', 'Profile')}
      <div className="user-dropdown-divider" />
      <button
        type="button"
        className="user-dropdown-item user-dropdown-logout"
        onClick={onLogout}
        disabled={isLoggingOut}
        role="menuitem"
      >
        <span className="user-dropdown-icon" aria-hidden="true">🚪</span>
        {isLoggingOut ? (
          <>
            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
            Signing out…
          </>
        ) : (
          'Logout'
        )}
      </button>
    </>
  );

  const renderAccountTrigger = () => (
    <button
      type="button"
      className="user-dropdown-trigger"
      onClick={toggleAccountMenu}
      aria-expanded={userDropdownOpen}
      aria-haspopup="true"
      aria-label="Account menu"
    >
      <span className="user-avatar" aria-hidden="true">{initials}</span>
      <span className="user-name d-none d-md-inline">
        {user?.first_name} {user?.last_name}
      </span>
      <span className="user-dropdown-caret" aria-hidden="true">▾</span>
    </button>
  );

  return (
    <header className="app-shell sticky-top">
      <nav className="navbar navbar-expand-lg navbar-light" aria-label="Main navigation">
        <div className="container-fluid px-3 px-lg-4">
          <button
            type="button"
            className="app-shell-brand navbar-brand me-lg-3 border-0 bg-transparent p-0"
            onClick={() => go('home')}
            aria-label="Go to home page"
          >
            <img
              className="app-shell-logo"
              src={nbccTextbookLockup}
              alt="NBCC Textbook Resale"
            />
          </button>

          {/* Mobile: hamburger + account (desktop account lives inside collapse) */}
          <div className="d-flex d-lg-none align-items-center gap-2 ms-auto flex-shrink-0 app-shell-triggers">
            <button
              className="navbar-toggler"
              type="button"
              onClick={toggleSiteMenu}
              aria-expanded={menuOpen}
              aria-controls="nbccMainNav"
              aria-label="Browse and site menu"
            >
              <span className="visually-hidden">Browse and site menu</span>
            </button>
            <div className="user-dropdown-wrapper" ref={mobileUserRef}>
              {renderAccountTrigger()}
              {userDropdownOpen && (
                <div className="user-dropdown-menu" role="menu">
                  {userDropdownMenu}
                </div>
              )}
            </div>
          </div>

          <div
            className={`collapse navbar-collapse mt-2 mt-lg-0 ${menuOpen ? 'show' : ''}`}
            id="nbccMainNav"
          >
            <ul className="navbar-nav me-auto align-items-lg-center gap-lg-1 flex-wrap">
              <li className="nav-item">{navLink('home', 'Browse')}</li>
              {user?.role === 'admin' && (
                <li className="nav-item">{navLink('admin', 'Admin')}</li>
              )}
              <li className="nav-item ms-lg-1">
                <button
                  type="button"
                  className="btn btn-nbcc-sell btn-sm"
                  onClick={() => go('create')}
                >
                  + Sell a book
                </button>
              </li>
            </ul>

            <div className="user-dropdown-wrapper d-none d-lg-block" ref={desktopUserRef}>
              {renderAccountTrigger()}
              {userDropdownOpen && (
                <div className="user-dropdown-menu" role="menu">
                  {userDropdownMenu}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default AppShell;
