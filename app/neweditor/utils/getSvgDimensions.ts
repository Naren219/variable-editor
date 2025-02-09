export const getSvgDimensions = (svgContent: string): { width: number; height: number } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, "image/svg+xml");
  const svgElement = doc.querySelector("svg");

  if (svgElement) {
    const widthAttr = svgElement.getAttribute("width");
    const heightAttr = svgElement.getAttribute("height");

    if (widthAttr && heightAttr) {
      const width = parseFloat(widthAttr.replace(/[^\d.]/g, ""));
      const height = parseFloat(heightAttr.replace(/[^\d.]/g, ""));
      return { width, height };
    }
  }
  return { width: 300, height: 300 };
};
  