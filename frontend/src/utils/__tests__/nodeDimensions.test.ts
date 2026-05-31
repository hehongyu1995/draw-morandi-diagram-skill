import { describe, it, expect } from 'vitest';
import { getNodeDimensions } from '../nodeDimensions';

describe('getNodeDimensions', () => {
  it('circle node returns {w: 50, h: 50}', () => {
    expect(getNodeDimensions({ type: 'circle' })).toEqual({ w: 50, h: 50 });
  });

  it('person node returns {w: 70, h: 90} by default', () => {
    expect(getNodeDimensions({ type: 'person' })).toEqual({ w: 70, h: 90 });
  });

  it('person node respects custom width/height', () => {
    expect(getNodeDimensions({ type: 'person', width: 100, height: 120 })).toEqual({ w: 100, h: 120 });
  });

  it('cloud node returns {w: 120, h: 80} by default', () => {
    expect(getNodeDimensions({ type: 'cloud' })).toEqual({ w: 120, h: 80 });
  });

  it('cloud node respects custom width/height', () => {
    expect(getNodeDimensions({ type: 'cloud', width: 200, height: 150 })).toEqual({ w: 200, h: 150 });
  });

  it('default (rect/capsule/database/file) returns {w: 110, h: 50}', () => {
    expect(getNodeDimensions({ type: 'rect' })).toEqual({ w: 110, h: 50 });
    expect(getNodeDimensions({ type: 'capsule' })).toEqual({ w: 110, h: 50 });
    expect(getNodeDimensions({ type: 'database' })).toEqual({ w: 110, h: 50 });
    expect(getNodeDimensions({ type: 'file' })).toEqual({ w: 110, h: 50 });
  });

  it('default respects custom width/height', () => {
    expect(getNodeDimensions({ type: 'rect', width: 200, height: 80 })).toEqual({ w: 200, h: 80 });
    expect(getNodeDimensions({ type: 'capsule', width: 150, height: 60 })).toEqual({ w: 150, h: 60 });
  });
});
