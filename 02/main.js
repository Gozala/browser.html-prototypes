const mounted = (element, isMounted) =>
  set(element, 'mounted@widget', isMounted);
const isMounted = (element) => !!element['mounted@widget'];

const cssGimbal = (x, y, z, rx, ry, rz) =>
  `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;

const cssUrl = (url) => url && url.length ? `url(${url})` : 'none';

const isEsc = (msg) =>
  msg.type === 'keyup' && msg.keyCode === 27;

const isTabButtonMousedown = (msg) =>
  msg.type === 'mousedown' && msg.target.classList.contains('tabs-button');

const isOverlayMousedown = (msg) =>
  msg.type === 'mousedown' && msg.target.id === 'overlay';

const isOverlayMouseover = (msg) =>
  msg.type === 'mouseover' && msg.target.id === 'overlay';

const isOverlayMouseout = (msg) =>
  msg.type === 'mouseout' && msg.target.id === 'overlay';

const getWebviewChangeIndex = (msg) =>
  msg.target && msg.target.dataset && msg.target.dataset.webviewIndex != null ?
    Number(msg.target.dataset.webviewIndex) : -1;

const isClickWebviewChange = (msg) =>
  msg.type === 'mousedown' && getWebviewChangeIndex(msg) !== -1;

const bound = (n, min, max) => Math.min(Math.max(n, min), max);

// Determine progress of timed action
const progress = (start, now, duration) =>
  bound((now - start) / duration, 0, 1);

const Win = (width, height) => model({width, height});

const Tabs = {};

Tabs.createTab = (webview, i) => {
  const favicon = document.createElement('div');
  favicon.className = 'favicon';
  favicon.style.backgroundImage = cssUrl(webview.favicon);

  const text = document.createTextNode(webview.title);

  const li = document.createElement('li');
  li.className = 'tab';
  li.dataset.webviewIndex = i;
  li.appendChild(favicon);
  li.appendChild(text);

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
  (isOverlayMouseover(msg) &&
  Mode.is(state, 'show-tabs') &&
  progress(state.created, performance.now(), 400) === 1) ?
    Mode('show-tabs-resting') :
  isOverlayMouseout(msg) && Mode.is(state, 'show-tabs-resting') ?
    Mode('show-tabs') :
  isTabButtonMousedown(msg) ?
    Mode('show-tabs') :
  isClickWebviewChange(msg) ?
    Mode('show-webview') :
  isOverlayMousedown(msg) && Mode.is(state, 'show-tabs') ?
    Mode('show-webview') :
  isOverlayMousedown(msg) && Mode.is(state, 'show-tabs-resting') ?
    Mode('show-webview') :
  isEsc(msg) && Mode.is(state, 'show-tabs') ?
    Mode('show-webview') :
  isEsc(msg) && Mode.is(state, 'show-tabs-resting') ?
    Mode('show-webview') :
  isEsc(msg) && Mode.is(state, 'show-webview') ?
    Mode('show-tabs') :
  state;

Mode.write = (el, mode) => {
  toggleClass(el, 'mode-show-webview', mode === 'show-webview');
  toggleClass(el, 'mode-show-tabs', mode === 'show-tabs');
  toggleClass(el, 'mode-show-tabs-resting', mode === 'show-tabs-resting');
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

  const iframe = document.createElement('iframe');
  iframe.setAttribute('class', 'iframe');
  iframe.setAttribute('mozbrowser', 'mozbrowser');
  iframe.setAttribute('remote', 'remote');
  iframe.setAttribute('src', webview.url);
  // iframe.style.backgroundImage = cssUrl(webview.url);

  div.appendChild(iframe);

  return div;
};

const Chosen = (cursor, selected, resting) =>
  model({cursor, selected, resting});

Chosen.update = (state, msg) =>
  isOverlayMousedown(msg) ?
    Chosen(state.cursor, state.cursor) :
  isClickWebviewChange(msg) ?
    Chosen(getWebviewChangeIndex(msg), getWebviewChangeIndex(msg)) :
  msg.type === 'mouseover' && getWebviewChangeIndex(msg) !== -1 ?
    Chosen(getWebviewChangeIndex(msg), state.selected) :
  isEsc(msg) ?
    Chosen(state.selected, state.selected) :
  state;

const calcOffset = (height, i) => -1 * ((height * i) + (40 * i));

const Webviews = {};

Webviews.mount = (el, webviews, i, height) => {
  children(el, webviews.map(Webview.create));
  el.style.transition = 'none';
  el.style.transform = cssGimbal(0, calcOffset(height, i), 0, 0, 0, 0);
}

Webviews.writeResting = (el, i, width, height) => {
  el.style.transition = 'transform 600ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
  el.style.transform = cssGimbal(0, calcOffset(height, i), -800, 0, 30, 0);
}

Webviews.writeActive = (el, i, width, height) => {
  el.style.transition = 'transform 600ms cubic-bezier(0.250, 0.460, 0.450, 0.940';
  el.style.transform = cssGimbal(0, calcOffset(height, i), -3000, 0, 30, 0);
}

Webviews.writeShow = (el, i, height) => {
  el.style.transition = 'transform 400ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
  el.style.transform = cssGimbal(0, calcOffset(height, i), 0, 0, 0, 0);
}

const State = {};

State.update = (state, msg) => {
  state.mode = Mode.update(state.mode, msg);
  state.chosen = Chosen.update(state.chosen, msg);
  return state;
};

const tabsEl = document.getElementById('tabs');
const bodyEl = document.querySelector('body');
const webviewsEl = document.getElementById('webviews');

State.write = (state) => {
  sync(Mode.write, modified(state.mode), bodyEl, state.mode.value);

  mount(Webviews.mount, webviewsEl,
    state.webviews, state.chosen.selected, state.win.height);

  if (state.mode.value === 'show-tabs-resting') {
    sync(Webviews.writeResting,
      newest(state.mode, state.chosen),
      webviewsEl, state.chosen.cursor, state.win.width, state.win.height);
  }
  else if (state.mode.value === 'show-tabs') {
    sync(Webviews.writeActive,
      newest(state.mode, state.chosen),
      webviewsEl, state.chosen.cursor, state.win.width, state.win.height);
  }
  else {
    sync(Webviews.writeShow,
      newest(state.mode, state.chosen),
      webviewsEl, state.chosen.selected, state.win.height);
  }

  sync(Tabs.writeSelect, modified(state.chosen), tabsEl, state.chosen.cursor);
  mount(Tabs.mount, tabsEl, state.webviews, state.chosen.selected);
};

const app = App({
  win: Win(window.innerWidth, window.innerHeight),
  mode: Mode('show-webview'),
  chosen: Chosen(0, 0, true),
  webviews: [
    Webview('http://qz.com/336510/lego-just-unveiled-its-3000-piece-helicarrier-from-the-avengers/', '', 'Lego Unveils Avengers set - Quartz', '#fff'),
    Webview('http://crane-brothers.com/magazine/in-conversation', '../demo/rendi.png', 'Crane Brothers', '#cfebec'),
    Webview('http://www.bokicabo.com/en/04/', '../demo/hardgraft.png', 'BokicaBo', '#d9aa16'),
    Webview('http://www.bedstockfest.com', '../demo/humanco.png', 'Bedstock - MyMusic'),
  ]
}, State.update, State.write);

App.loop(app.render);

window.addEventListener('keyup', app.send);
window.addEventListener('mousedown', app.send);
window.addEventListener('mouseover', app.send);
window.addEventListener('mouseout', app.send);
