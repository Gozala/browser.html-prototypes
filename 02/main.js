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

const Overlay = {};
Overlay.service = (msg, send) => {
  if (msg.type === 'mousedown' && msg.target.id === 'overlay') {
    send(ChangeMode('show-webview'));
  }
}

const Mode = (mode) => touch({mode});

Mode.update = (state, msg) =>
  msg.type === 'change-mode' && msg.mode !== state.mode ?
    Mode(msg.mode) :
  msg.type === 'esc' && state.mode === 'show-search' ?
    Mode('show-webview') :
  msg.type === 'esc' && state.mode === 'show-tabs' ?
    Mode('show-webview') :
  msg.type === 'esc' && state.mode === 'show-webview' ?
    Mode('show-tabs') :
  state;

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

const Webviews = (cursor, selected, resting) => touch({cursor, selected, resting});

Webviews.update = (state, msg) =>
  msg.type === 'change-webview' ?
    modify(state, {cursor: msg.index, selected: msg.index, resting: true}) :
  msg.type === 'preview' ?
    modify(state, {cursor: msg.index, resting: false}) :
  msg.type === 'rest-previews' ?
    modify(state, {cursor: state.selected, resting: true}) :
  state;

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

const writeTabs = (el, state) => {
  selectClass(el.children, 'tab-selected', state.cursor);
}

const State = () => touch({
  mode: Mode('show-webview'),
  webviews: Webviews(0, 0, true)
});

State.update = (state, msg) => {
  state = branch(Webviews.update, state, 'webviews', msg);
  state = branch(Mode.update, state, 'mode', msg);
  return state;
}

State.write = (state, send) => {
  commit(Mode.write, $$('body'), state.mode, send);
  commit(Webviews.write, _('webviews'), state, send);
  commit(writeTabs, _('tabs'), state.webviews, send);
};

const app = App(State(), State.update, State.write);
const service = Fwd(Webviews.service, Mode.service, keyboardService, app);
const send = Bus(service);

window.addEventListener('mousedown', send);
window.addEventListener('mouseover', send);
window.addEventListener('mouseout', send);
window.addEventListener('keyup', send);
