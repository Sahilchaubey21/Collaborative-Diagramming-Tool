import React, { useState, useEffect } from 'react';
import { diagrams } from '../api';

const ShareModal = ({ diagramId, diagramTitle, isOpen, onClose, onShare }) => {
  const [email, setEmail] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);

  useEffect(() => {
    if (isOpen && diagramId) {
      fetchCollaborators();
    }
  }, [isOpen, diagramId]);

  const fetchCollaborators = async () => {
    try {
      setIsLoadingCollaborators(true);
      const diagram = await diagrams.getById(diagramId);
      setCollaborators(diagram.collaborators || []);
    } catch (err) {
      console.error('Error fetching collaborators:', err);
    } finally {
      setIsLoadingCollaborators(false);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      setError('');
      await diagrams.addCollaborator(diagramId, email.trim());
      setEmail('');
      fetchCollaborators(); // Refresh collaborators list
      onShare && onShare(email.trim());
    } catch (err) {
      console.error('Error sharing diagram:', err);
      setError(err.response?.data?.detail || 'Failed to share diagram');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorEmail) => {
    if (window.confirm(`Remove ${collaboratorEmail} from this diagram?`)) {
      try {
        await diagrams.removeCollaborator(diagramId, collaboratorEmail);
        fetchCollaborators(); // Refresh collaborators list
      } catch (err) {
        console.error('Error removing collaborator:', err);
        setError(err.response?.data?.detail || 'Failed to remove collaborator');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share "{diagramTitle}"</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleShare}>
            <div className="form-group">
              <label htmlFor="email">Share with user (enter email):</label>
              <div className="share-input-group">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter user's email address"
                  required
                />
                <button 
                  type="submit" 
                  disabled={loading || !email.trim()}
                  className="btn btn-primary"
                >
                  {loading ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="collaborators-section">
            <h4>Current Collaborators</h4>
            {isLoadingCollaborators ? (
              <div className="loading">Loading collaborators...</div>
            ) : collaborators.length === 0 ? (
              <p className="no-collaborators">No collaborators yet. Share with someone to get started!</p>
            ) : (
              <div className="collaborators-list">
                {collaborators.map((email, index) => (
                  <div key={index} className="collaborator-item">
                    <span className="collaborator-email">{email}</span>
                    <button
                      onClick={() => handleRemoveCollaborator(email)}
                      className="btn-remove"
                      title="Remove collaborator"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
