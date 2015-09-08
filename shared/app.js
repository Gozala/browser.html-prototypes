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
        receive(queue.shift(), send);
        if (!queue.length) isDraining = false;
      };
    }
    return msg;
  };

  return send;
};

const Fwd = (...mailboxes) => (msg, send) => {
  for (var i = 0; i < mailboxes.length; i++) {
    mailboxes[i](msg, send);
  };
};

// Set a value on an object, returning object.
const set = (object, key, value) => {
  object[key] = value;
  return object;
}

// Set a modified time on an object.
const touch = (object) => set(object, 'modified@touch', performance.now());

// Get a modified time from an object
const modified = (object) => object['modified@touch'] || 0;

// Patch an object and mark it modified
const modify = (object, diff) => touch(Object.assign(object, diff));

// Compare 2 states and choose one.
const swap = (compare, stateA, stateB) =>
  compare(stateA, stateB) ? stateB : stateA;

const test = (state, diff, compare) => {
  for (var key in diff) {
    if (compare(state[key], diff[key])) return true;
  }
  return false;
}

const isNewer = (a, b) => modified(a) < modified(b);

const snapshot = (state) => Object.freeze(touch(state));
snapshot.isUpdate = (state, diff) => test(state, diff, isNewer);
snapshot.swap = (stateA, stateB) => swap(snapshot.isUpdate, stateA, stateB);

// Write to element only if modified time doesn't match.
const commit = (write, element, state, ...rest) => {
  if (modified(state) > modified(element)) {
    write(element, state, ...rest);
    touch(element);
  }
};

const Render = () => ({type: 'render'});

// Creates stateful services that knows how to schedule writes to DOM
// based on render request messages.
const App = (update, write, state) => {
  var isScheduled = false;
  return (msg, send) => {
    if (msg.type === 'render' && !isScheduled) {
      isScheduled = true;
      requestAnimationFrame(() => {
        write(state, send);
        // Unblock scheduler.
        isScheduled = false;
      });
    } else {
      const lastModified = modified(state);
      state = update(state, msg);
      // If state has been modified, schedule an animation frame.
      if (modified(state) > lastModified) send(Render());
    }
  };
};

// @TODO bus and app might be better expressed as a single class.
// App is stateful, after all.
