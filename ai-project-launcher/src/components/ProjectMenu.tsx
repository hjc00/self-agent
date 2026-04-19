import { useState, useEffect, useRef } from 'react';
import type { Project } from '../types';
import './ProjectMenu.css';

interface ProjectMenuProps {
  projects: Project[];
  onClose: () => void;
  onAdd: (name: string, path: string) => void;
  onDelete: (id: string) => void;
  onLaunch: (project: Project) => void;
}

function ProjectMenu({ projects, onClose, onAdd, onDelete, onLaunch }: ProjectMenuProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAdd = () => {
    if (newName.trim() && newPath.trim()) {
      onAdd(newName.trim(), newPath.trim());
      setNewName('');
      setNewPath('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="project-menu" ref={menuRef}>
      <div className="menu-header">
        <span>AI Projects</span>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="menu-content">
        {projects.length === 0 && !showAddForm && (
          <div className="empty-state">No projects yet</div>
        )}

        {projects.map((project) => (
          <div key={project.id} className="project-item">
            <button
              className="project-name"
              onClick={() => onLaunch(project)}
            >
              {project.name}
            </button>
            <button
              className="delete-btn"
              onClick={() => onDelete(project.id)}
              title="Delete project"
            >
              ×
            </button>
          </div>
        ))}

        {showAddForm ? (
          <div className="add-form">
            <input
              type="text"
              placeholder="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Project path"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
            />
            <div className="form-actions">
              <button onClick={handleAdd}>Add</button>
              <button onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="add-btn" onClick={() => setShowAddForm(true)}>
            + Add Project
          </button>
        )}
      </div>
    </div>
  );
}

export default ProjectMenu;
