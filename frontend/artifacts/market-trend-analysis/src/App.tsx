import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppShell } from '@/components/AppShell';
import { WorkspaceProvider } from '@/features/market/WorkspaceContext';
import NotFound from '@/pages/not-found';

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const MarketAnalysisPage = lazy(() =>
  import('@/pages/MarketAnalysisPage').then((module) => ({ default: module.MarketAnalysisPage })),
);
const ForecastPage = lazy(() =>
  import('@/pages/ForecastPage').then((module) => ({ default: module.ForecastPage })),
);
const DataExplorerPage = lazy(() =>
  import('@/pages/DataExplorerPage').then((module) => ({ default: module.DataExplorerPage })),
);
const ModelEvaluationPage = lazy(() =>
  import('@/pages/ModelEvaluationPage').then((module) => ({ default: module.ModelEvaluationPage })),
);

function RouteLoading() {
  return (
    <div
      className="surface grid min-h-[320px] place-items-center p-8"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md">
        <div className="eyebrow">Research workspace</div>
        <div className="mt-4 h-3 w-36 animate-pulse rounded bg-[#e9e4da]" />
        <div className="mt-3 h-36 animate-pulse rounded-xl bg-[#f0ede6]" />
        <div className="mt-3 h-10 animate-pulse rounded-lg bg-[#f0ede6]" />
      </div>
    </div>
  );
}

function LoadedPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>;
}

function RoutedBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <WorkspaceProvider>
          <RoutedBoundary>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <LoadedPage>
                      <DashboardPage />
                    </LoadedPage>
                  }
                />
                <Route
                  path="/market-analysis"
                  element={
                    <LoadedPage>
                      <MarketAnalysisPage />
                    </LoadedPage>
                  }
                />
                <Route
                  path="/forecast"
                  element={
                    <LoadedPage>
                      <ForecastPage />
                    </LoadedPage>
                  }
                />
                <Route
                  path="/data-explorer"
                  element={
                    <LoadedPage>
                      <DataExplorerPage />
                    </LoadedPage>
                  }
                />
                <Route
                  path="/model-evaluation"
                  element={
                    <LoadedPage>
                      <ModelEvaluationPage />
                    </LoadedPage>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </RoutedBoundary>
        </WorkspaceProvider>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
