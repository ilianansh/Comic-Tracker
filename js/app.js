// app.js — entry point: hash router, quick-action button, re-render on data changes.
import { state } from './storage.js';
import { h } from './ui.js';
import { renderLibrary } from './library.js';
import { renderDetail, openEntryForm } from './entries.js';
import { renderProfile } from './profile.js';
import { createFolder } from './folders.js';

const root = document.getElementById('app');

/** Routes: #/ , #/folder/<id|none> , #/comic/<id> , #/profile */
function render() {
  const [, route = '', param] = location.hash.slice(1).split('/');
  let active = 'library';
  root.replaceChildren();
  if (route === 'profile') { active = 'profile'; renderProfile(root); }
  else if (route === 'comic' && state.comics.some(c => c.id === param)) renderDetail(root, param);
  else if (route === 'folder' && (param === 'none' || state.folders.some(f => f.id === param))) renderLibrary(root, param);
  else renderLibrary(root, null);
  document.querySelectorAll('[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === active));
}

function buildFab() {
  const close = () => { menu.hidden = true; toggle.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
  const action = (label, fn) => h('button', { class: 'btn', type: 'button', onclick: () => { close(); fn(); } }, label);
  const menu = h('div', { class: 'fab-menu', hidden: true },
    action('New Entry', () => openEntryForm()),
    action('New Folder', createFolder),
    action('View Profile', () => { location.hash = '#/profile'; }));
  const toggle = h('button', {
    class: 'fab', type: 'button', 'aria-label': 'Quick actions', 'aria-expanded': 'false',
    onclick: () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      toggle.classList.toggle('open', opening);
      toggle.setAttribute('aria-expanded', opening);
    }
  }, '+');
  document.getElementById('fab-root').append(menu, toggle);
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
document.addEventListener('state-changed', render);
buildFab();
render();
