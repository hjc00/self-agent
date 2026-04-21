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

  const restoreWindowPosition = async () => {
    try {
      const win = getCurrentWindow();
      const [x, y] = await invoke<[number, number]>('load_window_position');

      // Ensure window is visible first
      await win.show();

      if (x === -1 && y === -1) {
        // First launch: position at bottom-right corner
        // Use app window size instead of window.innerWidth which may be 0
        const winProps = await win.innerSize();
        const screenHeight = window.screen.availHeight;
        const screenWidth = window.screen.availWidth;
        const posX = Math.max(0, screenWidth - 100);
        const posY = Math.max(0, screenHeight - 100);
        await win.setPosition(new LogicalPosition(posX, posY));
      } else {
        // Restore saved position
        await win.setPosition(new LogicalPosition(x, y));
      }
    } catch (e) {
      console.error('Failed to restore window position:', e);
      // Still try to show the window
      getCurrentWindow().show();
    }
  };

  const handleToggle = () => {
    setMenuOpen(!menuOpen);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    getCurrentWindow().close();
  };

  const loadProjects = async () => {
    try {
      const result = await invoke<Project[]>('list_projects');
      setProjects(result);
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  };

  const handleAddProject = async (name: string, path: string) => {
    try {
      const result = await invoke<Project>('add_project', { name, path });
      console.log('Project added:', result);
      const projects = await invoke<Project[]>('list_projects');
      setProjects(projects);
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
    <div className="app" onContextMenu={handleContextMenu}>
      <FloatingBall isOpen={menuOpen} onClick={handleToggle} />
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