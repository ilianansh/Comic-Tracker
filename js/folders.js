// folders.js — folder data operations and the folder side panel.
import { state, commit, uid } from './storage.js';
import { h, confirmDialog, promptDialog } from './ui.js';

const nameTaken = (name, ignoreId) =>
  state.folders.some(f => f.id !== ignoreId && f.name.toLowerCase() === name.toLowerCase());

export async function createFolder() {
  const name = await promptDialog('New folder', 'Folder name', '',
    n => (nameTaken(n) ? 'A folder with that name already exists.' : ''));
  if (!name) return;
  state.folders.push({ id: uid(), name });
  commit();
}

async function renameFolder(folder) {
  const name = await promptDialog('Rename folder', 'Folder name', folder.name,
    n => (nameTaken(n, folder.id) ? 'A folder with that name already exists.' : ''));
  if (!name) return;
  folder.name = name;
  commit();
}

/** Deleting a folder never deletes comics: they move to "Unsorted". */
async function deleteFolder(folder) {
  const count = state.comics.filter(c => c.folderId === folder.id).length;
  const ok = await confirmDialog(
    `Delete the folder "${folder.name}"? Its ${count} comic(s) will be kept and moved to Unsorted.`);
  if (!ok) return;
  state.comics.forEach(c => { if (c.folderId === folder.id) c.folderId = null; });
  state.folders = state.folders.filter(f => f.id !== folder.id);
  if (location.hash === `#/folder/${folder.id}`) location.hash = '#/';
  commit();
}

/** activeId: null (all), 'none' (unsorted) or a folder id. */
export function renderFolderPanel(activeId) {
  const link = (href, label, n, active) =>
    h('a', { class: 'folder-link' + (active ? ' active' : ''), href }, h('span', {}, label), h('small', {}, n));
  const rows = state.folders.map(f => h('div', { class: 'folder-row' },
    link(`#/folder/${f.id}`, f.name, state.comics.filter(c => c.folderId === f.id).length, activeId === f.id),
    h('button', { class: 'icon-btn', type: 'button', title: 'Rename', 'aria-label': `Rename ${f.name}`, onclick: () => renameFolder(f) }, '✎'),
    h('button', { class: 'icon-btn', type: 'button', title: 'Delete', 'aria-label': `Delete ${f.name}`, onclick: () => deleteFolder(f) }, '✕')));
  return h('aside', { class: 'folder-panel', 'aria-label': 'Folders' },
    h('h2', {}, 'Folders'),
    link('#/', 'All comics', state.comics.length, activeId == null),
    rows,
    link('#/folder/none', 'Unsorted', state.comics.filter(c => !c.folderId).length, activeId === 'none'),
    h('button', { class: 'btn small', type: 'button', onclick: createFolder }, '+ New folder'));
}
