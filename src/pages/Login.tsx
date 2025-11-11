/**
 * Login Page
 *
 * Simple login form where users enter their username and password.
 * Currently set up for a single user to keep their Pokémon private.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Try to log in
    const success = login(username, password);

    if (success) {
      // Redirect to home page on successful login
      navigate('/');
    } else {
      // Show error message
      setError('Incorrect username or password. Please try again!');
      setPassword(''); // Clear password field
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">⚡</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              PokéMaker
            </h1>
            <p className="text-gray-600">
              Log in to create your Pokémon!
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block font-bold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 text-red-700 text-center flex items-center justify-center gap-2">
                <i className="ri-alert-line"></i>
                <span className="font-bold">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full btn-pokemon text-xl py-4 flex items-center justify-center gap-2"
            >
              <i className="ri-rocket-line"></i> Log In
            </button>
          </form>

          {/* Helpful Message */}
          <div className="mt-8 text-center">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800 flex items-center justify-center gap-2">
                <i className="ri-lightbulb-line"></i> <strong>First time?</strong> Use your username and password!
              </p>
            </div>
          </div>
        </div>

        {/* Footer Message */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          Your Pokémon creations are protected and private 🔒
        </p>
      </div>
    </div>
  );
}

export default Login;
