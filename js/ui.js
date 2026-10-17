// ui.js — small DOM helpers shared by every view.
import { getImageUrl } from './storage.js';

/** h('div', {class:'x', onclick: fn}, child, ...) -> element. Text is inserted safely. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key in el) el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) if (child != null && child !== false) el.append(child);
  return el;
}

/** Cover box that shows a placeholder until (or instead of) the stored image. */
export function coverEl(comic, cls = 'cover') {
  const box = h('div', { class: cls }, h('span', { class: 'ph' }, comic.title || 'No cover'));
  getImageUrl(comic.coverId).then(url => {
    if (url) box.replaceChildren(h('img', { src: url, alt: comic.title, loading: 'lazy' }));
  });
  return box;
}

export const starText = n => '★'.repeat(n) + '☆'.repeat(5 - n);

/** Clickable 5-star control. Clicking the current value clears the rating. */
export function stars(value, onChange) {
  const wrap = h('div', { class: 'stars', role: 'group', 'aria-label': 'Rating' });
  const paint = v => [...wrap.children].forEach((b, i) => b.classList.toggle('on', i < v));
  for (let i = 1; i <= 5; i++) {
    wrap.append(h('button', {
      type: 'button', class: 'star', 'aria-label': `${i} star${i > 1 ? 's' : ''}`,
      onclick: () => { value = value === i ? 0 : i; paint(value); onChange(value); }
    }, '★'));
  }
  paint(value);
  return wrap;
}

export function openModal(title, body) {
  const dlg = h('dialog', { class: 'modal' },
    h('header', {}, h('h2', {}, title),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: () => dlg.close() }, '✕')),
    body);
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

/** Resolves true if the user confirms. */
export function confirmDialog(message, okLabel = 'Delete') {
  return new Promise(resolve => {
    let ok = false;
    const dlg = openModal('Please confirm', h('div', { class: 'form' },
      h('p', {}, message),
      h('div', { class: 'row end' },
        h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancel'),
        h('button', { class: 'btn danger', type: 'button', onclick: () => { ok = true; dlg.close(); } }, okLabel))));
    dlg.addEventListener('close', () => resolve(ok));
  });
}

/** Asks for one line of text. validate(text) returns an error string or ''. Resolves text or null. */
export function promptDialog(title, label, initial = '', validate = () => '') {
  return new Promise(resolve => {
    let result = null;
    const input = h('input', { class: 'input', name: 'value', value: initial, maxLength: 40, required: true });
    const error = h('p', { class: 'error', role: 'alert' });
    const form = h('form', { class: 'form' },
      h('label', { class: 'field' }, h('span', {}, label), input), error,
      h('div', { class: 'row end' },
        h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancel'),
        h('button', { class: 'btn primary', type: 'submit' }, 'Save')));
    const dlg = openModal(title, form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value.trim();
      error.textContent = text ? validate(text) : 'Please enter a name.';
      if (!error.textContent) { result = text; dlg.close(); }
    });
    dlg.addEventListener('close', () => resolve(result));
    input.select();
  });
}
