import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { diagrams } from '../api';
import ShareModal from './ShareModal';
import Header from './Header';

const MyDiagrams = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [diagramsList, setDiagramsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedDiagram, setSelectedDiagram] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    console.log('MyDiagrams useEffect triggered, user:', user);
    if (user) {
      fetchDiagrams();
    }
  }, [user, activeTab]);

  const fetchDiagrams = async () => {
    console.log('fetchDiagrams called for tab:', activeTab);
    try {
      setLoading(true);
      let response;
      if (activeTab === 'shared') {
        response = await diagrams.getShared();
      } else {
        // For 'all' and 'myshared' tabs, we get all user diagrams and filter later
        response = await diagrams.getAll();
      }
      console.log('Diagrams fetched successfully:', response);
      setDiagramsList(response);
      setError(null);
    } catch (err) {
      console.error('Error fetching diagrams:', err);
      setError('Failed to load diagrams');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDeleteDiagram = async (diagramId) => {
    if (window.confirm('Are you sure you want to delete this diagram?')) {
      try {
        await diagrams.delete(diagramId);
        // Refresh the diagrams list
        fetchDiagrams();
      } catch (err) {
        console.error('Error deleting diagram:', err);
        alert('Failed to delete diagram');
      }
    }
  };

  const handleShareDiagram = (diagram) => {
    setSelectedDiagram(diagram);
    setShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setShareModalOpen(false);
    setSelectedDiagram(null);
  };

  const handleShareSuccess = (email) => {
    alert(`Diagram shared with ${email} successfully!`);
    // Optionally refresh the diagram data to show updated collaborators
  };

  const filteredDiagrams = diagramsList.filter(diagram => {
    // First filter by search term
    const matchesSearch = diagram.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Then filter by active tab
    switch (activeTab) {
      case 'all':
        return true; // Show all diagrams
      case 'shared':
        // This tab shows diagrams shared WITH the user (handled by API)
        return true;
      case 'myshared':
        // Show diagrams that the user has shared with others
        return diagram.collaborators && diagram.collaborators.length > 0;
      case 'starred':
        // TODO: Implement starred functionality
        return diagram.is_starred || false;
      default:
        return true;
    }
  });

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-white group/design-root overflow-x-hidden" style={{fontFamily: 'Inter, "Noto Sans", sans-serif'}}>
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <div className="px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p className="text-[#111418] tracking-light text-[32px] font-bold leading-tight min-w-72">My Diagrams</p>
              <Link
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#f0f2f5] text-[#111418] text-sm font-medium leading-normal"
                to="/editor/new"
              >
                <span className="truncate">New Diagram</span>
              </Link>
            </div>
            
            {/* Tabs */}
            <div className="pb-3">
              <div className="flex border-b border-[#dbe0e6] px-4 gap-8">
                <button 
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 ${activeTab === 'all' ? 'border-b-[#111418] text-[#111418]' : 'border-b-transparent text-[#60758a]'}`}
                  onClick={() => setActiveTab('all')}
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">All Diagrams</p>
                </button>
                <button 
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 ${activeTab === 'shared' ? 'border-b-[#111418] text-[#111418]' : 'border-b-transparent text-[#60758a]'}`}
                  onClick={() => setActiveTab('shared')}
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">Shared with Me</p>
                </button>
                <button 
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 ${activeTab === 'myshared' ? 'border-b-[#111418] text-[#111418]' : 'border-b-transparent text-[#60758a]'}`}
                  onClick={() => setActiveTab('myshared')}
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">My Shared</p>
                </button>
                <button 
                  className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 ${activeTab === 'starred' ? 'border-b-[#111418] text-[#111418]' : 'border-b-transparent text-[#60758a]'}`}
                  onClick={() => setActiveTab('starred')}
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">Starred</p>
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="px-4 py-3">
              <label className="flex flex-col min-w-40 h-12 w-full">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                  <div className="text-[#60758a] flex border-none bg-[#f0f2f5] items-center justify-center pl-4 rounded-l-lg border-r-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
                    </svg>
                  </div>
                  <input
                    placeholder="Search diagrams"
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111418] focus:outline-0 focus:ring-0 border-none bg-[#f0f2f5] focus:border-none h-full placeholder:text-[#60758a] px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </label>
            </div>
            
            {/* Table */}
            <div className="px-4 py-3 @container">
              <div className="flex overflow-hidden rounded-lg border border-[#dbe0e6] bg-white">
                {loading ? (
                  <div className="flex justify-center items-center py-8 w-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-[#60758a]">Loading diagrams...</span>
                  </div>
                ) : error ? (
                  <div className="flex justify-center items-center py-8 w-full">
                    <span className="text-red-600">{error}</span>
                    <button 
                      onClick={fetchDiagrams}
                      className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredDiagrams.length === 0 ? (
                  <div className="flex flex-col justify-center items-center py-12 w-full">
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-[#60758a] text-lg mb-2">
                      {searchTerm ? 'No diagrams found matching your search' : 'No diagrams yet'}
                    </p>
                    <p className="text-[#60758a] text-sm mb-4">
                      {searchTerm ? 'Try a different search term' : 'Create your first diagram to get started'}
                    </p>
                    <Link
                      to="/editor/new"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create New Diagram
                    </Link>
                  </div>
                ) : (
                  <table className="flex-1">
                    <thead>
                      <tr className="bg-white">
                        <th className="px-4 py-3 text-left text-[#111418] w-[400px] text-sm font-medium leading-normal">Name</th>
                        <th className="px-4 py-3 text-left text-[#111418] w-[200px] text-sm font-medium leading-normal">Last Modified</th>
                        <th className="px-4 py-3 text-left text-[#111418] w-[150px] text-sm font-medium leading-normal">Elements</th>
                        {activeTab === 'myshared' && (
                          <th className="px-4 py-3 text-left text-[#111418] w-[200px] text-sm font-medium leading-normal">Shared With</th>
                        )}
                        <th className="px-4 py-3 text-left text-[#111418] w-60 text-[#60758a] text-sm font-medium leading-normal">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDiagrams.map((diagram) => (
                        <tr key={diagram._id || diagram.id} className="border-t border-t-[#dbe0e6] hover:bg-gray-50">
                          <td className="h-[72px] px-4 py-2 w-[400px] text-[#111418] text-sm font-normal leading-normal">
                            <div>
                              <div className="font-medium">{diagram.title}</div>
                              {diagram.description && (
                                <div className="text-[#60758a] text-xs mt-1">{diagram.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="h-[72px] px-4 py-2 w-[200px] text-[#60758a] text-sm font-normal leading-normal">
                            {formatDate(diagram.updated_at)}
                          </td>
                          <td className="h-[72px] px-4 py-2 w-[150px] text-[#60758a] text-sm font-normal leading-normal">
                            {diagram.diagram_data?.elements?.length || 0} elements
                          </td>
                          {activeTab === 'myshared' && (
                            <td className="h-[72px] px-4 py-2 w-[200px] text-[#60758a] text-sm font-normal leading-normal">
                              {diagram.collaborators && diagram.collaborators.length > 0 ? (
                                <div>
                                  <div className="font-medium text-blue-600">
                                    {diagram.collaborators.length} collaborator{diagram.collaborators.length > 1 ? 's' : ''}
                                  </div>
                                  <div className="text-xs text-[#60758a] mt-1">
                                    {diagram.collaborators.slice(0, 2).join(', ')}
                                    {diagram.collaborators.length > 2 && ` +${diagram.collaborators.length - 2} more`}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#60758a]">Not shared</span>
                              )}
                            </td>
                          )}
                          <td className="h-[72px] px-4 py-2 w-60 text-[#60758a] text-sm font-bold leading-normal tracking-[0.015em]">
                            <div className="flex gap-3">
                              <Link 
                                to={`/editor/${diagram._id || diagram.id}`}
                                className="text-[#0d80f2] hover:underline"
                              >
                                Edit
                              </Link>
                              {(activeTab === 'all' || activeTab === 'myshared') && (
                                <button 
                                  onClick={() => handleShareDiagram(diagram)}
                                  className="text-green-600 hover:underline"
                                >
                                  Share
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteDiagram(diagram._id || diagram.id)}
                                className="text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
        </div>
      </div>
      
      {/* Share Modal */}
      <ShareModal
        diagramId={selectedDiagram?._id || selectedDiagram?.id}
        diagramTitle={selectedDiagram?.title}
        isOpen={shareModalOpen}
        onClose={handleCloseShareModal}
        onShare={handleShareSuccess}
      />
    </div>      {/* Share Modal */}
      <ShareModal 
        diagramId={selectedDiagram?._id || selectedDiagram?.id}
        diagramTitle={selectedDiagram?.title}
        isOpen={shareModalOpen}
        onClose={handleCloseShareModal}
        onShare={handleShareSuccess}
      />
    </div>
  );
};

export default MyDiagrams;
