import { useEffect, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from '@/components/Layout';
import { DbProvider, useDb } from '@/db/DbProvider';
import { BabyPage } from '@/pages/BabyPage';
import { BottlePage } from '@/pages/BottlePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DiapersPage } from '@/pages/DiapersPage';
import { FeedingPage } from '@/pages/FeedingPage';
import { GrowthPage } from '@/pages/GrowthPage';
import { CguPage } from '@/pages/legal/CguPage';
import { ConfidentialitePage } from '@/pages/legal/ConfidentialitePage';
import { MedicalPage } from '@/pages/legal/MedicalPage';
import { MentionsLegalesPage } from '@/pages/legal/MentionsLegalesPage';
import { NotesPage } from '@/pages/NotesPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PumpingPage } from '@/pages/PumpingPage';
import { SleepPage } from '@/pages/SleepPage';
import { SolidsPage } from '@/pages/SolidsPage';
import { SupplementsPage } from '@/pages/SupplementsPage';
import { TemperaturePage } from '@/pages/TemperaturePage';
import { ToolsPage } from '@/pages/ToolsPage';
import { ManualPage } from '@/pages/ManualPage';

function hideBootSplash() {
  const el = document.getElementById('boot-splash');
  if (!el) return;
  const remove = () => el.remove();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    remove();
    return;
  }
  el.classList.add('boot-splash-out');
  window.setTimeout(remove, 300);
}

function Ready({ children }: { children: ReactNode }) {
  const { ready } = useDb();
  useEffect(() => {
    if (ready) hideBootSplash();
  }, [ready]);
  if (!ready) return null;
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
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/baby" element={<BabyPage />} />
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
              <Route path="/manual" element={<ManualPage />} />
              <Route path="/legal/mentions" element={<MentionsLegalesPage />} />
              <Route path="/legal/confidentialite" element={<ConfidentialitePage />} />
              <Route path="/legal/cgu" element={<CguPage />} />
              <Route path="/legal/medical" element={<MedicalPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Ready>
      </HashRouter>
    </DbProvider>
  );
}
