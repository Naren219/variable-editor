"use client"
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

interface TagInfo {
  type: "text" | "color";
  x: number;
  y: number;
  value: string;
}

interface Layer {
  id?: string;
  file: string;
  x?: number;  
  y?: number;
  variableName?: string;
  width?: number;
  height?: number;
  order: number;
}

interface EditorState {
  graphic: Layer;
  tags: TagInfo[];
  images: Layer[];
}
  
function parseState(encoded: string): EditorState | null {
  try {
    const decoded = decodeURIComponent(encoded)
    return JSON.parse(decoded) as EditorState;
  } catch (error) {
    console.error("Error parsing state:", error);
    return null;
  }
}

function findClosestElement(
  candidates: Element[],
  targetX: number,
  targetY: number
): Element | null {
  let closest: Element | null = null;
  let minDistance = Infinity;
  candidates.forEach((el) => {
    const bbox = (el as SVGGraphicsElement).getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    const dx = centerX - targetX;
    const dy = centerY - targetY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDistance) {
      minDistance = dist;
      closest = el;
    }
  });
  return closest;
}

async function loadSvgFromFirebase(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  const downloadUrl = await getDownloadURL(storageRef);
  const response = await fetch(downloadUrl);
  return response.text();
}

const GeneratePage: React.FC = () => {
  const searchParams = useSearchParams()
  const [finalSVG, setFinalSVG] = useState<string>("");

  useEffect(() => {
    const data = searchParams.get("data");
    if (!data) return;
    const state = parseState(data);
    if (!state) return;
    
    const loadAndProcessSVG = async () => {
      try {
        const baseSvgContent = await loadSvgFromFirebase(state.graphic.file); // FIREBASE!!
        const parser = new DOMParser();
        const doc = parser.parseFromString(baseSvgContent, "image/svg+xml");

        // colors and text
        state.tags.forEach((tag) => {
          if (tag.type === "text") {
            const textCandidates = Array.from(doc.querySelectorAll("text"));
            const candidate = findClosestElement(textCandidates, tag.x, tag.y);
            if (candidate) {
              candidate.innerHTML = "";
              candidate.textContent = tag.value;
            }
          } else if (tag.type === "color") {
            let fillCandidates = Array.from(doc.querySelectorAll("[fill]"));
            if (fillCandidates.length === 0) {
              fillCandidates = Array.from(doc.querySelectorAll("path, rect, circle, polygon, polyline"));
            }

            const candidate = findClosestElement(fillCandidates, tag.x, tag.y);
            
            if (candidate) {
              if (candidate.hasAttribute("fill")) {
                candidate.setAttribute("fill", tag.value);
              } else if (candidate.getAttribute("style")) {
                let styleStr = candidate.getAttribute("style") || "";
                styleStr = styleStr.replace(/fill\s*:\s*[^;]+/, `fill: ${tag.value}`);
                candidate.setAttribute("style", styleStr);
              }
            }
          }
        });

        // additional images
        const layers: Layer[] = [...state.images].sort((a, b) => a.order - b.order);
        // const candidateGroups = Array.from(doc.querySelectorAll("g"));
        // const insertionParent = candidateGroups.length > 0 ? candidateGroups : [doc.documentElement];

        const additionalGroup = doc.createElementNS("http://www.w3.org/2000/svg", "g");
        additionalGroup.setAttribute("id", "additionalImages");
        for (const img of layers) {
          const imageSvgContent = await loadSvgFromFirebase(img.file); // FIREBASE!!
          const imageDoc = parser.parseFromString(imageSvgContent, "image/svg+xml");
          const imageRoot = imageDoc.documentElement;

          let scaleX = 1;
          let scaleY = 1;
          if (img.width && img.height) {
            const origWidthAttr = imageRoot.getAttribute("width");
            const origHeightAttr = imageRoot.getAttribute("height");
            if (origWidthAttr && origHeightAttr) {
              const origWidth = parseFloat(origWidthAttr);
              const origHeight = parseFloat(origHeightAttr);
              if (origWidth && origHeight) {
                scaleX = img.width / origWidth;
                scaleY = img.height / origHeight;
              }
            }
          }

          const g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
          g.setAttribute("transform", `translate(${img.x ?? 0}, ${img.y ?? 0}) scale(${scaleX}, ${scaleY})`);

          Array.from(imageRoot.childNodes).forEach((child) => {
            g.appendChild(doc.importNode(child, true));
          });

          additionalGroup.appendChild(g);
          // const insertionPoint = findClosestElement(insertionParent, img.x ?? 0, img.y ?? 0) || doc.documentElement;
          // insertionPoint.appendChild(g);
        }

        doc.documentElement.appendChild(additionalGroup);

        const serializer = new XMLSerializer();
        const updatedSVG = serializer.serializeToString(doc);
        setFinalSVG(updatedSVG);
      } catch (error) {
        console.error("Error processing SVGs:", error);
      }
    };

    loadAndProcessSVG();
  }, [searchParams]);

  return (
    <div style={{ padding: "20px" }}>
      {finalSVG ? (
        <div
          style={{
            padding: "10px",
            background: "#fff",
            maxWidth: "800px",
            margin: "0 auto",
          }}
          dangerouslySetInnerHTML={{ __html: finalSVG }}
        />
      ) : (
        <p>Loading graphic...</p>
      )}
    </div>
  );
};

export default GeneratePage;
