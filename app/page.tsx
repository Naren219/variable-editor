"use client";

import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { v4 as uuidv4 } from "uuid";

interface UploadItem {
  id: string;
  name: string;
  type: "graphic" | "image"; // graphics (editable SVGs) vs. images (non‑editable)
  variableName?: string; // for images only (to be used in the URL)
  object: fabric.Object;
}

interface SelectedObject {
  id: string;
  type: "text" | "color";
  object: fabric.Object;
  value: string;
}

interface TaggedVariable {
  id: string;
  type: "text" | "color";
}

const FabricEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [projectId, setProjectId] = useState<string>("MyProject");
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null);
  const [textUpdates, setTextUpdates] = useState<Record<string, string>>({});
  const [colorUpdates, setColorUpdates] = useState<Record<string, string>>({});
  const [graphicId, setGraphicId] = useState<string>("");
  const [taggedVariables, setTaggedVariables] = useState<TaggedVariable[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#fff",
    });
    setCanvas(fabricCanvas);

    fabricCanvas.on("mouse:down", (e) => {
      if (e.target) {
        let target: fabric.Object = e.target;
        if (e.subTargets && e.subTargets.length > 0) {
          // Pick the first sub-target (this is the actual element inside the group).
          target = e.subTargets[0];
        }
        const id = (target as any).customId || uuidv4();
        const value = target.type === "i-text" ? (target as fabric.IText).text || "" : target.fill as string || "";
        setSelectedObject({ id, type: target.type === "i-text" ? "text" : "color", object: target, value });
      } else {
        setSelectedObject(null);
      }
    });
    setCanvas(fabricCanvas);

    fabricCanvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });

    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  const tagSelectedObject = () => {
    if (!selectedObject) return;
    // Check if it is already tagged.
    const exists = taggedVariables.find((v) => v.id === selectedObject.id);
    if (exists) return;
    const newTag: TaggedVariable = {
      id: selectedObject.id,
      type: selectedObject.type,
    };
    setTaggedVariables((prev) => [...prev, newTag]);
  };

  async function loadSVG(url: string): Promise<fabric.FabricObject> {
    try {
      const { objects, options } = await fabric.loadSVGFromURL(url);
      const convertedObjects = objects.map((obj) => {
        if (!obj) return null
        if (obj.type === "text") {
          const objOptions = { ...obj.toObject() };
          delete objOptions.type;
          const iText = new fabric.IText((obj as fabric.Text).text || "", objOptions);
          return iText;
        }
        return obj;
      }).filter((obj): obj is fabric.FabricObject => obj !== null);

      const group = fabric.util.groupSVGElements(convertedObjects, options);
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
      const id = uuidv4();
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imgUrl = event.target?.result as string;
        const svg = await loadSVG(imgUrl);
        svg.scaleToWidth(400);
        svg.set({
          // left: canvasRef.current!.width / 2,
          // top: canvasRef.current!.height / 2,
          // originX: 'center',
          // originY: 'center',
          subTargetCheck: true,
        });
        canvas?.add(svg);
        canvas?.renderAll();
        setUploads((prev) => [
          ...prev,
          { id, name: file.name, type: "image", object: svg },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject || !canvas) return;
    const newValue = e.target.value;
    if (selectedObject.type === "text") {
      if (selectedObject.object.type === "i-text") {
        (selectedObject.object as fabric.IText).set({ text: newValue });
        setTextUpdates((prev) => ({ ...prev, [selectedObject.id]: newValue }));
      }
    } else {
      // Assume color editing
      selectedObject.object.set({ fill: newValue });
      setColorUpdates((prev) => ({ ...prev, [selectedObject.id]: newValue }));
    }
    canvas.renderAll();
    setSelectedObject({ ...selectedObject, value: newValue });
  };

  const buildExportUrl = (): string => {
    const baseUrl = `http://localhost:3000/generate${encodeURIComponent(projectId)}`;
    const params = new URLSearchParams();
  
    params.append("graphic", `{{graphic}}`);
  
    Object.entries(textUpdates).forEach(([key, value]) => {
      let id = key.substring(0, 8);
      params.append(`text_${id}`, `{{text_${id}}}`);
    });
  
    Object.entries(colorUpdates).forEach(([key, value]) => {
      let id = key.substring(0, 8);
      params.append(`color_${id}`, `{{color_${id}}}`);
    });
  
    uploads.forEach((upload) => {
      if (upload.variableName && upload.variableName.trim() !== "") {
        const varName = upload.variableName.trim();
        params.append(varName, `{{${varName}}}`);
      }
    });
  
    return `${baseUrl}?${params.toString()}`;
  };

  const handleTagAsGraphic = (id: string) => {
    setUploads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, type: "graphic" } : item
      )
    );
    setGraphicId(id);
  };

  const handleVariableNameChange = (id: string, newVarName: string) => {
    setUploads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, variableName: newVarName } : item
      )
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar: File List and Upload */}
      <div
        style={{
          width: "250px",
          borderRight: "1px solid #ccc",
          padding: "10px",
          overflowY: "auto",
        }}
      >
        <h3>Uploaded Files</h3>
        <input type="file" multiple accept=".svg,image/*" onChange={handleFileUpload} />
        <ul style={{ listStyle: "none", padding: 0 }}>
          {uploads.map((item) => (
            <li
              key={item.id}
              style={{
                marginBottom: "10px",
                padding: "5px",
                border: "1px solid #ddd",
                background: "#fff",
              }}
            >
              <div>
                <strong>{item.name}</strong>
              </div>
              {item.type === "image" && (
                <div style={{ marginTop: "5px" }}>
                  <button
                      onClick={() => handleTagAsGraphic(item.id)}
                      style={{ fontSize: "12px", marginBottom: "5px" }}
                    >
                      Tag as Graphic
                  </button>
                  <input
                    type="text"
                    placeholder="Variable name (e.g., profileIMG)"
                    value={item.variableName || ""}
                    onChange={(e) =>
                      handleVariableNameChange(item.id, e.target.value)
                    }
                    style={{ fontSize: "12px", width: "100%" }}
                  />
                </div>
              )}
              {item.type === "graphic" && (
                <div style={{ marginTop: "5px", color: "blue", fontWeight: "bold" }}>
                  Graphic (Editable)
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Central Editor Canvas */}
      <div style={{ flex: 1, position: "relative", padding: "10px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ marginRight: "10px" }}>Project Name:</label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Enter project name"
            style={{ fontSize: "16px", padding: "5px" }}
          />
        </div>
        <canvas id="c" ref={canvasRef} style={{ border: "1px solid #ddd" }} />
      </div>

      {/* Right Panel: Export URL and Editing Panel */}
      <div
        style={{
          width: "350px",
          borderLeft: "1px solid #ccc",
          padding: "10px",
          overflowY: "auto",
        }}
      >
        <h3>Exported URL</h3>
        <div
          style={{
            padding: "10px",
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            wordBreak: "break-all",
            fontFamily: "monospace",
          }}
        >
          {buildExportUrl()}
        </div>

        {selectedObject && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            border: "1px solid #ddd",
            background: "#f9f9f9",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <h4 style={{ marginBottom: "15px" }}>
            Editing {selectedObject.type === "text" ? "Text" : "Color"}
          </h4>
          {selectedObject.type === "text" ? (
            <input
              type="text"
              value={selectedObject.value}
              onChange={handleEditorChange}
              style={{
                fontSize: "16px",
                padding: "8px",
                width: "100%",
                border: "1px solid #ccc",
                borderRadius: "4px",
                marginBottom: "15px",
              }}
            />
          ) : (
            <input
              type="color"
              value={selectedObject.value}
              onChange={handleEditorChange}
              style={{
                width: "50px",
                height: "50px",
                border: "none",
                marginBottom: "15px",
              }}
            />
          )}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={tagSelectedObject}
              style={{
                flex: "1",
                padding: "8px 12px",
                backgroundColor: "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Tag as Variable
            </button>
            <button
              onClick={() => setSelectedObject(null)}
              style={{
                flex: "1",
                padding: "8px 12px",
                backgroundColor: "#e0e0e0",
                color: "#333",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

        {/* Display the list of tagged variables */}
        <div className="border border-gray-300 p-4 rounded-lg shadow-md bg-white">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Tagged Variables</h3>
          {taggedVariables.length === 0 ? (
            <p className="text-gray-500">No variables tagged yet.</p>
          ) : (
            <ul className="space-y-2">
              {taggedVariables.map((variable) => (
                <li
                  key={variable.id}
                  className="p-3 bg-gray-100 rounded-lg shadow-sm flex flex-col"
                >
                  <span className="text-sm font-medium text-gray-700">
                    <span className="font-semibold">ID:</span> {variable.id}
                  </span>
                  <span className="text-sm text-gray-600">
                    <span className="font-semibold">Type:</span> {variable.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default FabricEditor;
