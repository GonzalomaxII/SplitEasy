import { Link, useNavigate } from 'react-router-dom';
import { Wallet, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <Link to="/dashboard" className="navbar-brand">
        <span className="brand-icon">
          <Wallet size={22} />
        </span>
        <span>SplitEasy</span>
      </Link>

      {user && (
        <div className="navbar-user">
          <div className="user-pill">
            <User size={16} />
            <span>{user.name}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-logout" title="Cerrar sesión">
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      )}
    </header>
  );
}