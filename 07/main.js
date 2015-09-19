const cssGimbal = (x, y, z, rx, ry, rz) =>
  `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;

const cssUrl = (url) => url && url.length ? `url(${url})` : 'none';

// Checks for update functions

const isEsc = (msg) =>
  msg.type === 'keyup' && msg.keyCode === 27;

const isTabButtonMousedown = (msg) =>
  msg.type === 'mousedown' && msg.target.classList.contains('tabs-button');

const isEventOnId = (msg, type, id) =>
  msg.type === type && msg.target.id === id;

const isOverlayMousedown = (msg) =>
  isEventOnId(msg, 'mousedown', 'overlay');

const isOverlayMouseover = (msg) =>
  isEventOnId(msg, 'mouseover', 'overlay');

const isOverlayMouseout = (msg) =>
  isEventOnId(msg, 'mouseout', 'overlay');

const getWebviewChangeIndex = (msg) =>
  msg.target && msg.target.dataset && msg.target.dataset.webviewIndex != null ?
    Number(msg.target.dataset.webviewIndex) : -1;

const isClickWebviewChange = (msg) =>
  msg.type === 'mousedown' && getWebviewChangeIndex(msg) !== -1;

const bound = (n, min, max) => Math.min(Math.max(n, min), max);

// Determine progress of timed action
const progress = (start, now, duration) =>
  bound((now - start) / duration, 0, 1);

// Convert a from-left/from-right dimension into a from-center dimension.
const Coords = (x, y, width, height) => model({
  x: Coords.calc(x, width),
  y: Coords.calc(y, height),
  width,
  height
});

Coords.calc = (distance, length) => (distance + (-1 * (length / 2)));

Coords.update = (state, msg) =>
  msg.type === 'mousemove' ?
    Coords(msg.clientX, msg.clientY, state.width, state.height) :
  state;

const Tabs = {};

Tabs.createTab = (webview, i) => {
  const favicon = document.createElement('div');
  favicon.className = 'favicon';
  favicon.style.backgroundImage = cssUrl(webview.favicon);

  const text = document.createTextNode(webview.title);

  const div = document.createElement('div');
  div.className = 'tab-content';
  div.appendChild(favicon);
  div.appendChild(text);

  const bookmark = document.createElement('div');
  bookmark.className = 'icon-bookmark';

  const close = document.createElement('div');
  close.className = 'icon-close';

  const li = document.createElement('li');
  li.className = 'tab';
  li.dataset.webviewIndex = i;
  li.appendChild(div);
  li.appendChild(bookmark);
  li.appendChild(close);

  return li;
};

Tabs.writeSelect = (el, i) => {
  selectClass(el.children, 'tab-selected', i);  
}

Tabs.mount = (el, webviews, selected) => {
  children(el, webviews.map(Tabs.createTab));
  Tabs.writeSelect(el, selected);
};

const Mode = (mode) => model({value: mode, created: performance.now()});

Mode.is = (state, mode) => state.value === mode;

Mode.update = (state, msg) =>
  isTabButtonMousedown(msg) ?
    Mode('show-tabs') :
  isClickWebviewChange(msg) ?
    Mode('show-webview') :
  isOverlayMousedown(msg) && Mode.is(state, 'show-tabs') ?
    Mode('show-webview') :
  isEsc(msg) && Mode.is(state, 'show-tabs') ?
    Mode('show-webview') :
  isEsc(msg) && Mode.is(state, 'show-webview') ?
    Mode('show-tabs') :
  state;

Mode.write = (el, mode) => {
  toggleClass(el, 'mode-show-webview', mode === 'show-webview');
  toggleClass(el, 'mode-show-tabs', mode === 'show-tabs');
  toggleClass(el, 'mode-show-search', mode === 'show-search');
};

const Windowbar = {};
Windowbar.create = (webview, length) => {
  const header = document.createElement('header');
  header.setAttribute('class', 'windowbar');

  const location = document.createElement('div');
  location.setAttribute('class', 'location');

  const text = document.createTextNode(webview.title);
  location.appendChild(text);

  header.appendChild(location);

  const button = document.createElement('div');
  button.setAttribute('class', 'tabs-button');

  header.appendChild(button);

  return header;
}

const Chosen = (cursor, selected) =>
  model({cursor, selected});

Chosen.update = (state, msg) =>
  isOverlayMousedown(msg) ?
    Chosen(state.cursor, state.cursor) :
  msg.type === 'mouseover' && getWebviewChangeIndex(msg) !== -1 ?
    Chosen(getWebviewChangeIndex(msg), state.selected) :
  isClickWebviewChange(msg) ?
    Chosen(getWebviewChangeIndex(msg), getWebviewChangeIndex(msg)) :
  isEsc(msg) ?
    Chosen(state.selected, state.selected) :
  state;

const Webview = (url, favicon, title, color) => model({
  url, favicon, title,
  id: url,
  color: (color || '#fff')
});

Webview.create = (webview, i, webviews) => {
  const div = document.createElement('div');
  div.setAttribute('class', 'webview');
  div.style.backgroundColor = webview.color;

  div.appendChild(Windowbar.create(webview, webviews.length));

  const iframe = document.createElement('div');
  iframe.setAttribute('class', 'iframe');
  // iframe.setAttribute('mozbrowser', 'mozbrowser');
  // iframe.setAttribute('remote', 'remote');
  iframe.style.backgroundImage = cssUrl(webview.url);

  div.appendChild(iframe);

  return div;
};

const Webviews = {};

Webviews.calcOffset = (height, i) => -1 * ((height * i) + (200 * i));

Webviews.mount = (el, webviews, selected) => {
  children(el, webviews.map(Webview.create));
  selectClass(el.children, 'webview-selected', selected);
};

Webviews.showTabs = (el, selected, cursor, height) => {
  selectClass(el.children, 'webview-selected', cursor);
  el.style.transition = 'transform 400ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';

  const offset = Webviews.calcOffset(height, cursor);

  el.style.transform = cssGimbal(0, offset, -2000, 0, 0, 0);
  Array.forEach(el.children, (child, i) => {
    // (i - cursor) * 5
    child.style.transform =
      i !== cursor ?
        cssGimbal(0, 0, -3000, 0, 20, 0) :
      cssGimbal(0, 0, -1500, 0, 20, 0);
  });
};

Webviews.showWebview = (el, selected, height) => {
  const offset = Webviews.calcOffset(height, selected);
  selectClass(el.children, 'webview-selected', selected);
  el.style.transition = 'transform 400ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
  el.style.transform = cssGimbal(0, offset, 0, 0, 0, 0);
  el.children[selected].style.transform = 'none';
};

const Frame = (time, frame) => ({
  now: performance.now(),
  then: time,
  frame: (frame + 1)
});

const setFrame = (state, msg) => {
  if (msg.type === 'animationframe') {
    state.then = now;
    state.now = performance.now();
    state.frame = (frame + 1);
  }
  return state;
}

const State = {};

State.update = (state, msg) => {
  setFrame(state, msg);
  state.coords = Coords.update(state.coords, msg);
  state.mode = Mode.update(state.mode, msg);
  state.chosen = Chosen.update(state.chosen, msg);
  return state;
};

const bodyEl = document.querySelector('body');
const webviewsEl = document.querySelector('#webviews');
const tabsEl = document.querySelector('#tabs');
const sidebarEl = document.querySelector('#sidebar');

State.write = (state, dt, frame) => {
  sync(Mode.write, modified(state.mode), bodyEl, state.mode.value);

  mount(Webviews.mount, webviewsEl, state.webviews, state.chosen.selected);

  if (state.mode.value === 'show-tabs') {
    sync(Webviews.showTabs,
      newest(state.mode, state.chosen),
      webviewsEl, state.chosen.selected, state.chosen.cursor,
      state.coords.height);
  }
  else if (state.mode.value === 'show-webview') {
    sync(Webviews.showWebview,
      newest(state.mode, state.chosen),
      webviewsEl, state.chosen.selected, state.coords.height);
  }

  sync(Tabs.writeSelect, modified(state.chosen), tabsEl, state.chosen.cursor);
  mount(Tabs.mount, tabsEl, state.webviews, state.chosen.selected);
};

const app = App({
  coords: Coords(0, 0, window.innerWidth, window.innerHeight),
  mode: Mode('show-webview'),
  chosen: Chosen(0, 0),
  webviews: [
    Webview('../demo/04.png', '../demo/rendi.png', 'Rendi'),
    Webview('../demo/01.png', '../demo/hardgraft.png', 'Hard Graft', '#dadbd2'),
    Webview('../demo/03.png', '../demo/humanco.png', 'Human Co'),
    Webview('../demo/02.png', '', 'House Paperweight', '#eee'),
  ]
}, State.update, State.write);

App.loop(app.render);

window.addEventListener('keyup', app.send);
window.addEventListener('mousemove', app.send);
window.addEventListener('mousedown', app.send);
window.addEventListener('mouseover', app.send);
window.addEventListener('mouseout', app.send);
