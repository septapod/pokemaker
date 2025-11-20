/**
 * App.tsx - Main Application Component
 *
 * This is the root component of the PokéMaker app.
 * It sets up routing using React Router, which allows navigation between different pages.
 * It also wraps the app with AuthProvider to manage login state.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import CreatePokemon from './pages/CreatePokemon';
import MyPokemon from './pages/MyPokemon';
import CommunityGallery from './pages/CommunityGallery';
import PokemonDetail from './pages/PokemonDetail';
import EditPokemon from './pages/EditPokemon';

function App() {
  return (
    // AuthProvider manages login state for the entire app
    <AuthProvider>
      {/* Router enables navigation between pages without refreshing the browser */}
      <Router>
        {/* Layout wraps all pages and provides the header/navigation */}
        <Layout>
          {/* Routes define which component shows for each URL path */}
          <Routes>
            {/* Login page - accessible without authentication */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes - require authentication */}
            {/* Home page - path: / */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            {/* Create a new Pokémon - path: /create */}
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <CreatePokemon />
                </ProtectedRoute>
              }
            />

            {/* View my Pokémon - path: /my-pokemon */}
            <Route
              path="/my-pokemon"
              element={
                <ProtectedRoute>
                  <MyPokemon />
                </ProtectedRoute>
              }
            />

            {/* View all Pokémon from everyone - path: /gallery */}
            <Route
              path="/gallery"
              element={
                <ProtectedRoute>
                  <CommunityGallery />
                </ProtectedRoute>
              }
            />

            {/* View details of a specific Pokémon - path: /pokemon/:id */}
            <Route
              path="/pokemon/:id"
              element={
                <ProtectedRoute>
                  <PokemonDetail />
                </ProtectedRoute>
              }
            />

            {/* Edit an existing Pokémon - path: /pokemon/:id/edit */}
            <Route
              path="/pokemon/:id/edit"
              element={
                <ProtectedRoute>
                  <EditPokemon />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
