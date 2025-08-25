import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8fafb]">
      <Header />

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111418] mb-2">
            Welcome to DiagramAI, {user?.full_name || user?.username}!
          </h1>
          <p className="text-[#637588]">
            Create, collaborate, and share professional diagrams with AI assistance.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link to="/editor/new" className="bg-white p-6 rounded-lg border border-[#e7edf3] hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#111418] mb-2">Create New Diagram</h3>
            <p className="text-[#637588]">Start a new diagram from scratch with our editor</p>
          </Link>

          <Link to="/my-diagrams" className="bg-white p-6 rounded-lg border border-[#e7edf3] hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#111418] mb-2">My Diagrams</h3>
            <p className="text-[#637588]">Access and manage all your saved diagrams</p>
          </Link>

          <Link to="/account-settings" className="bg-white p-6 rounded-lg border border-[#e7edf3] hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#111418] mb-2">Account Settings</h3>
            <p className="text-[#637588]">Manage your profile and preferences</p>
          </Link>
        </div>

        {/* Recent Activity or Getting Started */}
        <div className="bg-white rounded-lg border border-[#e7edf3] p-6">
          <h2 className="text-xl font-semibold text-[#111418] mb-4">Getting Started</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <h3 className="font-medium text-[#111418]">Create your first diagram</h3>
                <p className="text-[#637588] text-sm">Use our intuitive editor to build flowcharts, mind maps, and more</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <h3 className="font-medium text-[#111418]">Collaborate with others</h3>
                <p className="text-[#637588] text-sm">Share your diagrams and work together in real-time</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <div>
                <h3 className="font-medium text-[#111418]">Use AI assistance</h3>
                <p className="text-[#637588] text-sm">Get intelligent suggestions to improve your diagrams</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
