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
  }
  
  destroy() {
    this.parent = null;
  }
}

class TextView extends View {};

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
  
  updateChildren() {
    this.node.forEach((child, offset, index) => {
      const childView = this.children[index];
      if (childView) {
        return;
      }

      const childDOM = renderNode(child);
      this.dom.appendChild(childDOM);

      if (child.isText) {
        this.children[index] = new TextView(child, childDOM, this);
      } else {
        this.children[index] = new NodeView(child, childDOM, this);
      }
    });
  }
};


class EditorView extends NodeView {
  constructor(dom, { state }) {
    super(state.doc, dom, null);
    this.state = state;

    this.dom.contentEditable = true
  }
  
  destroy() {
    super.destroy();
  }
}
