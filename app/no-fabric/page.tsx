"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DraggableSvg from "./DraggableSvg"; // Your draggable/editable SVG component

// --- Interfaces ---
interface UploadedSvg {
  id: string;
  name: string;
  content: string;
  // For non-graphic files, the user can assign a variable name (e.g. "profileIMG")
  variableName?: string;
  // For the tagged graphic, the user can give a custom graphic name if desired.
  customName?: string;
}

interface SelectedElement {
  svgId: string;
  type: "text" | "color";
  element: HTMLElement;
  value: string;
}

// --- Main Component ---
const App = () => {
  // const router = useRouter();

  // All uploaded SVG files
  const [svgs, setSvgs] = useState<UploadedSvg[]>([]);
  // The ID of the file tagged as the main graphic (editable)
  const [graphicId, setGraphicId] = useState<string | null>(null);
  // For editing an element (text or color) inside the tagged graphic
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  // Creator name (to be used in the exported URL)
  const [projectId, setProjectId] = useState<string>("");

  // -------------------------------
  // FILE UPLOAD (only accepts SVGs)
  // -------------------------------
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type === "image/svg+xml") {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            // Create a unique id (using the file name and current timestamp)
            const id = `${file.name}-${Date.now()}`;
            // Add the file to our list (store its original file name)
            setSvgs((prev) => [...prev, { id, name: file.name, content }]);
          };
          reader.readAsText(file);
        }
      });
    }
  };

  // -------------------------------
  // SIDEBAR ACTIONS
  // -------------------------------
  // Tag a file as the main graphic (editable)
  const handleTagAsGraphic = (id: string) => {
    setGraphicId(id);
    setSelectedElement(null); // clear any previous editing selection
  };

  // For non-tagged files, let the user assign a variable name.
  const handleVariableNameChange = (id: string, newVarName: string) => {
    setSvgs((prev) =>
      prev.map((svg) => (svg.id === id ? { ...svg, variableName: newVarName } : svg))
    );
  };

  // -------------------------------
  // EDITOR (Graphic Editing)
  // -------------------------------
  // When the user clicks on an element inside the graphic,
  // store its details so the editing panel can appear.
  const handleElementSelect = (
    svgId: string,
    element: HTMLElement,
    type: "text" | "color"
  ) => {
    const value =
      type === "text"
        ? element.textContent || ""
        : element.getAttribute("fill") || "#000000";
    setSelectedElement({ svgId, type, element, value });
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedElement) return;
    const newValue = e.target.value;
    setSvgs((prevSvgs) =>
      prevSvgs.map((svg) => {
        if (svg.id === graphicId) {
          // Parse the SVG so we can update the target element.
          const parser = new DOMParser();
          const doc = parser.parseFromString(svg.content, "image/svg+xml");
          // Look for the element using a data attribute (e.g. data-editable-id).
          const editableId = selectedElement.element.getAttribute("data-editable-id");
          let elementToUpdate: Element | null = null;
          
          if (editableId) {
            elementToUpdate = doc.querySelector(`[data-editable-id="${editableId}"]`);
          }
          if (!elementToUpdate) {
            // Fallback: for text, use the first <text>; for color, the first element with a fill.
            elementToUpdate =
              selectedElement.type === "text"
                ? doc.querySelector("text")
                : doc.querySelector("[fill]");
          }
          if (elementToUpdate) {
            if (selectedElement.type === "text") {
              elementToUpdate.textContent = newValue;
            } else {
              elementToUpdate.setAttribute("fill", newValue);
            }
          }
          const serializer = new XMLSerializer();
          const updatedContent = serializer.serializeToString(doc);
          console.log("Updated SVG content:", updatedContent);
          return { ...svg, content: updatedContent };
        }
        return svg;
      })
    );
    setSelectedElement({ ...selectedElement, value: newValue });
  };

  const closeEditor = () => {
    setSelectedElement(null);
  };

  const buildExportUrl = () => {
    const baseUrl = `https://localhost:3000/${projectId}`;
    const params = new URLSearchParams();
    // For every file (other than the tagged graphic) with a variable name…
    svgs.forEach((svg) => {
      if (svg.id !== graphicId && svg.variableName && svg.variableName.trim() !== "") {
        const key = svg.variableName.trim();
        // Use a placeholder value (double curly braces)
        params.append(key, `{{${key}}}`);
      }
    });
    return `${baseUrl}?${params.toString()}`;
  };

  // -------------------------------
  // (Optional) You can update the URL in the browser or simply display it.
  // -------------------------------
  useEffect(() => {
    const exportUrl = buildExportUrl();
    // For example, update a state variable or the router query (with shallow routing) if desired.
  }, [svgs, projectId, graphicId]);

  // -------------------------------
  // RENDER
  // -------------------------------
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar: Display uploaded file names */}
      <div style={{ width: "250px", borderRight: "1px solid #ccc", padding: "10px", overflowY: "auto" }}>
        <h3>Uploaded Files</h3>
        <input type="file" multiple accept=".svg" onChange={handleFileUpload} />
        <ul style={{ listStyle: "none", padding: 0 }}>
          {svgs.map((svg) => (
            <li
              key={svg.id}
              style={{
                marginBottom: "10px",
                padding: "5px",
                border: "1px solid #ddd",
                background: graphicId === svg.id ? "#e0f0ff" : "white"
              }}
            >
              <div>
                <strong>{svg.name}</strong>
              </div>
              {graphicId === svg.id ? (
                <div style={{ color: "blue", fontWeight: "bold" }}>Graphic</div>
              ) : (
                <button onClick={() => handleTagAsGraphic(svg.id)} style={{ fontSize: "12px", marginTop: "5px" }}>
                  Tag as Graphic
                </button>
              )}
              {/* For files that are not tagged as the graphic, allow variable name assignment */}
              {graphicId !== svg.id && (
                <div style={{ marginTop: "5px" }}>
                  <input
                    type="text"
                    placeholder="Variable name (e.g., profileIMG)"
                    value={svg.variableName || ""}
                    onChange={(e) => handleVariableNameChange(svg.id, e.target.value)}
                    style={{ fontSize: "12px", width: "100%" }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Editor Area */}
      <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ marginRight: "10px" }}>Project Name</label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Project ID"
            style={{ fontSize: "16px", padding: "5px" }}
          />
        </div>

        <div style={{ 
          marginTop: "20px", 
          padding: "15px", 
          border: "1px solid #ddd", 
          borderRadius: "4px",
          backgroundColor: "#f8f9fa"
        }}>
          <h3 style={{ marginBottom: "10px" }}>Export URL</h3>
          <div style={{ 
            padding: "10px", 
            backgroundColor: "white", 
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            wordBreak: "break-all",
            fontFamily: "monospace"
          }}>
            {buildExportUrl()}
          </div>
        </div>

        {/* Display all imported files */}
        <div style={{ marginTop: "20px" }}>
          <h2>Canvas Editor</h2>
          <div
            style={{
              position: "relative",
              width: "800px",
              height: "600px",
              border: "1px solid #ddd",
              overflow: "hidden"
            }}
          >
            {svgs.map((svg) => (
              <div
                key={svg.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0
                }}
              >
                <DraggableSvg
                  svgId={svg.id}
                  content={svg.content}
                  onElementSelect={handleElementSelect}
                  onSvgContentUpdate={(updatedContent) =>
                    setSvgs((prev) =>
                      prev.map((s) =>
                        s.id === svg.id ? { ...s, content: updatedContent } : s
                      )
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Editor panel below canvas */}
        {selectedElement && (
          <div
            style={{
              marginTop: "20px",
              padding: "10px",
              border: "1px solid #ddd",
              background: "#f9f9f9"
            }}
          >
            <h3>Editing {selectedElement.type === "text" ? "Text" : "Color"}</h3>
            {selectedElement.type === "text" ? (
              <input
                type="text"
                value={selectedElement.value}
                onChange={handleEditorChange}
                style={{ fontSize: "16px", padding: "5px" }}
              />
            ) : (
              <input
                type="color"
                value={selectedElement.value}
                onChange={handleEditorChange}
                style={{ width: "50px", height: "50px", border: "none" }}
              />
            )}
            <button onClick={closeEditor} style={{ marginTop: "10px" }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
