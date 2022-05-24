class EditorView {
  constructor(dom) {
    this.dom = dom;
    this.dom.contentEditable = true;
    this.onBeforeInput = this.onBeforeInput.bind(this);
    
    this.dom.addEventListener('beforeinput', this.onBeforeInput);
    this.update();
  }
  
  destroy() {
    this.dom.removeEventListener('beforeinput', this.onBeforeInput);
    
  }
  
  update() {
    
  }
  
  onBeforeInput(event) {
    event.preventDefault();
  }
}