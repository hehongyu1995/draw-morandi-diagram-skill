import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiagramSpec } from '../types';

const storage = new Map<string, string>();

function installBrowserMocks() {
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  });
}

async function loadStore() {
  vi.resetModules();
  installBrowserMocks();
  return import('./appStore');
}

function sourceSpec(overrides: Partial<DiagramSpec> = {}): DiagramSpec {
  return {
    autoLayout: true,
    layout: {
      direction: 'LR',
      constraints: [{ type: 'inline', chain: ['A', 'B'] }],
    },
    nodes: [
      { id: 'A', type: 'capsule', theme: 'gray', label: 'A' },
      { id: 'B', type: 'capsule', theme: 'gray', label: 'B' },
    ],
    connections: [{ from: 'A', to: 'B' }],
    ...overrides,
  };
}

function mockFetchForLoad(spec: DiagramSpec) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return { ok: true } as Response;
    }
    if (url.startsWith('/diagram.json')) {
      return {
        ok: true,
        json: async () => spec,
      } as Response;
    }
    return { ok: false } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('appStore source and rendered data', () => {
  it('loads auto-layout JSON as clean sourceData and computed renderedData', async () => {
    const spec = sourceSpec();
    mockFetchForLoad(spec);
    const { useAppStore } = await loadStore();

    await useAppStore.getState().setActiveFile('diagram.json');
    const state = useAppStore.getState();

    expect(state.sourceData).toEqual(spec);
    expect(state.sourceData?.nodes?.[0].x).toBeUndefined();
    expect(state.renderedData?.nodes?.[0].x).toEqual(expect.any(Number));
    expect(state.renderedData?.nodes?.[0].y).toEqual(expect.any(Number));
    expect(state.editorText).toBe(JSON.stringify(spec, null, 2));
  });

  it('stores drag positions as source layout overrides and renders them', async () => {
    mockFetchForLoad(sourceSpec());
    const { useAppStore } = await loadStore();

    await useAppStore.getState().setActiveFile('diagram.json');
    await useAppStore.getState().dragNode('B', 501, 222);
    const state = useAppStore.getState();

    expect(state.sourceData?.layout?.overrides?.nodes?.B).toEqual({ x: 501, y: 222 });
    expect(state.renderedData?.nodes?.find((node) => node.id === 'B')).toMatchObject({ x: 501, y: 222 });
  });

  it('saves sourceData with overrides instead of renderedData coordinates after drag', async () => {
    const fetchMock = mockFetchForLoad(sourceSpec());
    const { useAppStore } = await loadStore();

    await useAppStore.getState().setActiveFile('diagram.json');
    await useAppStore.getState().dragNode('B', 501, 222);

    const saveCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(saveCall).toBeDefined();
    const saved = JSON.parse(saveCall![1]!.body as string) as DiagramSpec;
    expect(saved.autoLayout).toBe(true);
    expect(saved.layout?.constraints).toEqual([{ type: 'inline', chain: ['A', 'B'] }]);
    expect(saved.layout?.overrides?.nodes?.B).toEqual({ x: 501, y: 222 });
    expect(saved.nodes?.find((node) => node.id === 'A')?.x).toBeUndefined();
  });

  it('recomputes renderedData when edited auto-layout JSON is valid', async () => {
    vi.useFakeTimers();
    mockFetchForLoad(sourceSpec());
    const { useAppStore } = await loadStore();
    const edited = sourceSpec({
      nodes: [
        { id: 'A', type: 'capsule', theme: 'gray', label: 'A' },
        { id: 'B', type: 'capsule', theme: 'gray', label: 'B' },
        { id: 'C', type: 'capsule', theme: 'gray', label: 'C' },
      ],
      connections: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ],
    });

    useAppStore.getState().updateEditorText(JSON.stringify(edited, null, 2));

    expect(useAppStore.getState().sourceData).toEqual(edited);
    expect(useAppStore.getState().renderedData?.nodes).toHaveLength(3);
    expect(useAppStore.getState().renderedData?.nodes?.[2].x).toEqual(expect.any(Number));
  });

  it('does not auto-layout edited manual JSON', async () => {
    mockFetchForLoad(sourceSpec());
    const { useAppStore } = await loadStore();
    const manual: DiagramSpec = {
      autoLayout: false,
      nodes: [{ id: 'A', type: 'capsule', theme: 'gray', label: 'A', x: 17, y: 29 }],
      connections: [],
    };

    useAppStore.getState().updateEditorText(JSON.stringify(manual, null, 2));

    expect(useAppStore.getState().sourceData).toEqual(manual);
    expect(useAppStore.getState().renderedData).toEqual(manual);
  });
});
