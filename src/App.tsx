import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { User } from './types';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Booking />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          user ? <Dashboard user={user} /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export default App;