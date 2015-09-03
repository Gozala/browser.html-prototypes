const _ = id => document.getElementById(id);
const $$ = (selector) => document.querySelector(selector);

// Apply a side effect to `n` items.
const sets = (f, n, ...rest) => {
  for (var i = 0; i < n.length; i++) f(n[i], ...rest);
}

const toggleClass = (el, classname, isAdding) =>
  isAdding ? el.classList.add(classname) : el.classList.remove(classname);

// Assign a transition to an element
const transition = (el, property, duration, easing, delay) =>
  Object.assign(el.style, {
    transitionProperty: property,
    transitionDuration: (duration + 'ms'),
    transitionTimingFunction: (easing || 'linear'),
    transitionDelay: ((delay || 0) + 'ms')
  });

const appear = (el, x, y, opacity) => Object.assign(el.style, {
  transform: `translate(${x}, ${y})`,
  opacity
});

// Events
const ChangeMode = (mode) => ({type: 'change-mode', mode});
const ChangeWebview = (id) => ({type: 'change-webview', id});
const EscKey = () => ({type: 'esc'});

const log = (msg) => console.log(msg);

const keyboard = (msg, send) => {
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

const Pointer = (x, y, pressed) => touch({x, y, pressed});

Pointer.update = (state, msg) =>
  msg.type === 'mousedown' ?
    Pointer(state.x, state.y, true) :
  msg.type === 'mouseup' ?
    Pointer(state.x, state.y, false) :
  msg.type === 'mousemove' ?
    Pointer(msg.clientX, msg.clientY, state.pressed) :
  state;

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

  if (msg.type === 'mousedown' && msg.target.id === 'location') {
    send(ChangeMode('show-search'));
  }

  if (msg.type === 'change-webview') {
    send(ChangeMode('show-webview'));
  }
}

const writeSidebar = (el, state) => {
  const tabs = el.querySelectorAll('.tabs > li');
  for (var i = 0; i < tabs.length; i++) {
    transition(tabs[i], 'transform, opacity', 300, 'cubic-bezier(0.215, 0.610, 0.355, 1.000)', 100 * i)
  };

  const isReveal = state.mode === 'show-tabs';

  sets(appear, tabs, (isReveal ? '0' : '100px'), (isReveal ? '0' : '10px'), isReveal ? 1 : 0);
}

const Webviews = (current) => touch({current});

Webviews.update = (state, msg) =>
  msg.type === 'change-webview' ?
    modify(state, {current: msg.id}) :
  state;

Webviews.write = (webviews, state, send) => {
  sets(toggleClass, webviews.children, 'webview-current', false);
  toggleClass(_(state.webviews.current), 'webview-current', true);
};

Webviews.service = (msg, send) => {
  const target = msg.target;
  if (msg.type === 'mousedown' && target && target.dataset.webview) {
    send(ChangeWebview(target.dataset.webview));
  }
}

const State = () => touch({
  pointer: Pointer(0, 0, false),
  webviews: Webviews('webview0'),
  mode: Mode('show-webview'),
});

State.update = (state, msg) => {
  state = branch(Pointer.update, state, 'pointer', msg);
  state = branch(Mode.update, state, 'mode', msg);
  state = branch(Webviews.update, state, 'webviews', msg);
  return state;
}

State.write = (state, send) => {
  commit(Mode.write, $$('body'), state.mode, send);
  commit(writeSidebar, _('sidebar'), state.mode, send);
  commit(Webviews.write, _('webviews'), state, send);
};

const app = App(State(), State.update, State.write);
const service = Fwd(Mode.service, Overlay.service, Webviews.service, keyboard, app);
const send = Bus(service);

window.addEventListener('keyup', send);
window.addEventListener('mousedown', send);
window.addEventListener('mouseup', send);
// window.addEventListener('mousemove', send);
// window.addEventListener('transitionend', send);
