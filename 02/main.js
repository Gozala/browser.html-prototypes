const mounted = (element, isMounted) =>
  set(element, 'mounted@widget', isMounted);
const isMounted = (element) => !!element['mounted@widget'];

const cssTranslate = (x, y, z) => `translate3d(${x}px, ${y}px, ${z}px)`;

// Events
const Preview = (index) => ({type: 'preview', index: Number(index)});
const RestPreviews = (index) => ({type: 'rest-previews'});
const ChangeMode = (mode) => ({type: 'change-mode', mode});
const ChangeWebview = (index) => ({type: 'change-webview', index: Number(index)});
const EscKey = () => ({type: 'esc'});

const keyboardService = send => msg => {
  if (msg.type === 'keyup' && msg.keyCode === 27) {
    send(EscKey());
  }
};

const Win = (width, height) => model({width, height});

const Tabs = {};

Tabs.createTab = (webview, i) => {
  const favicon = document.createElement('div');
  favicon.className = 'favicon';

  const text = document.createTextNode(webview.title);

  const li = document.createElement('li');
  li.className = 'tab';
  li.dataset.webviewIndex = i;
  li.appendChild(favicon);
  li.appendChild(text);

  return li;
};

Tabs.writer = Writer((el, chosen, webviews) => {
  if (!isMounted(el)) {
    children(el, webviews.map(Tabs.createTab));
    mounted(el, true);
  }

  selectClass(el.children, 'tab-selected', chosen.cursor);
});

const overlayService = send => msg => {
  if (msg.type === 'mouseover' && msg.target.id === 'overlay') {
    send(RestPreviews());
  }
  else if (msg.type === 'mousedown' && msg.target.id === 'overlay') {
    send(ChangeWebview(-1));
  }
}

const Mode = (mode) => snapshot(mode);

Mode.update = (state, msg) =>
  msg.type === 'change-mode' && msg.mode !== value(state) ?
    Mode(msg.mode) :
  msg.type === 'esc' && value(state) === 'show-search' ?
    Mode('show-webview') :
  msg.type === 'esc' && value(state) === 'show-tabs' ?
    Mode('show-webview') :
  msg.type === 'esc' && value(state) === 'show-webview' ?
    Mode('show-tabs') :
  null;

Mode.writer = Writer((el, mode) => {
  toggleClass(el, 'mode-show-webview', mode.value === 'show-webview');
  toggleClass(el, 'mode-show-tabs', mode.value === 'show-tabs');
  toggleClass(el, 'mode-show-search', mode.value === 'show-search');
});

Mode.service = send => msg => {
  if (msg.type === 'mousedown' && msg.target.classList.contains('tabs-button')) {
    send(ChangeMode('show-tabs'));
  }

  if (msg.type === 'change-webview') {
    send(ChangeMode('show-webview'));
  }
}

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
  button.appendChild(document.createTextNode(length));

  header.appendChild(button);

  return header;
}

Windowbar.service = send => msg => {
  if (msg.type === 'mousedown' && msg.target === 'tabs-button') {
    send(ChangeMode('show-tabs'));
  };
}

const Webview = (url, title) => model({url, title, id: url});

Webview.create = (webview, i, webviews) => {
  const div = document.createElement('div');
  div.setAttribute('class', 'webview');

  div.appendChild(Windowbar.create(webview, webviews.length));

  const iframe = document.createElement('iframe');
  iframe.setAttribute('mozbrowser', 'mozbrowser');
  iframe.setAttribute('remote', 'remote');
  iframe.setAttribute('src', webview.url);

  div.appendChild(iframe);

  return div;
};

const Chosen = (cursor, selected, resting) =>
  model({cursor, selected, resting});

Chosen.update = (state, msg) =>
  msg.type === 'change-webview' && msg.index === -1 ?
    Chosen(state.cursor, state.cursor, true) :
  msg.type === 'change-webview' ?
    Chosen(msg.index, msg.index, true) :
  msg.type === 'preview' ?
    Chosen(msg.index, state.selected, false) :
  msg.type === 'rest-previews' ?
    Chosen(state.cursor, state.selected, true) :
  msg.type === 'esc' ?
    Chosen(state.selected, state.selected, true) :
  null;

const calcOffset = (height, i) => -1 * ((height * i) + (40 * i));

const Webviews = {};

Webviews.writer = Writer((el, chosen, webviews, mode, win) => {
  const i = chosen.cursor;
  if (!isMounted(el)) {
    children(el, webviews.map(Webview.create));
    el.style.transition = 'none';
    el.style.transform = cssTranslate(0, calcOffset(win.height, i), 0);
    mounted(el, true);
  }
  else if (mode.value === 'show-tabs' && chosen.resting) {
    el.style.transition = 'transform 600ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
    el.style.transform = cssTranslate(0, calcOffset(win.height, i), -800) + ' rotateY(30deg)';
  }
  else if (mode.value === 'show-tabs') {
    el.style.transition = 'transform 600ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
    el.style.transform = cssTranslate(0, calcOffset(win.height, i), -3000)  + ' rotateY(30deg)';
  }
  else {
    el.style.transition = 'transform 400ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
    el.style.transform = cssTranslate(0, calcOffset(win.height, i), 0);
  }
});

Webviews.service = send => msg => {
  if (msg.type === 'mousedown' && msg.target.dataset.webviewIndex) {
    send(ChangeWebview(msg.target.dataset.webviewIndex));
  }
  else if (msg.type === 'mouseover' && msg.target.dataset.webviewIndex) {
    send(Preview(msg.target.dataset.webviewIndex));
  }
}

const updateApp = (state, msg) => {
  const patch = Patch.flatten(
    Patch.branch(Mode.update, state, msg, 'mode'),
    Patch.branch(Chosen.update, state, msg, 'chosen')
  );

  return patch ? Change(patch, AnimationFrame.Schedule) : Change.none;
};

const writeTabs = Tabs.writer(document.getElementById('tabs'));
const writeMode = Mode.writer(document.querySelector('body'));
const writeWebviews = Webviews.writer(document.getElementById('webviews'));

const writeApp = (state) => {
  writeWebviews(state.chosen, state.webviews, state.mode, state.win);
  writeMode(state.mode);
  writeTabs(state.chosen, state.webviews);
};

const send = Bus((msg) => {
  webviews(msg);
  mode(msg);
  keyboard(msg);
  overlay(msg);
  windowbar(msg);
  animationframe(msg);
  app(msg);
});

const webviews = Webviews.service(send);
const mode = Mode.service(send);
const keyboard = keyboardService(send);
const overlay = overlayService(send);
const windowbar = Windowbar.service(send);
const animationframe = AnimationFrame.service(send);

const app = App({
  win: Win(window.innerWidth, window.innerHeight),
  mode: Mode('show-webview'),
  chosen: Chosen(0, 0, true),
  webviews: [
    Webview('http://breakingsmart.com/season-1/', 'How software is eating the world'),
    Webview('http://en.wikipedia.org', 'Wikipedia'),
    Webview('https://en.wikipedia.org/wiki/Maxima_clam#/media/File:2_Tridacna_gigas.jpg', 'Maxima Clam'),
    Webview('http://breakingsmart.com/season-1/the-future-in-the-rear-view-mirror/', 'The future in a rear-view mirror')
  ]
}, updateApp, writeApp, send);

send(AnimationFrame.Schedule);

window.addEventListener('keyup',
  event => send({type: 'keyup', keyCode: event.keyCode}));
window.addEventListener('mousedown', send);
window.addEventListener('mouseover', send);
window.addEventListener('mouseout', send);
