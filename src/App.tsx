import { type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from '@/components/Layout';
import { DbProvider, useDb } from '@/db/DbProvider';
import { BottlePage } from '@/pages/BottlePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DiapersPage } from '@/pages/DiapersPage';
import { FeedingPage } from '@/pages/FeedingPage';
import { GrowthPage } from '@/pages/GrowthPage';
import { NotesPage } from '@/pages/NotesPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PumpingPage } from '@/pages/PumpingPage';
import { SleepPage } from '@/pages/SleepPage';
import { SolidsPage } from '@/pages/SolidsPage';
import { SupplementsPage } from '@/pages/SupplementsPage';
import { TemperaturePage } from '@/pages/TemperaturePage';
import { ToolsPage } from '@/pages/ToolsPage';

function Ready({ children }: { children: ReactNode }) {
  const { ready } = useDb();
  if (!ready) return <div className="screen">Chargement…</div>;
  return children;
}

export default function App() {
  return (
    <DbProvider>
      <HashRouter>
        <Ready>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/feeding" element={<FeedingPage />} />
              <Route path="/bottle" element={<BottlePage />} />
              <Route path="/solids" element={<SolidsPage />} />
              <Route path="/supplements" element={<SupplementsPage />} />
              <Route path="/diapers" element={<DiapersPage />} />
              <Route path="/pumping" element={<PumpingPage />} />
              <Route path="/growth" element={<GrowthPage />} />
              <Route path="/sleep" element={<SleepPage />} />
              <Route path="/temperature" element={<TemperaturePage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Ready>
      </HashRouter>
    </DbProvider>
  );
}
