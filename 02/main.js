const cssTranslate = (x, y, z) => `translate3d(${x}px, ${y}px, ${z}px)`;
const log = (m) => console.log(m);

// Events
const Preview = (index) => ({type: 'preview', index});
const RestPreviews = (index) => ({type: 'rest-previews', index: '@selected'});
const ChangeMode = (mode) => ({type: 'change-mode', mode});
const ChangeWebview = (index) => ({type: 'change-webview', index});
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

Tabs.create = (id, state) => {
  const tabsEl = document.createElement('ul')
  tabsEl.id = id;
  tabsEl.className = 'tabs';
  return children(tabsEl, state.items.map(Tabs.createTab));
};

Tabs.write = (tabsEl, state) => {
  selectClass(tabsEl.children, 'tab-selected', state.cursor);
};

Tabs.widget = Widget(Tabs, _('sidebar'), 'tabs');

const Overlay = {};
Overlay.service = (msg, send) => {
  if (msg.type === 'mousedown' && msg.target.id === 'overlay') {
    send(ChangeMode('show-webview'));
  }
}

const Mode = (mode) => touch({mode});

Mode.update = Cursor((state, msg) =>
  msg.type === 'change-mode' && msg.mode !== state.mode ?
    Mode(msg.mode) :
  msg.type === 'esc' && state.mode === 'show-search' ?
    Mode('show-webview') :
  msg.type === 'esc' && state.mode === 'show-tabs' ?
    Mode('show-webview') :
  msg.type === 'esc' && state.mode === 'show-webview' ?
    Mode('show-tabs') :
  state, 'mode');

Mode.write = (el, state) => {
  toggleClass(el, 'mode-show-tabs', state.mode === 'show-tabs');
  toggleClass(el, 'mode-show-search', state.mode === 'show-search');
}

Mode.service = (msg, send) => {
  if (msg.type === 'mousedown' && msg.target.id === 'tabs-button') {
    send(ChangeMode('show-tabs'));
  }

  if (msg.type === 'change-webview') {
    send(ChangeMode('show-webview'));
  }
}

const Webview = (url, title) => touch({url, title, id: url});

Webview.create = (webview, i) => {
  const el = document.createElement('iframe');
  el.className = 'webview';
  el.src = webview.url;
  el.sandbox = true;
  return el;
};

const Webviews = (cursor, selected, resting, items) =>
  touch({cursor, selected, resting, items});

Webviews.update = Cursor((state, msg) =>
  msg.type === 'change-webview' ?
    modify(state, {cursor: msg.index, selected: msg.index, resting: true}) :
  msg.type === 'preview' ?
    modify(state, {cursor: msg.index, resting: false}) :
  msg.type === 'rest-previews' ?
    modify(state, {cursor: state.selected, resting: true}) :
  state, 'webviews');

Webviews.create = (id, state) => {
  const el = document.createElement('div');
  el.id = id;
  el.className = 'webviews';
  return children(el, state.webviews.items.map(Webview.create));
};

Webviews.write = (webviews, state, send) => {
  const i = state.mode.mode === 'show-tabs' ?
    state.webviews.cursor :
    state.webviews.selected;

  const offset = (-1 * webviews.children[i].offsetTop);

  if (state.mode.mode === 'show-tabs' && state.webviews.resting) {
    webviews.style.transform = cssTranslate(0, offset, -800) + ' rotateY(30deg)';    
  }
  else if (state.mode.mode === 'show-tabs') {
    webviews.style.transform = cssTranslate(0, offset, -2000)  + ' rotateY(30deg)';
  }
  else {
    webviews.style.transform = cssTranslate(0, offset, 0);
  }
};

Webviews.widget = Widget(Webviews, $$('body'), 'webviews');

Webviews.service = (msg, send) => {
  if (msg.type === 'mousedown' && msg.target.dataset.webviewIndex) {
    send(ChangeWebview(msg.target.dataset.webviewIndex));
  }
  else if (msg.type === 'mouseover' && msg.target.dataset.webviewIndex) {
    send(Preview(msg.target.dataset.webviewIndex));
  }
  else if (msg.type === 'mouseout' && msg.target.id === 'sidebar') {
    send(RestPreviews());
  }
}

const State = () => touch({
  mode: Mode('show-webview'),
  webviews: Webviews(0, 0, true, [
    Webview('http://breakingsmart.com/season-1/', 'How software is eating the world'),
    Webview('http://ben-evans.com', 'Ben Evans'),
    Webview('http://notcot.org', 'NOTCOT.ORG')
  ])
});

State.update = Update(Webviews.update, Mode.update);

State.write = (state, send) => {
  commit(Mode.write, $$('body'), state.mode, send);
  Webviews.widget(state, send);
  Tabs.widget(state.webviews, send);
};

const app = App(State(), State.update, State.write);
const send = Bus(Fwd(Webviews.service, Mode.service, keyboardService, app));

// Request initial render.
send(Render());

window.addEventListener('mousedown', send);
window.addEventListener('mouseover', send);
window.addEventListener('mouseout', send);
window.addEventListener('keyup', send);
