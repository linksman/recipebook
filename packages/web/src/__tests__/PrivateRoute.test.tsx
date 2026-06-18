import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import PrivateRoute from '../components/PrivateRoute';

function renderWithAuth(
  user: { id: string; username: string } | null,
  loading = false
) {
  return render(
    <AuthContext.Provider value={{ user, loading, login: vi.fn(), logout: vi.fn() }}>
      <MemoryRouter initialEntries={['/protected']}>
        <PrivateRoute>
          <div>Protected Content</div>
        </PrivateRoute>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('PrivateRoute', () => {
  it('redirects to /login when user is null', () => {
    renderWithAuth(null, false);
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    renderWithAuth({ id: '1', username: 'admin' }, false);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders nothing while loading', () => {
    const { container } = renderWithAuth(null, true);
    expect(container).toBeEmptyDOMElement();
  });
});
