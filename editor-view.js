const { DOMSerializer } = require("prosemirror-model");

function toDOM(node) {
  const schema = node.type.schema;
  const serializer = DOMSerializer.fromSchema(schema);
  const outputSpec = serializer.nodes[node.type.name](node);
  return DOMSerializer.renderSpec(document, outputSpec);
}

class View {
  constructor(parent, children, dom, contentDOM) {
    this.parent = parent;
    this.children = children;
    this.dom = dom;
    this.contentDOM = contentDOM;
  }
  
  destroy() {
    for (const child of this.children) {
      child.destroy();
    }
    
    if (this.parent) {
      this.parent.dom.removeChild(this.dom);
    }
  }
}

class NodeView extends View {
  constructor(parent, node, dom, contentDOM) {
    super(parent, [], dom, contentDOM);
    this.node = node;
    this.updateChildren();
  }

  update(node) {
    console.log('update', node.type.name)
    if (!this.node.sameMarkup(node)) {
      return false;
    }

    this.node = node;
    this.updateChildren();
    return true;
  }

  updateChildren() {
    this.node.forEach((child, offset, index) => {
      let childNodeView = this.children[index];

      if (childNodeView) {
        if (childNodeView.update(child)) {
          return;
        }

        console.log('destroy', childNodeView.node.type.name)
        childNodeView.destroy();
      }

      const { dom, contentDOM } = toDOM(child);
      childNodeView = new NodeView(this, child, dom, contentDOM);
      childNodeView.parent = this;
      this.children[index] = childNodeView;
    });
    
    while(this.children.length > this.node.childCount) {
      this.children.shift().destroy();
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

    this.nodeView = new NodeView(null, this.state.doc, this.dom, this.dom);
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
