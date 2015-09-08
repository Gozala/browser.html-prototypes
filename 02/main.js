const mounted = (element, isMounted) =>
  set(element, 'mounted@widget', isMounted);
const isMounted = (element) => !!element['mounted@widget'];

const cssTranslate = (x, y, z) => `translate3d(${x}px, ${y}px, ${z}px)`;
const log = (m) => console.log(m);

// Events
const Preview = (index) => ({type: 'preview', index: Number(index)});
const RestPreviews = (index) => ({type: 'rest-previews'});
const ChangeMode = (mode) => ({type: 'change-mode', mode});
const ChangeWebview = (index) => ({type: 'change-webview', index: Number(index)});
const EscKey = () => ({type: 'esc'});

const keyboardService = (msg, send) => {
  if (msg.type === 'keyup' && msg.keyCode === 27) {
    send(EscKey());
  }
};

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

Tabs.write = (el, chosen, items) => {
  if (!isMounted(el)) {
    children(el, items.map(Tabs.createTab));
    mounted(el, true);
  }

  selectClass(el.children, 'tab-selected', chosen.cursor);
};

const overlayService = (msg, send) => {
  if (msg.type === 'mouseover' && msg.target.id === 'overlay') {
    send(RestPreviews());
  }
  else if (msg.type === 'mousedown' && msg.target.id === 'overlay') {
    send(ChangeWebview(-1));
  }
}

const Mode = (mode) => snapshot({value: mode});

Mode.update = (state, msg) =>
  msg.type === 'change-mode' && msg.mode !== state.curr ?
    Mode(msg.mode) :
  msg.type === 'esc' && state.value === 'show-search' ?
    Mode('show-webview') :
  msg.type === 'esc' && state.value === 'show-tabs' ?
    Mode('show-webview') :
  msg.type === 'esc' && state.value === 'show-webview' ?
    Mode('show-tabs') :
  state;

Mode.write = (el, state) => {
  toggleClass(el, 'mode-show-webview', state.value === 'show-webview');
  toggleClass(el, 'mode-show-tabs', state.value === 'show-tabs');
  toggleClass(el, 'mode-show-search', state.value === 'show-search');
}

Mode.service = (msg, send) => {
  if (msg.type === 'mousedown' && msg.target.id === 'tabs-button') {
    send(ChangeMode('show-tabs'));
  }

  if (msg.type === 'change-webview') {
    send(ChangeMode('show-webview'));
  }
}

const Windowbar = {};
Windowbar.create = (webview) => {
  const header = document.createElement('header');
  header.setAttribute('class', 'windowbar');

  const location = document.createElement('div');
  location.setAttribute('class', 'location');

  const text = document.createTextNode(webview.title);
  location.appendChild(text);

  header.appendChild(location);

  return header;
}

const Webview = (url, title) => touch({url, title, id: url});

Webview.create = (webview, i) => {
  const div = document.createElement('div');
  div.setAttribute('class', 'webview');

  div.appendChild(Windowbar.create(webview));

  const iframe = document.createElement('iframe');
  iframe.setAttribute('mozbrowser', 'mozbrowser');
  iframe.setAttribute('remote', 'remote');
  iframe.setAttribute('src', webview.url);

  div.appendChild(iframe);

  return div;
};

const Chosen = (cursor, selected, resting) =>
  snapshot({cursor, selected, resting});

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
  state;

const Webviews = (items) => snapshot({items});

Webviews.write = (el, chosen, items, mode) => {
  const i = chosen.cursor;

  if (!isMounted(el)) {
    children(el, items.map(Webview.create));
    const offset = (-1 * el.children[i].offsetTop);
    el.style.transition = 'none';
    el.style.transform = cssTranslate(0, offset, 0);
    mounted(el, true);
  }
  else if (mode === 'show-tabs' && chosen.resting) {
    // @TODO figure out a way to do this that doesn't trigger reflow.
    // const rect = webviews.children[i].getBoundingClientRect();
    // @TODO this doesn't work if I haven't appended the element to the dom.
    const offset = (-1 * el.children[i].offsetTop);
    el.style.transition = 'transform 600ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
    el.style.transform = cssTranslate(0, offset, -800) + ' rotateY(30deg)';
  }
  else if (mode === 'show-tabs') {
    const offset = (-1 * el.children[i].offsetTop);
    el.style.transition = 'transform 600ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
    el.style.transform = cssTranslate(0, offset, -3000)  + ' rotateY(30deg)';
  }
  else {
    const offset = (-1 * el.children[i].offsetTop);
    el.style.transition = 'transform 400ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
    el.style.transform = cssTranslate(0, offset, 0);
  }
};

Webviews.service = (msg, send) => {
  if (msg.type === 'mousedown' && msg.target.dataset.webviewIndex) {
    send(ChangeWebview(msg.target.dataset.webviewIndex));
  }
  else if (msg.type === 'mouseover' && msg.target.dataset.webviewIndex) {
    send(Preview(msg.target.dataset.webviewIndex));
  }
}

const bodyEl = document.querySelector('body');
const webviewsEl = document.getElementById('webviews');
const tabsEl = document.getElementById('tabs');

const AppState = (mode, chosen, webviews) =>
  snapshot({mode, chosen, webviews});

AppState.update = (state, msg) => snapshot.swap(state, AppState(
  Mode.update(state.mode, msg),
  Chosen.update(state.chosen, msg),
  state.webviews
));

AppState.write = (state) => {
  commit(Mode.write, bodyEl, state.mode);
  commit(Webviews.write,
    webviewsEl, state.chosen, state.webviews.items, state.mode.value);
  commit(Tabs.write, tabsEl, state.chosen, state.webviews.items);
};

const app = App(AppState.update, AppState.write, AppState(
  Mode('show-webview'),
  Chosen(0, 0, true),
  Webviews([
    Webview('http://breakingsmart.com/season-1/', 'How software is eating the world'),
    Webview('http://en.wikipedia.org', 'Wikipedia'),
    Webview('https://en.wikipedia.org/wiki/Maxima_clam#/media/File:2_Tridacna_gigas.jpg', 'Maxima Clam'),
    Webview('http://breakingsmart.com/season-1/the-future-in-the-rear-view-mirror/', 'The future in a rear-view mirror')
  ])
));

const send = Bus(Fwd(
  Webviews.service, Mode.service, keyboardService, overlayService, app));

// Request initial render.
send(Render());

window.addEventListener('keyup',
  event => send({type: 'keyup', keyCode: event.keyCode}));
window.addEventListener('mousedown', send);
window.addEventListener('mouseover', send);
window.addEventListener('mouseout', send);
