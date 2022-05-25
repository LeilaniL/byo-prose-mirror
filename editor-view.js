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

  destory() {
    this.dom.__nodeView = null;
    this.parent.dom.removeChild(this.dom);
  }

  update(node) {
    const schema = node.type.schema;
    const serializer = DOMSerializer.fromSchema(schema);
    
    if (node !== this.node) {
      const { dom, contentDOM } = this.
      
      
    }
    
    this.node = node;
    
    console.log("update", this.node.type.name);

    this.node.forEach((child, offset, index) => {
      console.log("child", child.type.name);
      let childNodeView = this.children[index];

      if (!childNodeView || childNodeView.node !== child) {
        const spec = serializer.nodes[child.type.name](child);
        const { dom, contentDOM } = DOMSerializer.renderSpec(document, spec);
        childNodeView = new NodeView(child, dom, contentDOM);
        childNodeView.parent = this;
        this.children[index] = childNodeView;
      }

      childNodeView.update(child);
    });

    this.children
      .slice(this.node.childCount)
      .forEach((childNodeView) => childNodeView.destroy());
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
