import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/authContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { PopupProvider } from './context/PopupContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Admin from './pages/Admin';
import TrainDetails from './pages/TrainDetails';
import TripDetails from './pages/TripDetails';
import EditTrain from './pages/admin-views/EditTrain';
import EditTrip from './pages/admin-views/EditTrip';
import EditStop from './pages/admin-views/EditStop';
import Profile from './pages/Profile';
import { Clock } from 'lucide-react';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <Clock className="animate-spin" size={32} color="var(--accent-primary)" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = 
    user.isSuperAdmin === true || 
    user.IsSuperAdmin === true || 
    !!user.roleName || 
    !!user.RoleName ||
    user.role === 1 || 
    user.role === 'Admin' || 
    user.role?.toString().toLowerCase() === 'admin';

  if (adminOnly && !isAdmin) {
    // If not admin, logging them out or just rejecting
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <PopupProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Authentication Routes */}
                <Route path="/login" element={<Login />} />

                {/* Admin Dedicated Route (Root for admin panel) */}
                <Route 
                  path="/" 
                  element = {
                    <ProtectedRoute adminOnly>
                      <Admin />
                    </ProtectedRoute>
                  } 
                />

                {/* Details & Edit Routes */}
                <Route 
                  path="/train/:id" 
                  element = {
                    <ProtectedRoute adminOnly>
                      <TrainDetails />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/trip/:id" 
                  element = {
                    <ProtectedRoute adminOnly>
                      <TripDetails />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/edit-train/:id" 
                  element = {
                    <ProtectedRoute adminOnly>
                      <EditTrain />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/edit-trip/:id" 
                  element = {
                    <ProtectedRoute adminOnly>
                      <EditTrip />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/edit-stop/:id" 
                  element = {
                    <ProtectedRoute adminOnly>
                      <EditStop />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element = {
                    <ProtectedRoute adminOnly>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />

                {/* Fallback to root */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </PopupProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
