import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        // The onAuthStateChange listener in AuthContext will handle the user state.
        // We can navigate to a default page after login.
        navigate('/');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-blue-200">
      <div className="w-full max-w-md p-6 space-y-2 bg-blue-100 rounded-lg shadow-md ">
    
        <form className="space-y-6 bg-blue-100 rounded-lg p-4" onSubmit={handleLogin}>

                      <div className="flex items-center justify-center mb-1">
              <img
                src="/bizops.png" // Path to the image in the public directory
                alt="BizOps Logo"
                className="block h-30 w-auto sm:h-36 rounded-lg p-2" // Increased size
              />
            </div>
                  <h2 className="text-2xl font-bold text-center">Login</h2>
          <div>
            <label
              htmlFor="email"
              className="text-sm font-bold text-gray-600 block"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-1"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-bold text-gray-600 block"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mt-1"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded disabled:bg-blue-400"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
        {/* <div className="text-center">
          <p className="text-sm">
            Don't have an account?{' '}
            <a href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </a>
          </p>
        </div> */}
      </div>
    </div>
  );
}