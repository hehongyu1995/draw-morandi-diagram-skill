import { create } from 'zustand';
import type { DiagramSpec } from '../types';
import { computeAutoLayout } from '../utils/dagreLayout';

interface AppState {
  sourceData: DiagramSpec | null;
  renderedData: DiagramSpec | null;
  currentData: DiagramSpec | null;
  activeFile: string;
  fileList: string[];
  animationsEnabled: boolean;
  bypassMargin: number;
  animateDashed: boolean;
  animateSolid: boolean;
  editorText: string;
  jsonStatus: { isValid: boolean; message: string };
  isExportingGif: boolean;
  gifProgress: number;
  defaultCurvature: number;
  
  // Actions
  init: () => Promise<void>;
  setDefaultCurvature: (val: number) => void;
  setActiveFile: (filename: string) => Promise<void>;
  setBypassMargin: (val: number) => void;
  setAnimateDashed: (val: boolean) => void;
  setAnimateSolid: (val: boolean) => void;
  setAnimationsEnabled: (val: boolean) => void;
  updateEditorText: (text: string) => void;
  dragNode: (nodeId: string, x: number, y: number) => void;
  dragNodes: (updates: { id: string; x: number; y: number }[]) => void;
  saveToServer: () => Promise<void>;
  loadSourceData: (data: DiagramSpec, message?: string) => void;
  setIsExportingGif: (val: boolean) => void;
  setGifProgress: (val: number) => void;
  updateConnectionOffset: (connIdx: number, type: 'from' | 'to', offset: [number, number]) => void;
}

let saveTimeout: any = null;

function shouldAutoLayout(data: DiagramSpec) {
  return data.type !== 'sequence' && data.autoLayout && data.nodes && data.nodes.length > 0;
}

function renderFromSource(data: DiagramSpec): DiagramSpec {
  return shouldAutoLayout(data) ? computeAutoLayout(data) : data;
}

