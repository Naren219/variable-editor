import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import DraggableSvg from "../neweditor/DraggableSvg"; // Your draggable SVG component

// --- Interfaces ---
interface MainSvg {
  id: string;
  content: string;
  customName?: string;
}

interface UploadedImage {
  id: string;
  url: string;
}

interface SelectedElement {
  svgId: string;
  type: "text" | "color";
  element: HTMLElement;
  value: string;
}

// --- Main Component ---
const App = () => {
  const router = useRouter();

  // State for the main SVG graphic (only one editable SVG is used)
  const [mainSvg, setMainSvg] = useState<MainSvg | null>(null);
  // State for other image assets
  const [images, setImages] = useState<UploadedImage[]>([]);
  // State for the currently selected SVG element (for editing text or color)
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  // -------------------------------
  // File Upload Handler  
  // Accepts both SVG (for the main graphic) and other image files.
  // -------------------------------
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          // Check file type:
          if (file.type === "image/svg+xml") {
            // For SVG files, treat it as the main graphic.
            const content = e.target?.result as string;
            const id = `${file.name}-${Date.now()}`;
            setMainSvg({ id, content });
          } else {
            // For other images, read as a data URL.
            const url = e.target?.result as string;
            const id = `${file.name}-${Date.now()}`;
            setImages((prev) => [...prev, { id, url }]);
          }
        };
        if (file.type === "image/svg+xml") {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      });
    }
  };

  // -------------------------------
  // When an SVG element (inside the main graphic) is clicked
  // -------------------------------
  const handleElementSelect = (
    svgId: string,
    element: HTMLElement,
    type: "text" | "color"
  ) => {
    // For text, use its textContent; for color, use its "fill" attribute.
    const value =
      type === "text"
        ? element.textContent || ""
        : element.getAttribute("fill") || "#000000";
    setSelectedElement({ svgId, type, element, value });
  };

  // -------------------------------
  // Update the selected element's value in the main SVG  
  // (For text edits or changing fill colors)
  // -------------------------------
  const handleEditorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedElement || !mainSvg) return;
    const newValue = e.target.value;

    // Parse the current SVG content and update the target element.
    const parser = new DOMParser();
    const doc = parser.parseFromString(mainSvg.content, "image/svg+xml");

    // Try to locate the element using its data-editable-id attribute.
    const editableId = selectedElement.element.getAttribute("data-editable-id");
    let elementToUpdate: Element | null = null;
    if (editableId) {
      elementToUpdate = doc.querySelector(`[data-editable-id="${editableId}"]`);
    }
    // Fallback: if not found, select the first matching element.
    if (!elementToUpdate) {
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
    setMainSvg({ ...mainSvg, content: updatedContent });
    setSelectedElement({ ...selectedElement, value: newValue });
  };

  // -------------------------------
  // Update the main SVG content externally if needed.
  // -------------------------------
  const handleSvgContentUpdate = (updatedContent: string) => {
    if (!mainSvg) return;
    setMainSvg({ ...mainSvg, content: updatedContent });
  };

  // -------------------------------
  // Close the editing panel.
  // -------------------------------
  const closeEditor = () => {
    setSelectedElement(null);
  };

  // -------------------------------
  // Handler for setting a custom name for the main SVG graphic.
  // (This custom name will be used as the key in the URL query string.)
  // -------------------------------
  const handleCustomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!mainSvg) return;
    const newName = e.target.value;
    setMainSvg({ ...mainSvg, customName: newName });
  };

  // -------------------------------
  // Update URL Query Parameters  
  // This effect ensures that the URL reflects:
  //   - The main SVG's content under a key equal to its custom name (or "svg" if none provided)
  //   - Each accompanying image's data URL under keys like "img_<id>"
  // -------------------------------
  useEffect(() => {
    const queryObj: Record<string, string> = {};
    if (mainSvg) {
      // Use the custom name if provided, or default to "svg"
      const key =
        mainSvg.customName && mainSvg.customName.trim() !== ""
          ? mainSvg.customName
          : "svg";
      queryObj[key] = mainSvg.content;
    }
    images.forEach((img) => {
      queryObj[`img_${img.id}`] = img.url;
    });
    router.replace({ query: queryObj }, undefined, { shallow: true });
  }, [mainSvg, images, router]);

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <div className="App" style={{ padding: "20px" }}>
      <h1>SVG & Image Editor</h1>
      <input
        type="file"
        multiple
        accept="image/svg+xml,image/*"
        onChange={handleFileUpload}
      />

      {/* Main SVG Graphic Section */}
      {mainSvg && (
        <div style={{ marginTop: "20px" }}>
          <h2>Main SVG Graphic</h2>
          {/* Input for the custom name of the SVG */}
          <div style={{ marginBottom: "10px" }}>
            <label style={{ marginRight: "5px" }}>
              Custom Name for SVG:
            </label>
            <input
              type="text"
              value={mainSvg.customName || ""}
              onChange={handleCustomNameChange}
              placeholder="e.g., logo"
              style={{ fontSize: "16px", padding: "5px" }}
            />
          </div>
          <DraggableSvg
            svgId={mainSvg.id}
            content={mainSvg.content}
            onElementSelect={handleElementSelect}
            onSvgContentUpdate={handleSvgContentUpdate}
          />
        </div>
      )}

      {/* Accompanying Images Section */}
      {images.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h2>Accompanying Images</h2>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {images.map((img) => (
              <div key={img.id} style={{ margin: "10px" }}>
                <img
                  src={img.url}
                  alt="uploaded"
                  style={{ maxWidth: "200px", maxHeight: "200px" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor Panel for the selected SVG element */}
      {selectedElement && (
        <div className="editor-panel" style={panelStyle}>
          <h2>
            Editing {selectedElement.type === "text" ? "Text" : "Color"}
          </h2>
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
          <div style={{ marginTop: "10px" }}>
            <button onClick={closeEditor}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

const panelStyle: React.CSSProperties = {
  marginTop: "20px",
  padding: "10px",
  border: "1px solid #ddd",
  backgroundColor: "#f9f9f9",
  display: "inline-block"
};

export default App;
