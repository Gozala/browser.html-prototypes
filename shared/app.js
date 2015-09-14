// App
// -----------------------------------------------------------------------------

const App = (state, update, write) => {
  const send = (msg) => {
    state = update(state, msg);
  };

  const render = (msg) => {
    state = update(state, msg);
    write(state);
  };

  return {render, send};
}

App.draw = Object.freeze({type: 'draw'});

App.loop = (send) => {
  const frame = () => {
    send(App.draw);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// View
// -----------------------------------------------------------------------------

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

const chooseNewest = (timestamp, thing) =>
  modified(thing) > timestamp ? modified(thing) : timestamp;

// Get the newest modified
const newest = (...things) => things.reduce(chooseNewest, 0);

const sync = (write, timestamp, view, ...rest) => {
  if (timestamp > modified(view)) {
    write(view, ...rest);
    touch(view);
  }
}

const mount = (write, view, ...rest) => {
  if (!view._mounted) {
    write(view, ...rest);
    view._mounted = true;
  }  
}
