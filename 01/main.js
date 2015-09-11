const mounted = (element, isMounted) =>
  set(element, '_mounted', isMounted);
const isMounted = (element) => !!element['_mounted'];

const cssGimbal = (x, y, z, rx, ry, rz) =>
  `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;

const cssTranslate = (x, y, z) => `translate3d(${x}px, ${y}px, ${z}px)`;

// Events
const Resting = (isResting) => ({type: 'resting', isResting});
const ChangeMode = (mode) => ({type: 'change-mode', mode});
const ChangeWebview = (index) => ({type: 'change-webview', index: Number(index)});
const EscKey = () => ({type: 'esc'});

const keyboardService = (send) => (msg) => {
  if (msg.type === 'keyup' && msg.keyCode === 27) {
    send(EscKey());
  }
};

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
  null;

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
  else {
    selectClass(el.children, 'tab-selected', chosen.cursor);
  }
});

const overlayService = (send) => (msg) => {
  if (msg.type === 'mouseover' && msg.target.id === 'overlay') {
    send(Resting(true));
  }
  else if (msg.type === 'mouseout' && msg.target.id === 'overlay') {
    send(Resting(false));
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
  toggleClass(el, 'mode-show-webview', value(mode) === 'show-webview');
  toggleClass(el, 'mode-show-tabs', value(mode) === 'show-tabs');
  toggleClass(el, 'mode-show-search', value(mode) === 'show-search');
});

Mode.service = (send) => (msg) => {
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

Windowbar.service = (send) => (msg) => {
  if (msg.type === 'mousedown' && msg.target === 'tabs-button') {
    send(ChangeMode('show-tabs'));
  };
}

const Chosen = (cursor, selected, isResting) =>
  model({cursor, selected, isResting});

Chosen.update = (state, msg) =>
  msg.type === 'change-webview' && msg.index === -1 ?
    Chosen(state.cursor, state.cursor, true) :
  msg.type === 'change-webview' ?
    Chosen(msg.index, msg.index, true) :
  msg.type === 'resting' ?
    Chosen(state.cursor, state.selected, msg.isResting) :
  msg.type === 'esc' ?
    Chosen(state.selected, state.selected, true) :
  null;

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

const Webviews = {};

Webviews.mount = (el, items) => {
  children(el, items.map(Webview.create));
  mounted(el, true);
};

Webviews.showTabsResting = (el, {x, y}) => {
  // const wavex = Math.sin(frame / 101) * 15;
  // const wavey = Math.sin(frame / 103) * 15;
  // const wavez = Math.sin(frame / 97) * 30;
  el.style.transition = 'transform 400ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
  el.style.transform = cssGimbal(
    (x * -0.02),
    (y * -0.07),
    -500,
    (-1 * (y * 0.02)),
    (x * 0.02),
    0
  );
};

Webviews.showTabs = (el) => {
  el.style.transition = 'transform 1000ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
  el.style.transform = cssGimbal(0, 0, -400, 0, 0, 0);
};

Webviews.showWebview = (el) => {
  el.style.transition = 'transform 400ms cubic-bezier(0.215, 0.610, 0.355, 1.000)';
  el.style.transform = cssTranslate(0, 0, 0);
};

Webviews.writer = Writer((el, mode, coords, chosen, webviews) =>
  !isMounted(el) ?
    Webviews.mount(el, webviews) :
  value(mode) === 'show-tabs' && chosen.isResting ?
    render(Webviews.showTabsResting, el, coords) :
  value(mode) === 'show-tabs' ?
    render(Webviews.showTabs, el, mode) :
  value(mode) === 'show-webview' ?
    render(Webviews.showWebview, el, mode) :
  null);

Webviews.service = (send) => (msg) => {
  if (msg.type === 'mousedown' && msg.target.dataset.webviewIndex) {
    send(ChangeWebview(msg.target.dataset.webviewIndex));
  }
}

const Frame = (time, frame) => ({
  now: performance.now(),
  then: time,
  frame: (frame + 1)
});

Frame.update = (state, msg) =>
  msg.type === 'animationframe' ? Frame(state.now, state.frame) : null;

const updateApp = (state, msg) => {
  const frame = Frame.update(state, msg);
  const coords = Patch.branch(Coords.update, state, msg, 'coords');
  const mode = Patch.branch(Mode.update, state, msg, 'mode');
  const chosen = Patch.branch(Chosen.update, state, msg, 'chosen');

  return (coords || mode || chosen) ?
    Change(Patch.flatten(frame, coords, mode, chosen), AnimationFrame.Schedule) :
    Change(frame);
}

const writeMode = Mode.writer(document.querySelector('body'));
const writeWebviews = Webviews.writer(document.getElementById('webviews'));
const writeTabs = Tabs.writer(document.getElementById('tabs'));

const writeApp = (state) => {
  writeMode(state.mode);
  writeWebviews(state.mode, state.coords, state.chosen, state.webviews);
  writeTabs(state.chosen, state.webviews);
};

const send = Bus(msg => {
  app(msg);
  webviews(msg);
  mode(msg);
  keyboard(msg);
  overlay(msg);
  windowbar(msg);
  animationframe(msg);
  digest(msg);
});

const app = App({
  now: 0,
  then: 0,
  frame: 0,
  coords: Coords(0, 0, window.innerWidth, window.innerHeight),
  mode: Mode('show-webview'),
  chosen: Chosen(0, 0, true),
  webviews: [
    Webview('http://breakingsmart.com/season-1/', 'How software is eating the world'),
    Webview('http://en.wikipedia.org', 'Wikipedia'),
    Webview('https://en.wikipedia.org/wiki/Maxima_clam#/media/File:2_Tridacna_gigas.jpg', 'Maxima Clam'),
    Webview('http://breakingsmart.com/season-1/the-future-in-the-rear-view-mirror/', 'The future in a rear-view mirror')
  ]
}, updateApp, writeApp, send);

const webviews = Webviews.service(send);
const mode = Mode.service(send);
const windowbar = Windowbar.service(send);
const keyboard = keyboardService(send);
const overlay = overlayService(send);
const animationframe = AnimationFrame.service(send);
const digest = Digest.service(send);

send(AnimationFrame.Schedule);

window.addEventListener('keyup', send);
window.addEventListener('mousemove', send);
window.addEventListener('mousedown', send);
window.addEventListener('mouseover', send);
window.addEventListener('mouseout', send);
