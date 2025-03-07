"use client";

import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { v4 as uuidv4 } from "uuid";
import Head from "next/head";
import TaggedVariableItem from "./components/TaggedVariableItem";
import './fabricOverrides';
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import UploadItemCard from "./components/UploadItemCard";

export interface UploadItem {
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
  const [projectId, setProjectId] = useState<string>("");
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null);
  const [taggedVariables, setTaggedVariables] = useState<TaggedVariable[]>([]);
  const [orderMap, setOrderMap] = useState<{ [key: string]: number }>({});
  const [sent, setSent] = useState<boolean>(false)
  const uploadsRef = useRef<UploadItem[]>([]);

  useEffect(() => {
    uploadsRef.current = uploads;
  }, [uploads]);

  useEffect(() => {
    document.title = "Variable Editor"

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

      let fillValue = target.get("fill");

      if (!fillValue || fillValue === "rgb(0, 0, 0)") {
        // Try to use toObject() to get a possibly more complete value.
        const obj = target.toObject ? target.toObject() : {};
        fillValue = obj.fill;
      }

      let groupId: string | undefined = target.group ? (target.group as any).customId : undefined;

      // If target.group is not available, try to find the group manually.
      if (!groupId && fabricCanvas) {
        const groups = fabricCanvas.getObjects("group") as fabric.Group[];
        for (const grp of groups) {
          if (grp.contains(target)) {
            groupId = (grp as any).customId;
            
            break;
          }
        }
      }
      
      const matchedUpload = uploadsRef.current.find(
        (u) => u.type === "graphic" && u.id === groupId
      );
      
      if (!matchedUpload) {
        setSelectedObject(null);
        return;
      }
      
      const id = (target as any).customId || uuidv4();
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
    if (!selectedObject || !canvas) return;
    let newTag: TaggedVariable;

    if (selectedObject.type === "color") {
      const { left, top } = selectedObject.object.getBoundingRect();
      const exists = taggedVariables.find(
        (v) => v.id === selectedObject.id && v.type === selectedObject.type
      );
      
      if (exists) return;
      newTag = {
        id: uuidv4(),
        fabricId: selectedObject.id,
        type: selectedObject.type,
        x: roundTwo(left),
        y: roundTwo(top),
        variableName: "",
      };
    } else {
      const svgString = canvas.toSVG();
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, "image/svg+xml");
      const candidates = Array.from(doc.querySelectorAll("text[data-fabricid]")) as SVGGraphicsElement[];

      const index = candidates.findIndex((el) => el.getAttribute("data-fabricid") === selectedObject.id);

      if (index !== -1) {
        newTag = {
          id: uuidv4(),
          fabricId: selectedObject.id,
          type: selectedObject.type,
          variableName: "",
          index
        };
      }
    }
    
    setTaggedVariables((prev) => [...prev, newTag]);
  };

  function preprocessSvgString(svgStr: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgStr, "image/svg+xml");
    const elements = doc.getElementsByTagName("*");
    
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const style = el.getAttribute("style");
      if (style) {
        // Match fill property in the style string
        const match = style.match(/fill\s*:\s*([^;"]+)/i);
        if (match) {
          const fillVal = match[1].trim();
          if (!el.hasAttribute("fill")) {
            el.setAttribute("fill", fillVal);
          }
        }
      }
    }
    return new XMLSerializer().serializeToString(doc);
  }

  async function loadSVG(url: string, id: any): Promise<fabric.FabricObject> {
    try {
      const response = await fetch(url);
      const svgText = await response.text();

      // Preprocess the SVG to ensure fill attributes are set.
      const processedSvg = preprocessSvgString(svgText);
      const { objects, options } = await fabric.loadSVGFromString(processedSvg);
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
      group.set("id", id);

      if ((group as fabric.Group).getObjects) {
        (group as fabric.Group).getObjects().forEach((obj) => {
          if ((obj.type === "i-text" || obj.type === "text") && !obj.get("id")) {
            const uniqueId = uuidv4();
            obj.set("fabricId", uniqueId);
            (obj as any).customId = uniqueId;
          } else if (obj.type !== "i-text" && !obj.get("fill")) {
            const origEl = (obj as any)._originalElement;
            if (origEl) {
              const fill = origEl.getAttribute("fill");
              
              if (fill) {
                obj.set("fill", fill);
              }
            }
          }
        });
      }
      
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
        // svg.scaleToWidth(400);
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

  const deleteUploadItem = (id: string) => {
    const itemToDelete = uploads.find((item) => item.id === id);
    if (itemToDelete && canvas) {
      canvas.remove(itemToDelete.object);
      canvas.renderAll();
    }
    setUploads((prev) => prev.filter((item) => item.id !== id));
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

  const updateTaggedVariableName = (id: string, type: "text" | "color", newVarName: string) => {
    setTaggedVariables((prev) =>
      prev.map((v) => (v.id === id && v.type === type ? { ...v, variableName: newVarName } : v))
    );
  };

  const buildExportSchema = (): ExportSchema => {
    const mainGraphic = uploads.find((item) => item.type === "graphic");
    
    const graphic: Layer = {
      fileName: mainGraphic ? mainGraphic.name : "",
      x: mainGraphic ? roundTwo(mainGraphic.left) : 0,
      y: mainGraphic ? roundTwo(mainGraphic.top) : 0,
      order: mainGraphic && mainGraphic.height !== undefined ? orderMap[mainGraphic.id] : 0,
      ...(mainGraphic?.width !== undefined ? { width: roundTwo(mainGraphic.width) } : {}),
      ...(mainGraphic?.height !== undefined ? { height: roundTwo(mainGraphic.height) } : {}),
    }
    

    const tags = taggedVariables.map((tv) => {
      const baseTag = {
        id: tv.id.slice(0, 5),
        fabricId: tv.fabricId.slice(0, 5),
        type: tv.type,
        value: tv.variableName,
      };
      
      if (tv.type === "text") {
        return {
          ...baseTag,
          index: tv.index,
        };
      } else {
        return {
          ...baseTag,
          x: tv.x,
          y: tv.y,
        };
      }
    });
    

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
          fileName: item.name,
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
  
  async function handleExport(projectId: string) {
    const schema = buildExportSchema();
    await setDoc(doc(db, "schemas", projectId || "MyProject"), schema);
    setSent(true)
    console.log("Export schema saved to Firestore for project:", projectId);
  }

  function buildExportUrl(projectId: string, schema: ExportSchema): string {
    const baseUrl = "http://localhost:3000/generate";
    const params = new URLSearchParams();
    
    params.append("projectId", projectId ?? "MyProject");
    params.append("graphicName", schema.graphic.fileName);
    taggedVariables.forEach((tag) => {
      if (tag.variableName && tag.variableName.trim()) {
        params.append(tag.variableName, tag.variableName);
      }
    })
    
    schema.images.forEach((img) => {
      if (img.variableName && img.variableName.trim()) {
        params.append(img.variableName, `${img.variableName}`);
      }
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  let fullURL = buildExportUrl(projectId, buildExportSchema());

  return (
    <div style={{ display: "flex", height: "100vh" }}>
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
            <UploadItemCard
              key={item.id}
              item={item}
              handleTagAsGraphic={handleTagAsGraphic}
              handleVariableNameChange={handleVariableNameChange}
              deleteUploadItem={deleteUploadItem}
            />
          ))}
        </ul>
        {/* Display the list of tagged variables */}
        <div className="border border-gray-300 p-4 rounded-lg shadow-md bg-white">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Tagged Variables</h3>
          <h2 className="font-semibold text-gray-800 mb-2">(no spaces)</h2>
          {taggedVariables.length === 0 ? (
            <p className="text-gray-500">No variables tagged yet.</p>
          ) : (
            <ul className="space-y-2">
              {taggedVariables.map((variable) =>
                <TaggedVariableItem
                  key={(variable.id ?? "") + variable.type}
                  variable={variable}
                  updateTaggedVariableName={updateTaggedVariableName}
                />
              )}
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
            fontSize: "14px",
          }}
        >
          Request URL: {fullURL}
          <br />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
            <button
              onClick={() => handleExport(projectId)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
                transition: "background-color 0.3s ease",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#218838";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#28a745";
              }}
            >
              Save details
            </button>
            {sent && (
              <h3 style={{ margin: 0 }}>Updated!</h3>
            )}
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
              Editing {selectedObject.type === "text" ? "Text" : "Color"} (test below)
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
                disabled={taggedVariables.some(
                  (tv) => tv.fabricId === selectedObject.id && tv.type === selectedObject.type
                )}
                style={{
                  flex: "1",
                  padding: "8px 12px",
                  backgroundColor: taggedVariables.some(
                    (tv) => tv.fabricId === selectedObject.id && tv.type === selectedObject.type
                  )
                  ? "#ccc"
                  : "#0070f3",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: taggedVariables.some(
                    (tv) => tv.fabricId === selectedObject.id && tv.type === selectedObject.type
                  )
                  ? "default"
                  : "pointer",
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
