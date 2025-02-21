import * as fabric from "fabric";

if (fabric.IText) {
  const originalITextToSVG = fabric.IText.prototype.toSVG;
  fabric.IText.prototype.toSVG = function() {
    let svg = originalITextToSVG.call(this);
    const fabricId = this.get("fabricId") || this.get("id");
    if (fabricId && !svg.includes('data-fabricid=')) {
      svg = svg.replace("<text ", `<text data-fabricid="${fabricId}" `);
    }
    return svg;
  };
}
