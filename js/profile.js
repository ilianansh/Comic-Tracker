// profile.js — profile page: avatar, stats, Four Faves and Currently Reading.
import { state, commit, saveImage, deleteImage, getImageUrl } from './storage.js';
import { h, coverEl, openModal } from './ui.js';
import { findComic } from './entries.js';

const MAX_FAVES = 4;

const coverLink = comic => h('a', { href: `#/comic/${comic.id}`, title: comic.title }, coverEl(comic));
const countStatus = status => state.comics.filter(c => c.status === status).length;
const stat = (value, label) => h('div', { class: 'stat' }, h('strong', {}, value), label);

function openProfileForm() {
  const { profile } = state;
  const err = h('p', { class: 'error', role: 'alert' });
  const file = h('input', { class: 'input', type: 'file', accept: 'image/*' });
  const name = h('input', { class: 'input', required: true, maxLength: 40, value: profile.name });
  const form = h('form', { class: 'form' },
    h('label', { class: 'field' }, h('span', {}, 'Display name'), name),
    h('label', { class: 'field' }, h('span', {}, 'Profile picture'), file),
    err,
    h('div', { class: 'row end' },
      h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancel'),
      h('button', { class: 'btn primary', type: 'submit' }, 'Save')));
  const dlg = openModal('Edit profile', form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const picked = file.files[0];
    if (!name.value.trim()) { err.textContent = 'Display name is required.'; return; }
    if (picked && !picked.type.startsWith('image/')) { err.textContent = 'The picture must be an image file.'; return; }
    if (picked) {
      const newId = await saveImage(picked);
      await deleteImage(profile.pfpId);
      profile.pfpId = newId;
    }
    profile.name = name.value.trim();
    commit();
    dlg.close();
  });
}

/** Lets the user pick up to four library comics, independent of rating. */
function openFavePicker() {
  const selected = state.profile.faves.filter(id => findComic(id));
  const counter = h('p', { class: 'muted' });
  const updateCounter = () => { counter.textContent = `${selected.length} of ${MAX_FAVES} selected`; };
  const options = state.comics.map(comic => {
    const button = h('button', {
      class: 'pick' + (selected.includes(comic.id) ? ' selected' : ''), type: 'button', 'aria-pressed': selected.includes(comic.id),
      onclick: () => {
        const at = selected.indexOf(comic.id);
        if (at >= 0) selected.splice(at, 1);
        else if (selected.length < MAX_FAVES) selected.push(comic.id);
        else { counter.textContent = `You can pick at most ${MAX_FAVES}. Deselect one first.`; return; }
        button.classList.toggle('selected', at < 0);
        button.setAttribute('aria-pressed', at < 0);
        updateCounter();
      }
    }, coverEl(comic), comic.title);
    return button;
  });
  updateCounter();
  const dlg = openModal('Choose your Four Faves', h('div', { class: 'form' },
    state.comics.length ? h('div', { class: 'pick-grid' }, options) : h('p', { class: 'muted' }, 'Add comics to your library first.'),
    counter,
    h('div', { class: 'row end' },
      h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancel'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { state.profile.faves = selected; commit(); dlg.close(); } }, 'Save'))));
}

export function renderProfile(root) {
  const { profile } = state;
  const avatar = h('div', { class: 'avatar' }, profile.name.charAt(0).toUpperCase());
  getImageUrl(profile.pfpId).then(url => url && avatar.replaceChildren(h('img', { src: url, alt: 'Profile picture' })));

  const faves = profile.faves.map(findComic).filter(Boolean);
  const slots = Array.from({ length: MAX_FAVES }, (_, i) => faves[i]
    ? coverLink(faves[i])
    : h('button', { class: 'slot-empty', type: 'button', 'aria-label': 'Choose a favorite', onclick: openFavePicker }, '+'));
  const reading = state.comics.filter(c => c.status === 'reading');

  root.append(h('div', { class: 'profile' },
    h('div', { class: 'profile-head' }, avatar,
      h('div', {}, h('h1', {}, profile.name), h('button', { class: 'btn small', type: 'button', onclick: openProfileForm }, 'Edit profile')),
      h('div', { class: 'stats' }, stat(countStatus('read'), 'Total Read'), stat(countStatus('want'), 'Want to Read'))),
    h('section', { class: 'section' },
      h('div', { class: 'row' }, h('h2', {}, 'Four Faves'),
        h('button', { class: 'btn small', type: 'button', onclick: openFavePicker }, 'Change')),
      h('div', { class: 'faves' }, slots)),
    h('section', { class: 'section' },
      h('div', { class: 'row' }, h('h2', {}, 'Currently Reading')),
      reading.length
        ? h('div', { class: 'grid' }, reading.map(coverLink))
        : h('p', { class: 'muted' }, 'Nothing in progress. Set a comic to "Currently Reading" and it will show up here.'))));
}
