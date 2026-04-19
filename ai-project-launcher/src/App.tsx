import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
import FloatingBall from './components/FloatingBall';
import ProjectMenu from './components/ProjectMenu';
import type { Project } from './types';

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadProjects();
    restoreWindowPosition();

    const unlisten = listen('save-position', async () => {
      try {
        const win = getCurrentWindow();
        const pos = await win.outerPosition();
        await invoke('save_window_position', { x: pos.x, y: pos.y });
      } catch (e) {
        console.error('Failed to save position:', e);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const loadProjects = async () => {
    try {
      const result = await invoke<Project[]>('list_projects');
      setProjects(result);
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  };

  const restoreWindowPosition = async () => {
    try {
      const [x, y] = await invoke<[number, number]>('load_window_position');
      const win = getCurrentWindow();
      if (x === -1 && y === -1) {
        // First launch: position at bottom-right corner using web API
        const width = window.innerWidth;
        const height = window.innerHeight;
        const pos = new LogicalPosition(width - 100, height - 120);
        await win.setPosition(pos);
      } else {
        // Restore saved position
        await win.setPosition(new LogicalPosition(x, y));
      }
    } catch (e) {
      console.error('Failed to restore window position:', e);
    }
  };

  const handleAddProject = async (name: string, path: string) => {
    try {
      await invoke('add_project', { name, path });
      await loadProjects();
    } catch (e) {
      console.error('Failed to add project:', e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await invoke('delete_project', { id });
      await loadProjects();
    } catch (e) {
      console.error('Failed to delete project:', e);
    }
  };

  const handleLaunchProject = async (project: Project) => {
    try {
      await invoke('launch_project', { path: project.path, name: project.name });
    } catch (e) {
      console.error('Failed to launch project:', e);
    }
  };

  return (
    <div className="app">
      <FloatingBall isOpen={menuOpen} onClick={() => setMenuOpen(!menuOpen)} />
      {menuOpen && (
        <ProjectMenu
          projects={projects}
          onClose={() => setMenuOpen(false)}
          onAdd={handleAddProject}
          onDelete={handleDeleteProject}
          onLaunch={handleLaunchProject}
        />
      )}
    </div>
  );
}

export default App;
