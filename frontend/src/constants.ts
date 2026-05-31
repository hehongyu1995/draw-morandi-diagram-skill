import type { ThemeMap } from './types';

export const THEMES: ThemeMap = {
  red: {
    bg: '#f3e8e2',
    border: '#dcbdaf',
    text: '#8a5a44'
  },
  green: {
    bg: '#e8ebe4',
    border: '#c4ceb8',
    text: '#556f44'
  },
  blue: {
    bg: '#e5ebf0',
    border: '#bccad6',
    text: '#4b6584'
  },
  gray: {
    bg: '#efede8',
    border: '#d3cecf',
    text: '#6b645d'
  },

  // C4 Model Themes
  'c4-context': {
    bg: '#e3ebf2',
    border: '#b6cbd8',
    text: '#3d5f7a'
  },
  'c4-container': {
    bg: '#e4ebe8',
    border: '#b9cdc0',
    text: '#3d6b52'
  },
  'c4-component': {
    bg: '#f3ece0',
    border: '#e0cfb4',
    text: '#7d653d'
  },
  'c4-code': {
    bg: '#ededf0',
    border: '#cdcdd6',
    text: '#5e5a70'
  }
};
