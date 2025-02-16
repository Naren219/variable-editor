"use client";

import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { v4 as uuidv4 } from "uuid";
import Head from "next/head";

interface UploadItem {
  id: string;
  name: string;
  type: "graphic" | "image";
  variableName?: string;
  object: fabric.Object;
  left: number;
  top: number;
  width?: number;
  height?: number;
}

interface SelectedObject {
  id: string;
  type: "text" | "color";
  object: fabric.Object;
  value: string;
}

const FabricEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [projectId, setProjectId] = useState<string>("MyProject");
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null);
  const [taggedVariables, setTaggedVariables] = useState<TaggedVariable[]>([]);
  const [orderMap, setOrderMap] = useState<{ [key: string]: number }>({});
  const uploadsRef = useRef<UploadItem[]>([]);

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#fff",
    });
    setCanvas(fabricCanvas);

    fabricCanvas.on("mouse:down", (e) => {
      if (!e.target) {
        setSelectedObject(null);
        return;
      }
      let target: fabric.Object = e.target;
      if (e.subTargets && e.subTargets.length > 0) {
        target = e.subTargets[0];
      }
      let targetCustomId = (target as any).customId;
      if (!targetCustomId && target.group) {
        targetCustomId = (target.group as any).customId;
      }
      // Find a graphic upload that matches the target's customId.
      const matchedUpload = uploadsRef.current.find(
        (u) => u.type === "graphic" && u.id === targetCustomId
      );
      
      if (!matchedUpload) {
        setSelectedObject(null);
        return;
      }

      const id = targetCustomId || uuidv4();
      const value =
        target.type === "i-text"
          ? (target as fabric.IText).text || ""
          : (target.fill as string) || "";
      
      setSelectedObject({
        id,
        type: target.type === "i-text" ? "text" : "color",
        object: target,
        value,
      });
    });

    fabricCanvas.on("selection:cleared", () => {
      setSelectedObject(null);
    });

    // Updating info for the uploads
    fabricCanvas.on("object:modified", (e) => {
      const modifiedObj = e.target;
      if (!modifiedObj) return;
      let modId = (modifiedObj as any).customId;
      if (!modId && modifiedObj.group) {
        modId = (modifiedObj.group as any).customId;
      }
      if (!modId) return;

      const effectiveWidth = modifiedObj.getScaledWidth()
      const effectiveHeight = modifiedObj.getScaledHeight()
      
      setUploads((prevUploads) =>
        prevUploads.map((item) => {
          if (item.id === modId) {
            return { 
              ...item, 
              left: roundTwo(modifiedObj.left) || item.left, 
              top: roundTwo(modifiedObj.top) || item.top,
              width: roundTwo(effectiveWidth) ?? item.width,
              height: roundTwo(effectiveHeight) ?? item.height
            };
          }
          return item;
        })
      );
      getUploadOrderFromCanvas(fabricCanvas)
    });
    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  const roundTwo = (value: number): number => Math.floor(value * 100) / 100;

  // compute stacking order from canvas
  const getUploadOrderFromCanvas = (fabricCanvas: fabric.Canvas) => {
    const map: { [key: string]: number } = {};
    const objs = fabricCanvas.getObjects();
    objs.forEach((obj, index) => {
      let id = (obj as any).customId;
      if (!id && obj.group) {
        id = (obj.group as any).customId;
      }
      if (id) {
        map[id] = index;
      }
    });
    
    setOrderMap(map)
  };

  const tagSelectedObject = () => {
    if (!selectedObject) return;
    const { left, top } = selectedObject.object.getBoundingRect();
    const exists = taggedVariables.find(
      (v) => v.id === selectedObject.id && v.type === selectedObject.type
    );
    
    if (exists) return;
    const newTag: TaggedVariable = {
      id: selectedObject.id,
      type: selectedObject.type,
      x: Math.floor(left * 100) / 100,
      y: Math.floor(top * 100) / 100,
    };
    
    setTaggedVariables((prev) => [...prev, newTag]);
  };

  async function loadSVG(url: string, id: any): Promise<fabric.FabricObject> {
    try {
      const { objects, options } = await fabric.loadSVGFromURL(url);
      const convertedObjects = objects.map((obj) => {
        if (!obj) return null
        if (obj.type === "text") {
          const objOptions = { ...obj.toObject() };
          delete objOptions.type;
          const iText = new fabric.IText((obj as fabric.Text).text || "", objOptions); // EZ to handle with text
          return iText;
        }
        return obj;
      }).filter((obj): obj is fabric.FabricObject => obj !== null);

      const group = fabric.util.groupSVGElements(convertedObjects, options);
      (group as any).customId = id
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
        const svg = await loadSVG(imgUrl, id);
        svg.scaleToWidth(400);
        svg.set({
          subTargetCheck: true,
        });
        canvas?.add(svg);
        canvas?.renderAll();
        setUploads((prev) => [
          ...prev,
          {
            id,
            name: file.name,
            type: "image",
            object: svg,
            left: roundTwo(svg.left),
            top: roundTwo(svg.top),
            order: prev.length,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Update editor view
  const handleEditorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject || !canvas) return;
    const newValue = e.target.value;
    if (selectedObject.type === "text") {
      if (selectedObject.object.type === "i-text") { // All text should be of type IText!
        (selectedObject.object as fabric.IText).set({ text: newValue });
      }
    } else {
      selectedObject.object.set({ fill: newValue });
    }
    canvas.renderAll();
    setSelectedObject({ ...selectedObject, value: newValue });
  };

  const handleTagAsGraphic = (id: string) => {
    setUploads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, type: "graphic" } : item
      )
    );
  };

  const handleVariableNameChange = (id: string, newVarName: string) => {
    setUploads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, variableName: newVarName } : item
      )
    );
  };

  const buildExportSchema = (): ExportSchema => {
    const mainGraphic = uploads.find((item) => item.type === "graphic");
    const graphic: Layer = {
      file: mainGraphic ? mainGraphic.name : "",
      x: mainGraphic ? roundTwo(mainGraphic.left) : 0,
      y: mainGraphic ? roundTwo(mainGraphic.top) : 0,
      width: mainGraphic ? mainGraphic.width : 0,
      height: mainGraphic ? mainGraphic.height : 0,
      order: mainGraphic ? orderMap[mainGraphic.id] : 0,
    }

    const tags = taggedVariables.map((tv) => ({
      id: tv.id.slice(0, 5) ?? "",
      type: tv.type,
      value: tv.type === "text" ? `INSERT_TEXT_HERE` : `INSERT_COLOR_HERE`,
      x: roundTwo(tv.x),
      y: roundTwo(tv.y),
    }));

    const images = uploads
      .filter(
      (item) =>
        item.type === "image" &&
        item.variableName &&
        item.variableName.trim() !== ""
      )
      .map((item) => {
        const imageLayer: Layer = {
          variableName: item.variableName,
          file: item.name,
          x: roundTwo(item.left),
          y: roundTwo(item.top),
          order: orderMap[item.id] ?? 0,
        };
        if (item.width) imageLayer.width = roundTwo(item.width)
        if (item.height) imageLayer.height = roundTwo(item.height);
        return imageLayer;
      });

    return {
      graphic,
      tags,
      images,
    };
  };
  
  const exportSchema = buildExportSchema();
  const exportJson = JSON.stringify(exportSchema, null, 2);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Head>
        <title>Graphic Editor</title>
      </Head>
      {/* Sidebar: File List and Upload */}
      <div
        style={{
          width: "300px",
          borderRight: "1px solid #ccc",
          padding: "10px",
          overflowY: "auto",
        }}
      >
        <h3>Uploaded Files</h3>
        <input type="file" multiple accept=".svg,image/*" onChange={handleFileUpload} />
        <ul style={{ listStyle: "none", padding: 5 }}>
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
                    placeholder="Variable name (will update JSON)"
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
        {/* Display the list of tagged variables */}
        <div className="border border-gray-300 p-4 rounded-lg shadow-md bg-white">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Tagged Variables</h3>
          {taggedVariables.length === 0 ? (
            <p className="text-gray-500">No variables tagged yet.</p>
          ) : (
            <ul className="space-y-2">
              {taggedVariables.map((variable) => (
                <li
                  key={(variable.id ?? "")+variable.type}
                  className="p-3 bg-gray-100 rounded-lg shadow-sm flex flex-col"
                >
                  <span className="text-sm font-medium text-gray-700">
                    <span className="font-semibold">ID:</span> {variable.id ?? ""}
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
          Base URL: http://localhost:3000/generate/
          <div
            style={{
              marginTop: "8px",
              wordBreak: "break-all"
            }}
          >
            <pre style={{ fontSize: "13px" }}>{exportJson}</pre>
          </div>
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

        
      </div>
    </div>
  );
};

export default FabricEditor;
