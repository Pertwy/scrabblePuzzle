import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Scrabble Best Pick header', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /scrabble best pick/i });
  expect(heading).toBeInTheDocument();
});
