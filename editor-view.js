function renderNode(node) {
  if(node.isText) {
    return document.createTextNode(node.text);
  }  
}

class EditorView {
  constructor(dom, { state }) {
    this.dom = dom;
    this.state = state;

    this.dom.contentEditable = true;
  }
}
