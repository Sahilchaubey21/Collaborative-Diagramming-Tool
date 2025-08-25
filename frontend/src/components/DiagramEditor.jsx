import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { diagrams, chat, auth } from '../api';
import { useAuth } from '../contexts/AuthContext';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import DiagramChat from './DiagramChat';
import Header from './Header';

const DiagramEditor = () => {
  const { diagramId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [activeTool, setActiveTool] = useState('select');
  // Check if creating a new diagram
  const isNewDiagram = !diagramId || diagramId === 'new';
  const [currentDiagram, setCurrentDiagram] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'unsaved', 'saving', 'error'
  const [diagramTitle, setDiagramTitle] = useState('Untitled Diagram');
  const canvasRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const lastSaveDataRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    
    // Load diagram if editing existing one
    if (!isNewDiagram) {
      loadDiagram();
    } else {
      // Create new diagram with unique name
      generateUniqueDiagramName();
    }

    // Add keyboard shortcut for save (Ctrl+S)
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveClick();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Clear any pending auto-save
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [diagramId, isAuthenticated, navigate, isNewDiagram]);

  const loadDiagram = async () => {
    try {
      const diagramData = await diagrams.getById(diagramId);
      setCurrentDiagram(diagramData);
      setDiagramTitle(diagramData.title);
    } catch (error) {
      console.error('Error loading diagram:', error);
      setSaveStatus('error');
    }
  };

  const generateUniqueDiagramName = async () => {
    try {
      // Fetch all existing diagrams to check for naming conflicts
      const existingDiagrams = await diagrams.getAll(0, 100); // Get up to 100 diagrams
      
      let uniqueTitle = 'Untitled Diagram';
      let counter = 1;
      
      // Check if base name exists
      const baseNameExists = existingDiagrams.some(diagram => 
        diagram.title === 'Untitled Diagram'
      );
      
      if (baseNameExists) {
        // Find the next available number
        while (existingDiagrams.some(diagram => 
          diagram.title === `Untitled Diagram ${counter}`
        )) {
          counter++;
        }
        uniqueTitle = `Untitled Diagram ${counter}`;
      }
      
      // Create new diagram with unique name
      setCurrentDiagram({
        title: uniqueTitle,
        description: '',
        diagram_data: { elements: [], canvas_state: {} }
      });
      setDiagramTitle(uniqueTitle);
    } catch (error) {
      console.error('Error generating unique diagram name:', error);
      // Fallback to default name if API call fails
      setCurrentDiagram({
        title: 'Untitled Diagram',
        description: '',
        diagram_data: { elements: [], canvas_state: {} }
      });
      setDiagramTitle('Untitled Diagram');
    }
  };

  const saveDiagram = useCallback(async (canvasData, isAutoSave = false) => {
    if (!currentDiagram) return;
    
    // Prevent multiple simultaneous saves
    if (saving) {
      console.log('Save already in progress, skipping...');
      return;
    }
    
    setSaving(true);
    setSaveStatus('saving');
    
    try {
      const updateData = {
        title: diagramTitle,
        description: currentDiagram.description || '',
        diagram_data: {
          elements: canvasData || [],
          canvas_state: {
            width: 800,
            height: 600,
            zoom: 1,
            panX: 0,
            panY: 0
          }
        },
        is_public: currentDiagram.is_public || false,
        collaborators: currentDiagram.collaborators || []
      };

      let result;
      if (isNewDiagram && !currentDiagram._id) {
        // Create new diagram
        result = await diagrams.create(updateData);
        setCurrentDiagram(result);
        // Update URL to include the new diagram ID
        navigate(`/editor/${result._id}`, { replace: true });
      } else {
        // Update existing diagram
        const targetId = currentDiagram._id || diagramId;
        result = await diagrams.update(targetId, updateData);
        setCurrentDiagram(result);
      }
      
      // Store the last successful save data
      lastSaveDataRef.current = JSON.stringify(canvasData);
      
      setSaveStatus('saved');
      
    } catch (error) {
      console.error('Error saving diagram:', error);
      setSaveStatus('error');
      
      // Auto-retry for auto-saves after 5 seconds
      if (isAutoSave) {
        setTimeout(() => {
          setSaveStatus('unsaved');
        }, 5000);
      }
    } finally {
      setSaving(false);
    }
  }, [currentDiagram, diagramTitle, isNewDiagram, diagramId, navigate]);

  const handleSaveClick = useCallback(() => {
    if (canvasRef.current && canvasRef.current.getCanvasData) {
      // Clear any pending auto-save since we're doing manual save
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      
      const canvasData = canvasRef.current.getCanvasData();
      saveDiagram(canvasData, false);
    }
  }, [saveDiagram]);

  const handleAutoSave = useCallback((canvasData) => {
    // Don't auto-save if already saving or if data hasn't changed
    if (saving) return;
    
    const currentDataString = JSON.stringify(canvasData);
    if (currentDataString === lastSaveDataRef.current) {
      return; // No changes to save
    }
    
    setSaveStatus('unsaved');
    
    // Clear previous auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new auto-save timeout
    autoSaveTimeoutRef.current = setTimeout(() => {
      // Re-check conditions before auto-saving
      if (!saving) {
        saveDiagram(canvasData, true);
      }
      autoSaveTimeoutRef.current = null;
    }, 3000); // Auto-save after 3 seconds of inactivity
  }, [saving, saveDiagram]);

  const handleLogout = async () => {
    if (saveStatus === 'unsaved') {
      const confirmLogout = window.confirm('You have unsaved changes. Are you sure you want to logout?');
      if (!confirmLogout) return;
    }
    navigate('/dashboard');
  };

  const getSaveButtonText = () => {
    switch (saveStatus) {
      case 'saving': return 'Saving...';
      case 'unsaved': return 'Save Changes';
      case 'error': return 'Save Failed - Retry';
      default: return 'Saved';
    }
  };

  const getSaveButtonClass = () => {
    const baseClass = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors';
    switch (saveStatus) {
      case 'saving':
        return `${baseClass} bg-yellow-500 text-white cursor-not-allowed`;
      case 'unsaved':
        return `${baseClass} bg-blue-600 text-white hover:bg-blue-700`;
      case 'error':
        return `${baseClass} bg-red-600 text-white hover:bg-red-700`;
      default:
        return `${baseClass} bg-green-600 text-white cursor-default`;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <Header />
      
      {/* Diagram-specific header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link to="/my-diagrams" className="text-blue-600 hover:text-blue-800">
            ← Back to Diagrams
          </Link>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={diagramTitle}
              onChange={(e) => {
                setDiagramTitle(e.target.value);
                setSaveStatus('unsaved');
              }}
              className="text-xl font-bold text-gray-800 bg-transparent border-none outline-none hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              placeholder="Diagram Title"
            />
            {/* Shared Indicator */}
            {currentDiagram && currentDiagram.collaborators && currentDiagram.collaborators.length > 0 && (
              <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
                Shared ({currentDiagram.collaborators.length})
              </div>
            )}
            {/* Public Indicator */}
            {currentDiagram && currentDiagram.is_public && (
              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd"/>
                </svg>
                Public
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Save Status Indicator */}
          <div className="flex items-center gap-2">
            {saveStatus === 'unsaved' && (
              <span className="text-sm text-orange-600">● Unsaved changes</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-sm text-green-600">✓ All changes saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600">⚠ Save failed</span>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveClick}
            disabled={saving || saveStatus === 'saved'}
            className={getSaveButtonClass()}
          >
            {saving && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {getSaveButtonText()}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar 
        activeTool={activeTool} 
        onToolChange={setActiveTool} 
      />

      {/* Canvas Area */}
      <div className="flex-1 p-6">
        <Canvas 
          ref={canvasRef}
          activeTool={activeTool} 
          diagramId={diagramId} 
          initialData={currentDiagram?.diagram_data}
          onCanvasChange={handleAutoSave}
        />
      </div>

      {/* Chat Component */}
      <DiagramChat 
        diagramId={diagramId}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
      />
    </div>
  );
};

export default DiagramEditor;
