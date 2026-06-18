import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';

function renderLoginPage(login: () => Promise<void>) {
  return render(
    <AuthContext.Provider value={{ user: null, loading: false, login, logout: vi.fn() }}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('LoginPage', () => {
  it('shows inline error when login rejects', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    renderLoginPage(login);
    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('disables the button while submitting', async () => {
    let resolve!: () => void;
    const login = vi.fn().mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    renderLoginPage(login);
    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
    resolve();
  });
});
