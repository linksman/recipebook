import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IngredientForm from '../components/IngredientForm';

const noop = () => {};

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/name/i), 'Oats');
  await userEvent.selectOptions(screen.getByLabelText(/unit type/i), 'Grams');
  await userEvent.type(screen.getByLabelText(/calories/i), '389');
  await userEvent.type(screen.getByLabelText(/carbs/i), '66');
  await userEvent.type(screen.getByLabelText(/fat/i), '7');
  await userEvent.type(screen.getByLabelText(/protein/i), '17');
}

describe('IngredientForm', () => {
  it('shows error when name is empty on submit', async () => {
    render(<IngredientForm onSuccess={noop} onCancel={noop} />);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });

  it('shows error when calories is negative', async () => {
    render(<IngredientForm onSuccess={noop} onCancel={noop} />);
    await userEvent.type(screen.getByLabelText(/name/i), 'Sugar');
    await userEvent.selectOptions(screen.getByLabelText(/unit type/i), 'Grams');
    await userEvent.type(screen.getByLabelText(/calories/i), '-5');
    await userEvent.type(screen.getByLabelText(/carbs/i), '100');
    await userEvent.type(screen.getByLabelText(/fat/i), '0');
    await userEvent.type(screen.getByLabelText(/protein/i), '0');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/must be 0 or greater/i)).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<IngredientForm onSuccess={noop} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onSuccess after successful submission', async () => {
    const ingredient = {
      id: 'abc',
      name: 'Oats',
      strictUnit: 'Grams',
      caloriesPerUnit: 389,
      carbsPerUnit: 66,
      fatPerUnit: 7,
      proteinPerUnit: 17,
      isLocked: false,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ingredient,
    }));

    const onSuccess = vi.fn();
    render(<IngredientForm onSuccess={onSuccess} onCancel={noop} />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(ingredient));
    vi.unstubAllGlobals();
  });
});
