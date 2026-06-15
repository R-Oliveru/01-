import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import LandingPage from './components/pages/LandingPage';
import Phase1Page from './components/pages/Phase1Page';
import Phase2Page from './components/pages/Phase2Page';
import Phase3Page from './components/pages/Phase3Page';
import AuthPage from './components/pages/AuthPage';
import { useApp } from './context/AppContext';

function AppContent() {
  const { state } = useApp();

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🎯</div>
          <div className="text-gray-500 text-sm">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 pt-20 pb-16">
        {state.currentPage === 'landing'  && <LandingPage />}
        {state.currentPage === 'phase1'   && <Phase1Page />}
        {state.currentPage === 'phase2'   && <Phase2Page />}
        {state.currentPage === 'phase3'   && <Phase3Page />}
      </main>
      <Footer />
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🎯</div>
          <div className="text-gray-500 text-sm">初始化中...</div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
