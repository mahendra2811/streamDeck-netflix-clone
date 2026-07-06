import { NavLink } from 'react-router-dom';
import './NavBar.css';

export function NavBar({ email }) {
  const initial = email?.[0]?.toUpperCase() ?? '?';

  return (
    <header className="navbar">
      <span className="navbar__logo">StreamDeck</span>
      <nav className="navbar__links">
        <NavLink to="/" end className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `navbar__link ${isActive ? 'navbar__link--active' : ''}`}>
          Search
        </NavLink>
      </nav>
      <NavLink to="/profile" className="navbar__profile" title={email}>
        {initial}
      </NavLink>
    </header>
  );
}
