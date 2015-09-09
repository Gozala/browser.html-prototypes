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

// Set a value on an object, returning object.
const set = (object, key, value) => {
  object[key] = value;
  return object;
}

// Set a modified time on an object.
const touch = (object) => set(object, 'modified@touch', performance.now());

// Get a modified time from an object
const modified = (x) =>
  x && x['modified@touch'] ? x['modified@touch'] : 0;

// Patch an object and mark it modified
const modify = (object, key, value) => touch(set(object, key, value));
const mix = (object, diff) => touch(Object.assign(object, diff));

const chooseNewest = (timestamp, thing) =>
  modified(thing) > timestamp ? modified(thing) : timestamp;
const newest = (...things) => things.reduce(chooseNewest, 0);

const insert = (update, state, key, msg) => {
  const lastModified = modified(state[key]);
  state[key] = update(state[key], msg);
  if (modified(state[key]) > lastModified) touch(state);
  return state;
}

// Write to element only if modified time doesn't match.
const commit = (write, element, state, ...rest) => {
  if (newest(state, ...rest) > modified(element)) {
    write(element, state, ...rest);
    touch(element);
  }
};

const Writer = (write) => (el, ...args) => commit(write, el, ...args);

function App(state, update, write, send) {
  this.state = state;
  this.update = update;
  this.write = write;
  this.send = send;
  this.render = this.render.bind(this);
  return this;
};

App.prototype = {
  isScheduled: false,

  receive(msg) {
    const lastModified = modified(this.state);
    this.state = this.update(this.state, msg);
    if (modified(this.state) > lastModified) {
      this.schedule();
    }
  },

  schedule() {
    if (!this.isScheduled) {
      this.isScheduled = true;
      requestAnimationFrame(this.render);
    };
  },

  render() {
    this.write(this.state, this.send);
    this.isScheduled = false;
  }
};