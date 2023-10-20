const { TextSelection } = require("prosemirror-state");

function renderNode(node) {
  if(node.isText) {
    return document.createTextNode(node.text);
  }  
  const [tagName] = node.type.spec.toDOM(node);
  return document.createElement(tagName);
}

class View {
  constructor(node, dom, parent) {
    this.node = node;
    this.dom = dom;
    this.parent = parent;
    this.dom.__view = this;
  }
  
  destroy() {
    this.parent = null;
    this.dom.__view = null;
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
    return this.node.nodeSize;
  }
}

class TextView extends View {
  update() {
    return false;
  }
};

class NodeView extends View {
  constructor(node, dom, parent) {
    super(node, dom, parent);
    this.children = [];
    this.updateChildren();
  }
  
  destroy() {
    super.destroy();
    
    for (const child of this.children) {
      child.destroy();
    }
  }
  
  get border() {
    return this.node.isLeaf ? 0 : 1;
  }
  
  update(node) {
    if(!this.node.sameMarkup(node)) {
      console.log("Can't update");
      return false;
    }
    
    this.node = node;
    this.updateChildren();
    console.log("Updated!");
    return true;
  }
  
  updateChildren() {
    this.node.forEach((child, offset, index) => {
      const childView = this.children[index];
      if (childView) {
        const updated = childView.update(child);
        if (updated) {
          return;
        }

        childView.destroy();
      }

      const childDOM = renderNode(child);
      if (childView) {
        this.dom.replaceChild(childDOM, childView.dom);
      } else {
        this.dom.appendChild(childDOM);
      }

      if (child.isText) {
        this.children[index] = new TextView(child, childDOM, this);
      } else {
        this.children[index] = new NodeView(child, childDOM, this);
      }
    });
    
    while (this.children.length > this.node.childCount) {
      this.children.pop().destroy();
      this.dom.removeChild(this.dom.lastChild);
    }
  }
};


class EditorView extends NodeView {
  constructor(dom, { state }) {
    super(state.doc, dom, null);
    this.state = state;

    this.onBeforeInput = this.onBeforeInput.bind(this);
    this.dom.addEventListener("beforeinput", this.onBeforeInput);
    
    this.onSelectionChange = this.onSelectionChange.bind(this);
    document.addEventListener("selectionchange", this.onSelectionChange);
    
    this.dom.contentEditable = true;
  }
  
  destroy() {
    super.destroy();
    this.dom.removeEventListener("beforeinput", this.onBeforeInput);
    document.removeEventListener("selectionchange", this.onSelectionChange);
  }
  
  dispatch(transformation) {
    const newState = this.state.apply(transformation);
    this.setState(newState);
  }

  setState(newState) {
    this.state = newState;
    this.update(this.state.doc);
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
  
  onSelectionChange(event) {
    const { doc, tr } = this.state;

    const domSelection = document.getSelection();

    const { anchorNode, anchorOffset } = domSelection;
    const anchorView = anchorNode.__view;
    const anchor = anchorView.pos + anchorView.border + anchorOffset;
    const $anchor = doc.resolve(anchor);

    const { focusNode, focusOffset } = domSelection;
    const headView = focusNode.__view;
    const head = headView.pos + headView.border + focusOffset;
    const $head = doc.resolve(head);

    const selection = TextSelection.between($anchor, $head);
    if (!this.state.selection.eq(selection)) {
      tr.setSelection(selection);
      this.dispatch(tr);
    }
  }
}
