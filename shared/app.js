// Set a value on an object, returning object.
const set = (object, key, value) => {
  object[key] = value;
  return object;
}

// Set a modified time on an object.
const touch = (object) => set(object, '_modified', performance.now());

// Get a modified time from an object.
// If object has no modified date, the value is constant (we use 0)
// to represent constant values.
const modified = (x) => x && x._modified ? x._modified : 0;

const model = (object) => Object.freeze(touch(object));
const snapshot = (value) => model({value});

const value = (x) => x && x.value != null ? x.value : x;

const chooseNewest = (timestamp, thing) =>
  modified(thing) > timestamp ? modified(thing) : timestamp;

// Get the newest modified
const newest = (...things) => things.reduce(chooseNewest, 0);

const sync = (write, timestamp, element, ...rest) => {
  if (timestamp > modified(element)) {
    write(element, ...rest);
    touch(element);
  }
}

const mount = (write, element, ...rest) => {
  if (!element._mounted) {
    write(element, ...rest);
    element._mounted = true;
  }  
}

const exists = (x) => x != null;
const compact = (array) => array.filter(exists);

// Flatten a series of patches.
const Patch = {};

Patch.flatten = (...patches) => {
  const changes = compact(patches);
  return changes.length ? Object.assign({}, ...changes) : null;
}

Patch.branch = (update, state, msg, key) => {
  const diff = update(state[key], msg);
  return diff ? {[key]: diff} : null;
}

const Change = (diff, message) => model({type: 'change', diff, message});

Change.none = Change();

Change.diff = (change) => change.diff;

Change.message = (change) => change.message;

Change.update = (update, state, change) =>
  change.diff ? update(state, change.diff) : state;

const AnimationFrame = {};

AnimationFrame.Frame = model({type: 'animationframe'});
AnimationFrame.Schedule = model({type: 'schedule'});

AnimationFrame.service = (send) => {
  var isScheduled = false;

  const sendFrame = () => {
    send(AnimationFrame.Frame);
    isScheduled = false;
  };

  return (msg) => {
    if (msg === AnimationFrame.Schedule && !isScheduled) {
      isScheduled = true;
      requestAnimationFrame(sendFrame);
    };
  };
};

const Digest = (...messages) => model({type: 'digest', messages});
Digest.service = (send) => (msg) => {
  if (msg.type === 'digest') {
    for (var i = 0; i < msg.messages.length; i++) {
      send(msg.messages[i]);
    };
  };
};

// A message bus. Dispatches messages to `receive` in order (FIFO).
const Bus = (receive) => {
  var isDraining = false;
  const queue = [];

  // Define a function to send a message to the queue.
  const send = (msg) => {
    queue.push(msg);
    // If we're not already draining the queue, start draining.
    // We only want to kick this loop off once, since send can be called
    // recursively by services.
    if (!isDraining) {
      isDraining = true;
      while (isDraining) {
        receive(queue.shift());
        if (!queue.length) isDraining = false;
      };
    };
    return msg;
  };

  return send;
};

const App = (state, update, write, send) => (msg) => {
  const change = update(state, msg);
  Change.update(Object.assign, state, change);
  if (change.message) send(change.message);
  // If message received was an animationframe, write state now.
  if (msg === AnimationFrame.Frame) write(state);
};
