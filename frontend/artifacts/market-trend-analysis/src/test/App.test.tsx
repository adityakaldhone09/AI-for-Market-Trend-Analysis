import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '@/App';

describe('Market Trend Analysis routes and interactions', () => {
  beforeEach(() => window.history.replaceState({}, '', '/dashboard'));
  afterEach(() => window.history.replaceState({}, '', '/dashboard'));

  it('shows persistent navigation and the demo-mode provenance label', async () => {
    render(<App />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByTestId('status-data-mode')).toHaveTextContent('DEMO DATA');
    expect(await screen.findByTestId('chart-market-overview')).toBeInTheDocument();
  });

  it('navigates between all primary analysis routes', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /Market analysis/i }));
    expect(
      (await screen.findAllByRole('heading', { name: 'Historical analysis' })).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('link', { name: /Forecasts/i }));
    expect(
      (await screen.findAllByRole('heading', { name: 'Forecast review' })).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('link', { name: /Data explorer/i }));
    expect(
      (await screen.findAllByRole('heading', { name: 'Data explorer' })).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('link', { name: /Model evaluation/i }));
    expect(
      (await screen.findAllByRole('heading', { name: 'Model evaluation' })).length,
    ).toBeGreaterThan(0);
  });

  it('applies a market selector and bounded page navigation', async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getAllByRole('option', { name: /Nordic 40 Index/ }).length).toBeGreaterThan(0),
    );
    fireEvent.change(screen.getByTestId('select-market'), { target: { value: 'harbor-energy' } });
    expect(screen.getByTestId('select-market')).toHaveValue('harbor-energy');
    fireEvent.click(screen.getByRole('link', { name: /Data explorer/i }));
    await screen.findByTestId('table-data-preview');
    fireEvent.click(screen.getAllByTestId('button-page-next')[0]);
    expect(screen.getByTestId('row-preview-10')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('select-page-size'), { target: { value: '25' } });
    expect(screen.getByTestId('row-preview-0')).toBeInTheDocument();
  });

  it('keeps forecast estimate placeholders empty in demo and explains the backend requirement', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /Forecasts/i }));
    expect(await screen.findByTestId('forecast-disclaimer')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('button-request-forecast')).toBeEnabled());
    fireEvent.click(screen.getByTestId('button-request-forecast'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Backend mode is required'),
    );
    expect(screen.queryByTestId('chart-forecast')).not.toBeInTheDocument();
  });

  it('renders a clearly labeled example evaluation chart and allows horizon selection', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: /Model evaluation/i }));
    expect(await screen.findByTestId('chart-model-evaluation')).toBeInTheDocument();
    expect(screen.getByText('ILLUSTRATIVE EXAMPLE')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Forecasts/i }));
    fireEvent.change(screen.getByTestId('select-horizon'), { target: { value: '20' } });
    expect(screen.getByTestId('select-horizon')).toHaveValue('20');
  });
});
