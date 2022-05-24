function renderSpec(spec) {
  console.log(spec);
  const [tagName, attrs, children] = spec;
  
  const dom = document.createElement(tagName);
  let contentDOM = undefined;
  
  for (const name of attrs) {
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
  const spec = node.type.toDOM(node);
  const { dom, contentDOM } = renderSpec(spec);
  
  for (let i = 0 ; i < node.childCount ; i++) {
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
  
  updateState(newState) {
    this.state = newState;
    this.dom.replaceChildren()
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
