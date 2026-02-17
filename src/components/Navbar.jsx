import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { supabase } from '../services/supabase';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false); // State for mobile menu

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Base classes for all links
  const baseLinkClass = "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  
  // Classes specifically for desktop view links
  const desktopLinkClass = ({ isActive }) =>
    `${baseLinkClass} ${
      isActive
        ? 'bg-gray-900 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;
  
  // Classes specifically for mobile view links
  const mobileLinkClass = ({ isActive }) =>
    `${baseLinkClass} block ${ // 'block' is for the vertical layout
      isActive
        ? 'bg-gray-900 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`;
  
  // Conditionally create the Dashboard link component
  const dashboardLink = (isMobile = false) => (
    user?.role === 'admin' ? (
      <NavLink to="/dashboard" className={isMobile ? mobileLinkClass : desktopLinkClass} onClick={() => setIsOpen(false)}>
        Dashboard
      </NavLink>
    ) : null
  );

  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          
          <div className="flex items-center">
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-controls="mobile-menu"
                aria-expanded={isOpen}
              >
                <span className="sr-only">Open main menu</span>
                {/* Hamburger Icon */}
                {!isOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                ) : (
                  // Close Icon
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            </div>
            {/* --- Logo Added Here --- */}
            <div className="flex items-center">
              <img
                src="/bizops.png" // Path to the image in the public directory
                alt="BizOps Logo"
                className="block h-12 w-auto sm:h-16" // Increased size
              />
            </div>
          </div>
          {/* --- End Logo Addition --- */}

          {/* Desktop Menu */}
          <div className="flex-1 flex items-center justify-center md:items-stretch md:justify-start">
            <div className="hidden md:ml-6 md:flex items-center space-x-4">
              {dashboardLink(false)}
              <NavLink to="/products" className={desktopLinkClass}>
                Products
              </NavLink>
              <NavLink to="/inventory" className={desktopLinkClass}>
                Inventory
              </NavLink>
              <NavLink to="/sales" className={desktopLinkClass}>
                Sales
              </NavLink>
            </div>
          </div>

          {/* Right side: User info and Logout (Desktop) */}
          <div className="hidden md:flex items-center">
            {user && (
              <>
                <span className="text-gray-300 text-sm mr-4">{user.email} ({user.role})</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state. */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {dashboardLink(true)}
          <NavLink to="/products" className={mobileLinkClass} onClick={() => setIsOpen(false)}>Products</NavLink>
          <NavLink to="/inventory" className={mobileLinkClass} onClick={() => setIsOpen(false)}>Inventory</NavLink>
          <NavLink to="/sales" className={mobileLinkClass} onClick={() => setIsOpen(false)}>Sales</NavLink>
        </div>
        {/* User info and Logout (Mobile) */}
        {user && (
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="px-5">
              <div className="text-base font-medium leading-none text-white">{user.email}</div>
              <div className="mt-1 text-sm font-medium leading-none text-gray-400">{user.role}</div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}