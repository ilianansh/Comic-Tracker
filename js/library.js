// library.js — library page: folder panel, search/filters and the cover grid.
import { state } from './storage.js';
import { h, coverEl, starText } from './ui.js';
import { STATUSES, openEntryForm } from './entries.js';
import { renderFolderPanel } from './folders.js';

// Filters survive re-renders (e.g. after editing a status) but reset on reload.
const filters = { query: '', status: '' };

function matches(comic, folderId) {
  if (folderId === 'none' && comic.folderId) return false;
  if (folderId && folderId !== 'none' && comic.folderId !== folderId) return false;
  if (filters.status && comic.status !== filters.status) return false;
  const q = filters.query.trim().toLowerCase();
  return !q || [comic.title, comic.author, comic.type].some(v => (v || '').toLowerCase().includes(q));
}

function card(comic) {
  return h('a', { class: 'card', href: `#/comic/${comic.id}`, title: comic.title },
    coverEl(comic),
    h('div', { class: 'card-title' }, comic.title),
    h('div', { class: 'card-meta' },
      h('span', { class: `badge ${comic.status}` }, STATUSES[comic.status] || ''),
      comic.rating ? h('span', { class: 'stars-ro', 'aria-label': `${comic.rating} of 5 stars` }, starText(comic.rating)) : null,
      comic.favorite ? h('span', { class: 'heart', 'aria-label': 'Favorite' }, '♥') : null));
}

function emptyState(folderId) {
  const libraryEmpty = state.comics.length === 0;
  return h('div', { class: 'empty' },
    h('h2', {}, libraryEmpty ? 'Your library is empty, Yasmine :(' : 'No comics found'),
    h('p', {}, libraryEmpty ? 'Add your first comic to start tracking what you read!.' : 'Try a different search, status or folder!'),
    libraryEmpty ? h('button', { class: 'btn primary', type: 'button', onclick: () => openEntryForm(null, folderId) }, 'Add a comic') : null);
}

export function renderLibrary(root, folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  const title = folder ? folder.name : folderId === 'none' ? 'Unsorted' : 'All comics';
  const grid = h('div', { class: 'grid' });

  // Only the grid is redrawn while typing so the search box keeps focus.
  const refreshGrid = () => {
    const visible = state.comics.filter(c => matches(c, folderId));
    grid.replaceChildren(...(visible.length ? visible.map(card) : [emptyState(folderId)]));
  };

  const search = h('input', {
    class: 'input', type: 'search', placeholder: 'Search title, author or type', 'aria-label': 'Search', value: filters.query,
    oninput: e => { filters.query = e.target.value; refreshGrid(); }
  });
  const status = h('select', {
    class: 'input', 'aria-label': 'Filter by status', style: 'flex:0 0 auto;width:auto',
    onchange: e => { filters.status = e.target.value; refreshGrid(); }
  }, h('option', { value: '' }, 'Any status'),
    Object.entries(STATUSES).map(([v, l]) => h('option', { value: v, selected: filters.status === v }, l)));

  refreshGrid();
  root.append(h('div', { class: 'library' },
    renderFolderPanel(folderId),
    h('section', {},
      h('div', { class: 'row between', style: 'margin-bottom:1rem' },
        h('h1', {}, title),
        h('button', { class: 'btn primary', type: 'button', onclick: () => openEntryForm(null, folderId) }, '+ New entry')),
      h('div', { class: 'toolbar' }, search, status),
      grid)));
}
