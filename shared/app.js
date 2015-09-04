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

const Cursor = (update, key) => (tree, msg) => branch(update, tree, key, msg);

const Update = (...update) => (state, msg) => {
  for (var i = 0; i < update.length; i++) state = update[i](state, msg);
  return state;
};

// Write to element only if modified time doesn't match.
const commit = (write, element, state, ...rest) => {
  if (modified(state) > modified(element)) {
    write(element, state, ...rest);
    touch(element);
  }
};

const mountTo = (child, parent) => {
  parent.appendChild(child);
  return child;
}

const Widget = (widget, parent, id) => (state, ...rest) => {
  if (!state) {
    // You can define a custom remove function. The default is simply
    // to remove the element from the DOM.
    const remove = widget.remove || Widget.remove;
    remove(element);
  } else {
    // We look for the element. If we don't find it, we create and mount it.
    const element =
      Widget.find(id) || mountTo(widget.create(id, state, ...rest), parent);
    commit(widget.write, element, state, ...rest);
  }
};

Widget.find = (id) => document.getElementById(id);
Widget.remove = (element) => element.remove();

const Render = () => ({type: 'render'});

// Creates stateful services that knows how to schedule writes to DOM
// based on render request messages.
const App = (state, update, write) => {
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

