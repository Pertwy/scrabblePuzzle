import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('renders Scrabble Best Pick header', async () => {
  render(<App />);
  await waitFor(() => {
    expect(
      screen.getByRole('heading', { name: /scrabble best pick/i })
    ).toBeInTheDocument();
  });
});
