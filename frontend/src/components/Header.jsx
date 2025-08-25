import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header = ({ isPublic = false }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (isPublic) {
    // Public header for landing page
    return (
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f0f2f5] px-10 py-3 bg-white">
        <div className="flex items-center gap-4 text-[#111418]">
          <div className="size-4">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <Link to="/" className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em]">
            DiagramAI
          </Link>
        </div>
        <div className="flex flex-1 justify-end gap-8">
          <div className="flex items-center gap-9">
            <Link className="text-[#111418] text-sm font-medium leading-normal hover:text-blue-600" to="/help">Features</Link>
            <Link className="text-[#111418] text-sm font-medium leading-normal hover:text-blue-600" to="/help">Help</Link>
            <Link className="text-[#111418] text-sm font-medium leading-normal hover:text-blue-600" to="/help">About</Link>
          </div>
          <div className="flex gap-2">
            <Link
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#0d80f2] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-700"
              to="/auth"
            >
              <span className="truncate">Sign up</span>
            </Link>
            <Link
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#f0f2f5] text-[#111418] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200"
              to="/auth"
            >
              <span className="truncate">Log in</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // Authenticated header for dashboard and other pages
  return (
    <header className="bg-white border-b border-[#e7edf3]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DA</span>
              </div>
              <span className="text-xl font-bold text-[#111418]">DiagramAI</span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link 
                className="text-[#111418] text-sm font-medium leading-normal hover:text-blue-600 hover:border-blue-600 border-b-2 border-transparent" 
                to="/dashboard"
              >
                Home
              </Link>
              <Link 
                className="text-[#637588] text-sm font-medium leading-normal hover:text-blue-600" 
                to="/my-diagrams"
              >
                My Diagrams
              </Link>
              <Link 
                className="text-[#637588] text-sm font-medium leading-normal hover:text-blue-600" 
                to="/editor"
              >
                Create New
              </Link>
              <Link 
                className="text-[#637588] text-sm font-medium leading-normal hover:text-blue-600" 
                to="/help"
              >
                Help
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-[#637588]">
              Welcome, {user?.full_name || user?.username || user?.email}
            </div>
            <div className="relative">
              <button
                className="flex items-center space-x-2 text-sm text-[#637588] hover:text-[#111418]"
                onClick={() => {
                  // You can add dropdown menu here later
                }}
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {(user?.full_name || user?.username || user?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
              </button>
            </div>
            <Link 
              to="/account-settings" 
              className="text-[#637588] text-sm font-medium leading-normal hover:text-blue-600"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="bg-gray-100 text-[#637588] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
