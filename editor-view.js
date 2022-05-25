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
    this.dom.__view = this;
  }

  destroy() {
    this.parent = null;

    for (const child of this.children) {
      child.destroy();
    }
  }

  update(node) {
    return false;
  }
  
  domFromPos()

  setSelection(anchor, head) {
    const from = Math.min(anchor, head);
    const to = Math.max(anchor, head);

    let index = 0;
    let offset = 0;

    while (index < this.children.length) {
      const child = this.children[index];
      const isLastChild = index === this.children.length - 1;
      const nextOffset = offset + child.size;

      if (nextOffset > from || (nextOffset === from && isLastChild)) {
        child.setSelection(anchor - offset, head - offset);
        break;
      }

      index = index + 1;
      offset = nextOffset;
    }

    while (index < this.children.length) {
      const child = this.children[index];
      const isLastChild = index === this.children.length - 1;
      const nextOffset = offset + child.size;

      if (nextOffset > to || (nextOffset === to && isLastChild)) {
        child.setSelection(anchor - offset, head - offset);
        break;
      }

      index = index + 1;
      offset = nextOffset;
    }
  }

  get size() {
    return this.children.reduce((size, child) => size + child.size, 0);
  }
}

class TextView extends View {
  constructor(parent, node, dom) {
    super(parent, [], dom);
    this.node = node;
  }

  update(node) {
    return node === this.node;
  }

  setSelection(anchor, head) {
    const { size } = this;

    const selection = document.getSelection();

    if (selection.empty()) {
      const range = document.createRange();
      selection.addRange(range);
    }

    let { anchorNode, anchorOffset, focusNode, focusOffset } = selection;

    if (anchor <= size) {
      anchorNode = this.dom;
      anchorOffset = anchor;
    }

    if (head <= size) {
      focusNode = this.dom;
      focusOffset = head;
    }

    selection.setBaseAndExtent(
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset
    );
  }

  get size() {
    return this.node.text.length;
  }
}

class NodeView extends View {
  constructor(parent, node, dom, contentDOM) {
    super(parent, [], dom, contentDOM);
    this.node = node;
    this.updateChildren();
  }

  update(node) {
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

        childNodeView.destroy();
      }

      const { dom, contentDOM } = toDOM(child);

      if (childNodeView) {
        this.contentDOM.replaceChild(dom, childNodeView.dom);
      } else {
        this.contentDOM.appendChild(dom);
      }

      if (child.isText) {
        this.children[index] = new TextView(this, child, dom);
      } else {
        this.children[index] = new NodeView(this, child, dom, contentDOM);
      }
    });

    while (this.children.length > this.node.childCount) {
      this.children.pop().destroy();
      this.contentDOM.remove(this.contentDOM.lastChild);
    }
  }

  get size() {
    return this.node.nodeSize;
  }
}

class EditorView extends NodeView {
  constructor(dom, { state }) {
    super(null, state.doc, dom, dom);
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
    this.setState(newState);
  }

  setState(newState) {
    this.state = newState;
    this.update(this.state.doc);
  }

  update(node) {
    super.update(node);
    
    const { anchor, head } = this.state.selection;
    this.setSelection(anchor, head);
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
