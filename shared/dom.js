const _ = id => document.getElementById(id);
const $$ = (selector) => document.querySelector(selector);

// Apply a side effect to `n` items.
const sets = (f, n, ...rest) => {
  for (var i = 0; i < n.length; i++) f(n[i], ...rest);
}

const children = (parent, children) => {
  for (var i = 0; i < children.length; i++) {
    parent.appendChild(children[i]);
  };
  return parent;
}

const toggleClass = (el, classname, isAdding) =>
  isAdding ? el.classList.add(classname) : el.classList.remove(classname);

const selectClass = (els, classname, selectedIndex) => {
  for (var i = 0; i < els.length; i++) {
    toggleClass(els[i], classname, i === selectedIndex);
  };
}
