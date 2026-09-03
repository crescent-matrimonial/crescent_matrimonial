import { useState } from 'react';
import { Moon, Settings, LogOut, Users, Heart, MessageCircle, History } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DataProvider, useData } from '@/lib/data';
import { LoginScreen, AccessDeniedScreen } from '@/components/AuthScreens';
import { SettingsModal } from '@/components/SettingsModal';
import { SyncButton } from '@/components/SyncButton';
import { CandidatesDirectory } from '@/components/tabs/CandidatesDirectory';
import { MatchmakingEngine } from '@/components/tabs/MatchmakingEngine';
import { ActivePairings } from '@/components/tabs/ActivePairings';
import { HistoryLogs } from '@/components/tabs/HistoryLogs';

type TabKey = 'candidates' | 'engine' | 'active' | 'history';

interface EngineInitial {
  personId: string;
  gender: 'male' | 'female';
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'candidates', label: 'Candidates', icon: <Users className="h-4 w-4" /> },
  { key: 'engine', label: 'Matchmaking', icon: <Heart className="h-4 w-4" /> },
  { key: 'active', label: 'Active Pairs', icon: <MessageCircle className="h-4 w-4" /> },
  { key: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
];

function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { signOut, authRequired } = useAuth();
  const { useMock, people, matches } = useData();
  const activePending = matches.filter((m) => m.outcome === 'pending').length;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-700/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 shadow-lg shadow-sky-900/40">
            <Moon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 sm:text-base">
              Crescent Matrimonial
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">Matchmaking Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {useMock && (
            <span className="hidden rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-500/30 sm:inline">
              Demo Mode
            </span>
          )}
          <span className="hidden text-xs text-slate-500 md:inline">
            {people.filter((p) => !p.is_deleted).length} candidates · {activePending} active
          </span>
          <SyncButton />
          <button
            onClick={onOpenSettings}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          {authRequired && (
            <button
              onClick={signOut}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function TabNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const { matches } = useData();
  const pendingCount = matches.filter((m) => m.outcome === 'pending').length;

  return (
    <nav className="sticky top-[57px] z-20 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 sm:px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition ${
              active === t.key
                ? 'text-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.icon}
            {t.label}
            {t.key === 'active' && pendingCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-300">
                {pendingCount}
              </span>
            )}
            {active === t.key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-sky-400" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

function Dashboard() {
  const [tab, setTab] = useState<TabKey>('candidates');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [engineInitial, setEngineInitial] = useState<EngineInitial | null>(null);

  const goToEngineFor = (personId: string, gender: 'male' | 'female') => {
    setEngineInitial({ personId, gender });
    setTab('engine');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <TabNav active={tab} onChange={setTab} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {tab === 'candidates' && <CandidatesDirectory onGoToEngine={goToEngineFor} />}
        {tab === 'engine' && <MatchmakingEngine initial={engineInitial} onClearInitial={() => setEngineInitial(null)} />}
        {tab === 'active' && <ActivePairings />}
        {tab === 'history' && <HistoryLogs />}
      </main>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function Gate() {
  const { state, authRequired } = useAuth();

  // If auth is not required, always show dashboard
  if (!authRequired) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Dashboard />
      </div>
    );
  }

  // If auth is required, enforce authentication
  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500" />
      </div>
    );
  }
  if (state.status === 'needs_key' || state.status === 'unauthenticated') {
    return <LoginScreen />;
  }
  if (state.status === 'denied') {
    return <AccessDeniedScreen />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Gate />
      </DataProvider>
    </AuthProvider>
  );
}
