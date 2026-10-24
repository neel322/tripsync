import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PageLoader } from './components/ui/Loader';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/trips/Dashboard';
import CreateTrip from './pages/trips/CreateTrip';
import JoinTrip from './pages/trips/JoinTrip';
import TripOverview from './pages/trips/TripOverview';
import Itinerary from './pages/trips/Itinerary';
import Polls from './pages/trips/Polls';
import Expenses from './pages/trips/Expenses';
import Budget from './pages/trips/Budget';
import Members from './pages/trips/Members';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />

      {/* Protected routes */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trips/create" element={<CreateTrip />} />
        <Route path="/trips/join" element={<JoinTrip />} />

        {/* Trip workspace */}
        <Route path="/trips/:id" element={<TripOverview />}>
          <Route path="itinerary" element={<Itinerary />} />
          <Route path="polls" element={<Polls />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="budget" element={<Budget />} />
          <Route path="members" element={<Members />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
