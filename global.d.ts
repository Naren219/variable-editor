export {}; // This ensures the file is a module

declare global {
  interface ExportSchema {
    graphic: Layer;
    tags: TaggedVariable[];
    images: Layer[];
  }

  interface TaggedVariable {
    id: string; // used to differentiate each tag
    fabricId: string; // used to differentiate specific text elements in a single SVG
    type: "text" | "color";
    x?: number;
    y?: number;
    index?: number;
    value?: string;
    variableName?: string;
  }
  
  interface Layer {
    id?: string;
    fileName: string;
    variableName?: string;
    x?: number;  
    y?: number;
    width?: number;
    height?: number;
    order: number;
  }
  
}