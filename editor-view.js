const { DOMSerializer } = require("prosemirror-model");

function toDOM(node) {
  const schema = node.type.schema;
  const serializer = DOMSerializer.fromSchema(schema);
  const outputSpec = serializer.nodes[node.type.name](node);
  return DOMSerializer.renderSpec(document, outputSpec);
}

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
    if (node.type !== this.node.type) {
      return false;
    }
    
    if (node !== this.node) {
      const parentDOM = this.dom.parentDOM;
      const { dom, contentDOM } = toDOM(node);

      parentDOM.replaceChild(dom, this.dom);

      this.node = node;
      this.dom = dom;
      this.contentDOM = contentDOM;
      this.children = [];
    }

    this.node.forEach((child, offset, index) => {
      let childNodeView = this.children[index];

      if (!childNodeView) {
        const { dom, contentDOM } = toDOM(child);
        childNodeView = new NodeView(child, dom, contentDOM);
        childNodeView.parent = this;
        this.children[index] = childNodeView;
      }

      childNodeView.update(child);
    });

    if (this.contentDOM) {
      while (this.contentDOM.childNodes.length > this.children.length) {
        this.contentDOM.removeChild(this.contentDOM.lastChild);
      }
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
    this.update();
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
    console.log(JSON.stringify(this.state.doc));
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
