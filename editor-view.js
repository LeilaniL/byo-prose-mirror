function renderSpec(spec) {
  if (typeof spec === 'string') {
    const dom = document.createTextNode(spec);  
    return { dom };
  }
  
  if (spec instanceof Node) {
    return { dom: spec };
  }
  
  if (spec.dom) {
    return spec;
  }
  
  console.log(spec);
  const [tagName, attrs, children] = spec;

  const dom = document.createElement(tagName);
  let contentDOM = undefined;

  for (const name of Object.keys(attrs)) {
    dom.setAttribute(name, attrs[name]);
  }

  for (const child of children) {
    if (child === 0) {
      contentDOM = dom;
    } else {
      const renderedChild = render(child);
      dom.appendChild(renderedChild.dom);
      if (renderedChild.contentDOM) {
        contentDOM = renderedChild.contentDOM;
      }
    }
  }

  return { dom, contentDOM };
}

function render(node) {
  console.log(node.type.name);
  const spec =
    node.type.name === "doc" ? ["div", {}, 0] : node.type.spec.toDOM(node);
  const { dom, contentDOM } = renderSpec(spec);

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(0);
    const childDOM = render(child);
    dom.appendChild(childDOM);
  }

  return dom;
}

class EditorView {
  constructor(dom, { state }) {
    this.dom = dom;
    this.state = state;

    this.onBeforeInput = this.onBeforeInput.bind(this);

    this.dom.addEventListener("beforeinput", this.onBeforeInput);
    this.dom.contentEditable = true;
  }

  destroy() {
    this.dom.removeEventListener("beforeinput", this.onBeforeInput);
  }

  dispatch(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
  }

  render() {
    const result = render(this.state.doc);
    this.dom.replaceChildren(...result.childNodes);
  }

  updateState(newState) {
    this.state = newState;
    this.render();
  }

  onBeforeInput(event) {
    event.preventDefault();

    switch (event.inputType) {
      case "insertText": {
        const { tr } = this.state;
        tr.insertText(event.data);
        this.dispatch(tr);
      }
    }
  }
}
