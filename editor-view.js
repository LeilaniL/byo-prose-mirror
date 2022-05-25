const { splitBlock } = require("prosemirror-commands");
const { DOMSerializer } = require("prosemirror-model");
const { TextSelection } = require("prosemirror-state");

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
  
  domFromPos(pos, side) {
    let index = 0;
    let offset = 0;
    
    while (index < this.children.length) {
      const child = this.children[index];
      const isLastChild = index === this.children.length - 1;

      const { border, size } = child;
      const start = offset + border;
      const end = offset + size - border;

      if (pos < end || (pos === end && side === 1)) {
        return child.domFromPos(pos - start);
      }

      index = index + 1;
      offset = offset + size;
    }
    
    return { node: this.dom, offset: pos };
    
  }

  setSelection(anchor, head) {
    const from = Math.min(anchor, head);
    const to = Math.max(anchor, head);
    
    const { node: anchorNode, offset: anchorOffset } = this.domFromPos(anchor)
  }

  get border() {
    return 0;
  }

  get pos() {
    const { parent } = this;

    if (!parent) {
      return -1;
    }

    const siblings = parent.children;
    const index = siblings.indexOf(this);
    const precedingSiblings = siblings.slice(0, index);
    return precedingSiblings.reduce(
      (pos, sibling) => pos + sibling.size,
      parent.pos + parent.border
    );
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
  
  domFromPos(pos, side) {
    return { node: this.dom, offset: pos };
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

  get border() {
    return this.node.isLeaf ? 0 : 1;
  }

  get size() {
    return this.node.nodeSize;
  }
}

class EditorView extends NodeView {
  constructor(dom, { state }) {
    super(null, state.doc, dom, dom);
    this.state = state;

    this.dispatch = this.dispatch.bind(this);
    this.onBeforeInput = this.onBeforeInput.bind(this);
    this.onSelectionChange = this.onSelectionChange.bind(this);

    this.dom.addEventListener("beforeinput", this.onBeforeInput);
    document.addEventListener("selectionchange", this.onSelectionChange);

    this.dom.contentEditable = true;
  }

  destroy() {
    this.dom.removeEventListener("beforeinput", this.onBeforeInput);
    document.addEventListener("selectionchange", this.onSelectionChange);
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
    try {
      document.removeEventListener("selectionchange", this.onSelectionChange);
      super.update(node);

      const { anchor, head } = this.state.selection;
      this.setSelection(anchor, head);
    } finally {
      document.addEventListener("selectionchange", this.onSelectionChange);
    }
  }

  onBeforeInput(event) {
    event.preventDefault();

    switch (event.inputType) {
      case "insertText": {
        const { tr } = this.state;
        tr.insertText(event.data);
        this.dispatch(tr);
        break;
      }

      case "insertParagraph": {
        const { state, dispatch } = this;
        splitBlock(state, dispatch);
        break;
      }

      case "deleteContentBackward": {
        const { selection, tr } = this.state;
        if (selection instanceof TextSelection) {
          const { $cursor } = selection;
          const { parentOffset } = $cursor;
          if (parentOffset) {
            const { pos } = $cursor;
            tr.delete(pos - 1, pos);
            this.dispatch(tr);
          }
        }
        break;
      }
    }
  }

  onSelectionChange(event) {
    const domSelection = document.getSelection();

    try {
      const { anchorNode, anchorOffset } = domSelection;
      const anchorView = anchorNode.__view;
      const anchor = anchorView.pos + anchorView.border + anchorOffset;

      const { focusNode, focusOffset } = domSelection;
      const focusView = focusNode.__view;
      const head = focusView.pos + focusView.border + focusOffset;

      const { doc, tr } = this.state;
      const selection = TextSelection.create(doc, anchor, head);
      tr.setSelection(selection);
      this.dispatch(tr);
    } catch (error) {
      console.warn(error);
    }
  }
}
