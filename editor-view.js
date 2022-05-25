const { splitBlock } = require("prosemirror-commands");
const { DOMSerializer } = require("prosemirror-model");
const { TextSelection } = require("prosemirror-state");

function renderSpec(spec) {
  if (typeof spec === "string") {
    const dom = document.createTextNode(spec);
    return { dom };
  }

  const [tagName, first, ...rest] = spec;
  const [attrs, ...children] =
    typeof first === "object" && !Array.isArray(first)
      ? [first, rest]
      : [{}, rest];

  const dom = document.createElement(tagName);
  let contentDOM;

  for (const child of children) {
    if (child === 0) {
      contentDOM = dom;
    } else {
      const renderedChild = renderSpec(child);
      dom.appendChild(renderedChild.dom);
      if (renderedChild.contentDOM) {
        contentDOM = renderedChild.contentDOM;
      }
    }
  }

  return { dom, contentDOM };
}

function toDOM(node) {
  if (node.isText) {
    return renderSpec(node.text);
  }

  const outputSpec = node.type.spec.toDOM(node);
  return renderSpec(outputSpec);
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

  pointFromPos(pos, preferBefore) {
    let index = 0;
    let offset = 0;

    while (index < this.children.length) {
      const child = this.children[index];
      const isLastChild = index === this.children.length - 1;

      const { border, size } = child;
      const start = offset + border;
      const end = offset + size - border;
      const after = end + border;

      if (pos < after || (pos === after && preferBefore) || isLastChild) {
        return child.pointFromPos(pos - start, preferBefore);
      }

      index = index + 1;
      offset = offset + size;
    }

    return { node: this.dom, offset: pos };
  }

  posFromPoint(node, offset) {
    const view = node.__view;
    return view.pos + view.border + offset;
  }

  setSelection(anchor, head) {
    const backward = head > anchor;

    const anchorPoint = this.pointFromPos(anchor, backward);
    const focusPoint = this.pointFromPos(head, !backward);

    const domSelection = document.getSelection();
    domSelection.setBaseAndExtent(
      anchorPoint.node,
      anchorPoint.offset,
      focusPoint.node,
      focusPoint.offset
    );
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

  pointFromPos(pos, side) {
    return { node: this.dom, offset: pos };
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
      this.contentDOM.removeChild(this.contentDOM.lastChild);
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
        break;
      }

      case "insertParagraph": {
        const { state, dispatch } = this;
        splitBlock(state, dispatch);
        break;
      }

      case "deleteContentBackward": {
        const { tr } = this.state;
        const range = event.getTargetRanges()[0];
        const from = this.posFromPoint(range.startContainer, range.startOffset);
        const to = this.posFromPoint(range.endContainer, range.endOffset);
        tr.delete(from, to);
        this.dispatch(tr);
        break;
      }
    }
  }

  onSelectionChange(event) {
    const { doc, tr } = this.state;

    const domSelection = document.getSelection();

    const { anchorNode, anchorOffset } = domSelection;
    const anchor = this.posFromPoint(anchorNode, anchorOffset);
    const $anchor = doc.resolve(anchor);

    const { focusNode, focusOffset } = domSelection;
    const head = this.posFromPoint(focusNode, focusOffset);
    const $head = doc.resolve(head);

    const selection = TextSelection.between($anchor, $head);
    if (!this.state.selection.eq(selection)) {
      tr.setSelection(selection);
      this.dispatch(tr);
    }
  }
}
