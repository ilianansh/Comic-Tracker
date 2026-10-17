// entries.js — comic data operations, the add/edit form and the detail view.
import { state, commit, uid, saveImage, deleteImage } from './storage.js';
import { h, coverEl, stars, openModal, confirmDialog } from './ui.js';

export const STATUSES = { want: 'Want to Read', reading: 'Currently Reading', read: 'Read' };
const MAX_COVER_BYTES = 10 * 1024 * 1024;

export const findComic = id => state.comics.find(c => c.id === id);

async function saveComic(data, file, existing) {
  let coverId = existing?.coverId ?? null;
  if (file) {
    const newId = await saveImage(file);
    await deleteImage(coverId); // replace old cover
    coverId = newId;
  }
  if (existing) Object.assign(existing, data, { coverId });
  else state.comics.unshift({ id: uid(), createdAt: Date.now(), coverId, ...data });
  commit();
}

async function deleteComic(comic) {
  if (!await confirmDialog(`Delete "${comic.title}" permanently? This cannot be undone.`)) return;
  await deleteImage(comic.coverId);
  state.comics = state.comics.filter(c => c.id !== comic.id);
  state.profile.faves = state.profile.faves.filter(id => id !== comic.id); // keep profile consistent
  location.hash = '#/';
  commit();
}

/** Add form (comic = null) or edit form. defaultFolder pre-selects a folder for new entries. */
export function openEntryForm(comic = null, defaultFolder = null) {
  let rating = comic?.rating || 0;
  const err = h('p', { class: 'error', role: 'alert' });
  const preview = comic ? coverEl(comic, 'cover small') : h('div', { class: 'cover small' }, h('span', { class: 'ph' }, 'No cover'));
  const fileInput = h('input', {
    type: 'file', name: 'cover', accept: 'image/*', class: 'input',
    onchange: () => {
      const file = fileInput.files[0];
      if (file) preview.replaceChildren(h('img', { src: URL.createObjectURL(file), alt: 'Cover preview' }));
    }
  });
  const field = (label, input) => h('label', { class: 'field' }, h('span', {}, label), input);
  const folderId = comic ? comic.folderId : (defaultFolder !== 'none' ? defaultFolder : null);

  const form = h('form', { class: 'form' },
    h('div', { class: 'row' }, preview, field('Cover image', fileInput)),
    field('Title *', h('input', { class: 'input', name: 'title', required: true, maxLength: 150, value: comic?.title ?? '' })),
    h('div', { class: 'two-col' },
      field('Author', h('input', { class: 'input', name: 'author', maxLength: 100, value: comic?.author ?? '' })),
      field('Release date', h('input', { class: 'input', name: 'releaseDate', type: 'date', value: comic?.releaseDate ?? '' }))),
    h('div', { class: 'two-col' },
      field('Comic type', h('input', { class: 'input', name: 'type', maxLength: 40, placeholder: 'Manga, graphic novel…', value: comic?.type ?? '' })),
      field('Reading status', h('select', { class: 'input', name: 'status' },
        Object.entries(STATUSES).map(([v, l]) => h('option', { value: v, selected: (comic?.status ?? 'want') === v }, l))))),
    field('Folder', h('select', { class: 'input', name: 'folderId' },
      h('option', { value: '', selected: !folderId }, 'Unsorted'),
      state.folders.map(f => h('option', { value: f.id, selected: f.id === folderId }, f.name)))),
    h('div', { class: 'field' }, h('span', {}, 'Rating'), stars(rating, v => { rating = v; })),
    field('Personal review', h('textarea', { class: 'input', name: 'review', rows: 4, maxLength: 5000, value: comic?.review ?? '' })),
    h('label', { class: 'row' }, h('input', { type: 'checkbox', name: 'favorite', checked: !!comic?.favorite }), 'Mark as favorite'),
    err,
    h('div', { class: 'row end' },
      h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancel'),
      h('button', { class: 'btn primary', type: 'submit' }, comic ? 'Save changes' : 'Add comic')));

  const dlg = openModal(comic ? 'Edit comic' : 'New entry', form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const title = fd.get('title').trim();
    const file = fileInput.files[0];
    if (!title) { err.textContent = 'Title is required.'; return; }
    if (file && !file.type.startsWith('image/')) { err.textContent = 'The cover must be an image file.'; return; }
    if (file && file.size > MAX_COVER_BYTES) { err.textContent = 'The cover must be smaller than 10 MB.'; return; }
    await saveComic({
      title, rating,
      author: fd.get('author').trim(),
      releaseDate: fd.get('releaseDate'),
      type: fd.get('type').trim(),
      status: fd.get('status'),
      folderId: fd.get('folderId') || null,
      review: fd.get('review').trim(),
      favorite: fd.has('favorite')
    }, file, comic);
    dlg.close();
  });
}

const formatDate = iso => {
  const date = new Date(iso + 'T00:00:00');
  return isNaN(date) ? iso : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

export function renderDetail(root, id) {
  const comic = findComic(id);
  const folder = state.folders.find(f => f.id === comic.folderId);
  const menu = h('details', { class: 'menu' },
    h('summary', { 'aria-label': 'More actions' }, '⋮'),
    h('div', { class: 'menu-list' },
      h('button', { type: 'button', onclick: () => { menu.open = false; openEntryForm(comic); } }, 'Edit'),
      h('button', { type: 'button', class: 'danger-text', onclick: () => { menu.open = false; deleteComic(comic); } }, 'Delete')));

  const rows = [
    ['Author', comic.author],
    ['Released', comic.releaseDate && formatDate(comic.releaseDate)],
    ['Type', comic.type],
    ['Folder', folder ? h('a', { href: `#/folder/${folder.id}` }, folder.name) : 'Unsorted']
  ].filter(([, v]) => v).flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]);

  root.append(h('article', { class: 'detail' },
    h('a', { class: 'back', href: '#/' }, '← Library'),
    h('div', { class: 'detail-body' },
      coverEl(comic, 'cover large'),
      h('div', { class: 'detail-info' },
        h('div', { class: 'row between' }, h('h1', {}, comic.title), menu),
        h('dl', { class: 'meta' }, rows),
        h('div', { class: 'row' },
          h('select', { class: 'input', style: 'width:auto', 'aria-label': 'Reading status', onchange: e => { comic.status = e.target.value; commit(); } },
            Object.entries(STATUSES).map(([v, l]) => h('option', { value: v, selected: comic.status === v }, l))),
          stars(comic.rating || 0, v => { comic.rating = v; commit(); }),
          h('button', { class: 'btn' + (comic.favorite ? ' pink-on' : ''), type: 'button', onclick: () => { comic.favorite = !comic.favorite; commit(); } },
            comic.favorite ? '♥ Favorite' : '♡ Mark favorite')),
        comic.review ? h('p', { class: 'review' }, comic.review) : h('p', { class: 'muted' }, 'No review yet. Use the ⋮ menu to edit this entry.')))));
}