function withNodeOverrides(
  data: DiagramSpec,
  updates: { id: string; x: number; y: number }[]
): DiagramSpec {
  const nextOverrides = {
    ...(data.layout?.overrides?.nodes || {}),
  };

  updates.forEach((update) => {
    nextOverrides[update.id] = { x: update.x, y: update.y };
  });

  return {
    ...data,
    layout: {
      ...(data.layout || {}),
      overrides: {
        ...(data.layout?.overrides || {}),
        nodes: nextOverrides,
      },
    },
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  sourceData: null,
  renderedData: null,
  currentData: null,
  activeFile: 'diagram.json',
  fileList: ['diagram.json'],
  animationsEnabled: localStorage.getItem('animationsEnabled') !== 'false',
  bypassMargin: parseInt(localStorage.getItem('bypassMargin') || '15', 10),
  animateDashed: localStorage.getItem('animateDashed') !== 'false',
  animateSolid: localStorage.getItem('animateSolid') !== 'false',
  editorText: '',
  jsonStatus: { isValid: true, message: 'Ready' },
  isExportingGif: false,
  gifProgress: 0,
  defaultCurvature: parseFloat(localStorage.getItem('defaultCurvature') || '0.35'),

  init: async () => {
    // 1. Fetch file list
    try {
      const listRes = await fetch('/list');
      if (listRes.ok) {
        const files = await listRes.json();
        set({ fileList: files });
        
        // Load initial file
        const currentFile = files.includes(get().activeFile) ? get().activeFile : (files[0] || 'diagram.json');
        set({ activeFile: currentFile });
        await get().setActiveFile(currentFile);
      }
    } catch (err) {
      set({ jsonStatus: { isValid: false, message: 'Failed to load file list' } });
    }
  },

  setActiveFile: async (filename: string) => {
    set({ activeFile: filename });
    try {
      const res = await fetch(`/${filename}?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        get().loadSourceData(data, 'Ready');
      }
    } catch (err) {
      set({ jsonStatus: { isValid: false, message: `Failed to load ${filename}` } });
    }
  },

  setBypassMargin: (val: number) => {
    set({ bypassMargin: val });
    localStorage.setItem('bypassMargin', String(val));
  },

  setDefaultCurvature: (val: number) => {
    set({ defaultCurvature: val });
    localStorage.setItem('defaultCurvature', String(val));
  },

  setAnimateDashed: (val: boolean) => {
    set({ animateDashed: val });
    localStorage.setItem('animateDashed', String(val));
    
    // Auto-sync global state
    const globalState = val || get().animateSolid;
    set({ animationsEnabled: globalState });
    localStorage.setItem('animationsEnabled', String(globalState));
  },

  setAnimateSolid: (val: boolean) => {
    set({ animateSolid: val });
    localStorage.setItem('animateSolid', String(val));
    
    // Auto-sync global state
    const globalState = get().animateDashed || val;
    set({ animationsEnabled: globalState });
    localStorage.setItem('animationsEnabled', String(globalState));
  },

  setAnimationsEnabled: (val: boolean) => {
    set({
      animationsEnabled: val,
      animateDashed: val,
      animateSolid: val
    });
    localStorage.setItem('animationsEnabled', String(val));
    localStorage.setItem('animateDashed', String(val));
    localStorage.setItem('animateSolid', String(val));
  },

  updateEditorText: (text: string) => {
    set({ editorText: text });
    try {
      const data = JSON.parse(text);
      const renderedData = renderFromSource(data);

      set({
        sourceData: data,
        renderedData,
        currentData: renderedData,
        jsonStatus: { isValid: true, message: 'Valid JSON' }
      });
      
      // Debounce save to backend file
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        get().saveToServer();
      }, 1000);
    } catch (err: any) {
      set({ jsonStatus: { isValid: false, message: `JSON Error: ${err.message}` } });
    }
  },

  dragNode: (nodeId: string, x: number, y: number) => {
    const data = get().sourceData;
    if (!data) return;

    let updatedSpec: DiagramSpec;
    
    if (data.type === 'sequence') {
      const updatedParticipants = (data.participants || []).map(p => {
        if (p.id === nodeId) {
          return { ...p, x, y: 50 }; // Lock Y coordinate at 50 for sequence diagram
        }
        return p;
      });
      updatedSpec = { ...data, participants: updatedParticipants };
    } else if (shouldAutoLayout(data)) {
      updatedSpec = withNodeOverrides(data, [{ id: nodeId, x, y }]);
    } else {
      const updatedNodes = (data.nodes || []).map(n => {
        if (n.id === nodeId) {
          return { ...n, x, y };
        }
        return n;
      });
      updatedSpec = { ...data, nodes: updatedNodes };
    }

    const renderedData = renderFromSource(updatedSpec);
    set({
      sourceData: updatedSpec,
      renderedData,
      currentData: renderedData,
      editorText: JSON.stringify(updatedSpec, null, 2)
    });

    // Save coordinate changes directly to the backend
    get().saveToServer();
  },

  dragNodes: (updates: { id: string; x: number; y: number }[]) => {
    const data = get().sourceData;
    if (!data) return;

    let updatedSpec: DiagramSpec;
    const updateMap = new Map(updates.map(u => [u.id, u]));

    if (data.type === 'sequence') {
      const updatedParticipants = (data.participants || []).map(p => {
        const u = updateMap.get(p.id);
        return u ? { ...p, x: u.x, y: 50 } : p;
      });
      updatedSpec = { ...data, participants: updatedParticipants };
    } else if (shouldAutoLayout(data)) {
      updatedSpec = withNodeOverrides(data, updates);
    } else {
      const updatedNodes = (data.nodes || []).map(n => {
        const u = updateMap.get(n.id);
        return u ? { ...n, x: u.x, y: u.y } : n;
      });
      updatedSpec = { ...data, nodes: updatedNodes };
    }

    const renderedData = renderFromSource(updatedSpec);
    set({
      sourceData: updatedSpec,
      renderedData,
      currentData: renderedData,
      editorText: JSON.stringify(updatedSpec, null, 2)
    });

    get().saveToServer();
  },

  saveToServer: async () => {
    const dataToSave = get().sourceData;
    if (!dataToSave) return;

    try {
      await fetch(`/save?file=${encodeURIComponent(get().activeFile)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
    } catch (err) {
      console.error('Failed to save file changes to workspace:', err);
    }
  },

  loadSourceData: (data: DiagramSpec, message = 'Ready') => {
    const renderedData = renderFromSource(data);
    set({
      sourceData: data,
      renderedData,
      currentData: renderedData,
      editorText: JSON.stringify(data, null, 2),
      jsonStatus: { isValid: true, message }
    });
  },

  setIsExportingGif: (val: boolean) => set({ isExportingGif: val }),
  setGifProgress: (val: number) => set({ gifProgress: val }),
  updateConnectionOffset: (connIdx: number, type: 'from' | 'to', offset: [number, number]) => {
    const data = get().sourceData;
    if (!data || !data.connections) return;

    const updatedConns = [...data.connections];
    const conn = { ...updatedConns[connIdx] };
    
    if (type === 'from') {
      conn.fromOffset = offset;
    } else {
      conn.toOffset = offset;
    }
    
    updatedConns[connIdx] = conn;

    const updatedSpec = { ...data, connections: updatedConns };
    const renderedData = renderFromSource(updatedSpec);
    set({
      sourceData: updatedSpec,
      renderedData,
      currentData: renderedData,
      editorText: JSON.stringify(updatedSpec, null, 2)
    });

    get().saveToServer();
  }
}));
