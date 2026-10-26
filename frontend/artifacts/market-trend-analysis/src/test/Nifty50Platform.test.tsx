import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '@/App';

describe('NIFTY 50 Platform Modules', () => {
  beforeEach(() => window.history.replaceState({}, '', '/dashboard'));
  afterEach(() => window.history.replaceState({}, '', '/dashboard'));

  it('renders technical analysis page with indicators and regime', async () => {
    window.history.replaceState({}, '', '/technical-analysis');
    render(<App />);
    expect(await screen.findByText(/Price Action & Moving Average Framework/i)).toBeInTheDocument();
    expect(screen.getByText(/Pivot Point & Structure Levels/i)).toBeInTheDocument();
  });

  it('renders market breadth and sector performance page', async () => {
    window.history.replaceState({}, '', '/market-breadth');
    render(<App />);
    expect(await screen.findByText(/Official Sector Indices vs NIFTY 50/i)).toBeInTheDocument();
    expect(screen.getAllByText(/India VIX Volatility/i).length).toBeGreaterThan(0);
  });

  it('renders explainable research signals page with SEBI notice', async () => {
    window.history.replaceState({}, '', '/research-signals');
    render(<App />);
    expect(await screen.findByText(/Primary Quantitative Signal/i)).toBeInTheDocument();
    expect(screen.getByText(/SEBI Regulatory Boundaries & Compliance Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/Factor Rationale & Evidence Breakdown/i)).toBeInTheDocument();
  });

  it('renders strategy backtesting runner and trade log', async () => {
    window.history.replaceState({}, '', '/strategy-backtest');
    render(<App />);
    expect(await screen.findByText(/Cumulative Equity vs Buy & Hold Benchmark/i)).toBeInTheDocument();
    expect(screen.getByText(/Strategy Parameters & Model Assumptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Chronological Trade Log/i)).toBeInTheDocument();
  });

  it('renders paper trading simulator with order ticket and virtual capital', async () => {
    window.history.replaceState({}, '', '/paper-trading');
    render(<App />);
    expect(await screen.findByText(/Simulated Order Ticket/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Portfolio Equity/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulated Open Positions/i)).toBeInTheDocument();
  });
});
