import { Link, Outlet, useNavigate } from 'react-router-dom';
import { currentUser, forceLogout, isLoggedIn } from './lib/api';

export default function App() {
  const navigate = useNavigate();
  const user = currentUser();

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand" style={{ color: 'inherit' }}>
          Light Table <span>· AdvVQA versions</span>
        </Link>
        <div className="spacer" />
        {isLoggedIn() ? (
          <>
            <span className="who">{user?.username ?? user?.email ?? ''}</span>
            <button className="btn" onClick={() => forceLogout()}>
              Sign out
            </button>
          </>
        ) : (
          <button className="btn" onClick={() => navigate('/login')}>
            Sign in
          </button>
        )}
      </header>
      <Outlet />
    </>
  );
}
