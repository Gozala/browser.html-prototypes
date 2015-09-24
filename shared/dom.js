const sets = (f, indexed, ...rest) => {
  for (var i = 0; i < indexed.length; i++) {
    f(indexed[i], ...rest);
  };
  return indexed;
}

const setStyle = (el, prop, value) => {
  el.style[prop] = value;
  return el;
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
