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

// Set a modified time on an object.
const touch = (object) => {
  object['modified@touch'] = performance.now();
  return object;
}

// Get a modified time from an object
const modified = (object) => object['modified@touch'] || 0;

// Patch an object and mark it modified
const modify = (object, diff) => touch(Object.assign(object, diff));

// Update a child object on an object and mark the object dirty if the
// property is dirty.
const branch = (step, tree, key, msg) => {
  tree[key] = step(tree[key], msg);
  if (modified(tree[key]) > modified(tree)) touch(tree);
  return tree;
};

// Write to element only if modified time doesn't match.
const commit = (write, element, state, ...rest) => {
  if (modified(state) > modified(element)) {
    write(element, state, ...rest);
    touch(element);
  }
};

const Widget = (widget) => (parent) => (state, ...rest) => {
  if (!state) {
    // You can define a custom remove function. The default is simply
    // to remove the element from the DOM.
    const remove = widget.remove || Widget.remove;
    remove(parent, element);
  } else {
    // You can define a custom find function. The default is to look for an
    // element via the `id` field of `state`.
    const find = widget.find || Widget.find;
    const element = find(state) || widget.create(parent, state, ...rest);
    commit(widget.write, element, state, ...rest);
  }
};

Widget.find = (state) => document.getElementById(state.id);
Widget.remove = (parent, element) => element.remove();

// Create a stateful receive function that will schedule animation frames for
// `write` whenever `state` is modified.
const App = (state, update, write) => {
  var isFrameScheduled = false;
  return (msg, send) => {
    const lastModified = modified(state);
    state = update(state, msg);
    // If state has been modified, schedule an animation frame.
    // Make sure we schedule only if don't have one scheduled already.
    // This way we batch writes.
    if (modified(state) > lastModified && !isFrameScheduled) {
      isFrameScheduled = true;
      requestAnimationFrame(t => {
        write(state, send);
        isFrameScheduled = false;
      });
    }
  };
};
