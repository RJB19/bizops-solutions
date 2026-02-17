import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './utils/AuthContext';
import Navbar from './components/Navbar';
import AppContextResetter from './utils/AppContextResetter'; // Import the new component

import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory'; // Import the new Inventory component
import Login from './pages/Login';
import SignUp from './pages/SignUp';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div>Loading authentication...</div>
      </div>
    );
  }

  // A component to protect routes that require a logged-in user.
  const ProtectedRoute = ({ children }) => {
    if (!user) {
      // If no user, redirect to the login page.
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  // A component to protect routes that require an admin user
  const AdminRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    // If the user is not an admin, redirect them to a default page. 
    if (user.role !== 'admin') {
      return <Navigate to="/products" replace />;
    }
    return children;
  };

  return (
    <>
      {/* Only show the Navbar if a user is logged in */}
      {user && <Navbar />}
      {/* AppContextResetter needs to be rendered within the context providers */}
      <AppContextResetter />
      <Routes>
        {/* If a user is logged in, trying to access /login will redirect them to the homepage */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignUp />} />

        {/* The root path redirects based on role */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {user?.role === 'admin' ? (
                <Navigate to="/dashboard" />
              ) : (
                <Navigate to="/products" />
              )}
            </ProtectedRoute>
          }
        />

        {/* Admin-only route */}
        <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />

        {/* Routes for all authenticated users */}
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        
        {/* A fallback route to redirect any unknown paths to the homepage */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
