import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RecipeListPage() {
  const { logout } = useAuth();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <Link to="/ingredients">Ingredients</Link>
        <button onClick={logout} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
          Logout
        </button>
      </nav>
      <h1>Recipes</h1>
    </div>
  );
}
