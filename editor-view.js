const { DOMSerializer } = require("prosemirror-model");

class NodeView {
  constructor(node, dom, contentDOM) {
    this.node = node;
    this.dom = dom;
    this.contentDOM = contentDOM;
    this.parent = null;
    this.children = [];
    this.dom.__nodeView = this;
  }
  
  update(node) {
    if (node !== this.node) {
      const result
    }
  }

  get pos() {
    if (!this.parent) {
      return 0;
    }

    const index = this.parent.children.indexOf(this);
    const precedingSiblings = this.parent.children.slice(0, index);
    return precedingSiblings.reduce(
      (pos, child) => pos + child.nodeSize,
      this.parent.pos
    );
  }
}

class EditorView {
  constructor(dom, { state }) {
    this.dom = dom;
    this.state = state;

    this.onBeforeInput = this.onBeforeInput.bind(this);

    this.dom.addEventListener("beforeinput", this.onBeforeInput);
    this.dom.contentEditable = true;

    this.nodeView = new NodeView(this.state.doc, this.dom, this.dom);
  }

  destroy() {
    this.dom.removeEventListener("beforeinput", this.onBeforeInput);
  }

  dispatch(tr) {
    const newState = this.state.apply(tr);
    this.setState(newState);
  }

  setState(newState) {
    this.state = newState;
    this.update();
  }

  update() {
    this.nodeView.update(this.state.doc);
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
