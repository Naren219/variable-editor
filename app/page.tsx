"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { saveAs } from "file-saver";

interface Variable {
  id: string;
  type: "text" | "image" | "color";
  name: string;
  value: string;
}

// Extend the FabricObject type to include the data property
interface ExtendedFabricObject extends fabric.Object {
  variableId?: string;
}
//   data?: {
//     variableId?: string;
//   };
// }

export default function Home() {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [selectedObject, setSelectedObject] = useState<ExtendedFabricObject | null>(null);
  // const [textObjects, setTextObjects] = useState<ExtendedFabricObject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const canvas = new fabric.Canvas("canvas", {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
    });
    canvasRef.current = canvas;

    canvas.on("selection:created", function(opt) {
      const selected = canvas.getActiveObject() as ExtendedFabricObject;
      if (selected) {
        setSelectedObject(selected);
      }
    });

    canvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });

    // Check URL parameters and update canvas objects
    // const params = new URLSearchParams(window.location.search);
    // params.forEach((value, key) => {
    //   const variable = variables.find((v) => v.name === key);
    //   if (variable) {
    //     const obj = canvas.getObjects().find((o) => (o as ExtendedFabricObject).data?.variableId === variable.id) as ExtendedFabricObject;
    //     if (obj) {
    //       if (variable.type === "text" && obj instanceof fabric.IText) {
    //         obj.set({ text: value });
    //       } else if (variable.type === "color") {
    //         obj.set({ fill: value });
    //       }
    //       canvas.renderAll();
    //     }
    //   }
    // });

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    console.log("obj", selectedObject);
  }, [selectedObject])
  
  async function loadSVG(url: string): Promise<ExtendedFabricObject> {
    try {
      const { objects, options } = await fabric.loadSVGFromURL(url);
      const group = fabric.util.groupSVGElements(objects.filter(obj => obj !== null), options) as ExtendedFabricObject;
      // const textElements = objects.filter(obj => obj && (obj.type === 'text' || obj.type === 'i-text')) as ExtendedFabricObject[];
      // setTextObjects(textElements);
      return group;
    } catch (error) {
      console.error('SVG loading failed:', error);
      throw error;
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !canvasRef.current) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imgUrl = event.target?.result as string;
        const svg = await loadSVG(imgUrl);
        svg.scaleToWidth(400);
        svg.set({
          left: canvasRef.current!.width / 2,
          top: canvasRef.current!.height / 2,
          originX: 'center',
          originY: 'center'
        });
        canvasRef.current?.add(svg);
        canvasRef.current?.renderAll();
      };
      reader.readAsDataURL(file);
    }
  };

  const tagAsVariable = () => {
    if (!selectedObject) return;
    const name = prompt("Enter variable name:");
    if (!name) return;
  
    const type = selectedObject instanceof fabric.IText
      ? "text"
      : selectedObject.fill
      ? "color"
      : "image";
  
    const newVariable: Variable = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      name,
      value: type === "text" 
        ? (selectedObject as fabric.IText).text
        : type === "color"
        ? selectedObject.fill?.toString() || "#000000"
        : "image-url",
    };
  
    // Store variableId as a custom property inside the canvas object
    selectedObject.set("variableId", newVariable.id);
    setVariables([...variables, newVariable]);
    selectedObject.canvas?.renderAll();
  };

  const handleVariableChange = (id: string, value: string) => {
    setVariables((prevVariables) => {
      const updatedVariables = prevVariables.map((variable) =>
        variable.id === id ? { ...variable, value } : variable
      );
      const canvas = canvasRef.current;
      if (!canvas) return updatedVariables; // Return updated state
      const newVar = updatedVariables.find((v) => v.id === id);
      if (newVar) {
        const obj = canvas
          .getObjects()
          .find((o) => (o as ExtendedFabricObject).variableId === newVar.id) as ExtendedFabricObject;
        if (obj) {
          if (newVar.type === "text" && obj instanceof fabric.IText) {
            obj.set({ text: value });
          } else if (newVar.type === "color") {
            obj.set({ fill: value });
          }
          canvas.renderAll();
          console.log("yes!");
          
          setSelectedObject(obj);
        }
      }
      
      return updatedVariables;
    });
  };

  const exportCanvas = (format: "png" | "jpeg" | "svg") => {
    if (!canvasRef.current) return;
    
    if (format === "svg") {
      const svg = canvasRef.current.toSVG();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      saveAs(blob, "canvas.svg");
    } else {
      const dataUrl = canvasRef.current.toDataURL({
        format,
        quality: 1,
        multiplier: 1,
      });
      saveAs(dataUrl, `canvas.${format}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Variable Editor</h1>
      
      <div className="flex gap-8">
        <div className="flex flex-col gap-3 w-48">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary"
          >
            Import Images
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
          
          {selectedObject && (
            <button
              onClick={tagAsVariable}
              className="btn btn-warning"
            >
              Tag as Variable
            </button>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => exportCanvas("png")}
              className="btn btn-secondary flex-1"
            >
              PNG
            </button>
            <button
              onClick={() => exportCanvas("svg")}
              className="btn btn-secondary flex-1"
            >
              SVG
            </button>
          </div>
        </div>

        <div className="canvas-container">
          <canvas id="canvas" />
        </div>

        <div className="w-72">
          <h2 className="text-xl font-bold mb-4">Variables</h2>
          <div className="space-y-3">
            {variables.map((variable) => (
              <div key={variable.id} className="variable-card">
                <div className="variable-label">Name</div>
                <div className="variable-value">{variable.name}</div>
                <div className="variable-label mt-2">Type</div>
                <div className="variable-value">{variable.type}</div>
                <div className="variable-label mt-2">Value</div>
                <input
                  type="text"
                  className="variable-value break-all"
                  value={variable.value}
                  onChange={(e) => handleVariableChange(variable.id, e.target.value)}
                />
              </div>
            ))}
          </div>
          
          {/* {variables.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-2">URL Schema</h3>
              <div className="variable-card">
                <div className="text-sm break-all font-mono">
                  {generateUrlSchema()}
                </div>
              </div>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}
