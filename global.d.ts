export {}; // This ensures the file is a module

declare global {
  interface ExportSchema {
    graphic: Layer;
    tags: TaggedVariable[];
    images: Layer[];
  }

  interface TaggedVariable {
    id?: string;
    type: "text" | "color";
    x: number;
    y: number;
    value: string;
  }
  
  interface Layer {
    id?: string;
    file: string;
    variableName?: string;
    x?: number;  
    y?: number;
    width?: number;
    height?: number;
    order: number;
  }
  
}