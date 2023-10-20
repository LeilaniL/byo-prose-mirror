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
  }
  
  destroy() {
    super.destroy();
    
    for (const child of this.children) {
      child.destroy();
    }
  }
};


class EditorView {
  constructor(dom, { state }) {
    this.dom = dom;
    this.state = state;

    this.dom.contentEditable = true;
  }
  
  destroy() {
    super.destroy();
  }
}
