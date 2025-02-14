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

interface EditedImage {
  id: string;
  svg: string;
  x: number;  
  y: number;  
}

interface EditorState {
  graphic: string;
  tags: TagInfo[];
  images: EditedImage[];
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
        const baseSvgContent = await loadSvgFromFirebase(state.graphic);
        const parser = new DOMParser();
        const doc = parser.parseFromString(baseSvgContent, "image/svg+xml");
        // colors and text
        state.tags.forEach((tag) => {
          if (tag.type === "text") {
            const textCandidates = Array.from(doc.querySelectorAll("text"));
            const candidate = findClosestElement(textCandidates, tag.x, tag.y);
            if (candidate) {
              candidate.textContent = tag.value;
            }
          } else if (tag.type === "color") {
            const fillCandidates = Array.from(doc.querySelectorAll("[fill]"));
            const candidate = findClosestElement(fillCandidates, tag.x, tag.y);
            if (candidate) {
              candidate.setAttribute("fill", tag.value);
            }
          }
        });

        const candidateGroups = Array.from(doc.querySelectorAll("g"));
        const insertionParent = candidateGroups.length > 0 ? candidateGroups : [doc.documentElement];

        // additional images
        for (const img of state.images) {
          const imageSvgContent = await loadSvgFromFirebase(img.svg);
          const imageDoc = parser.parseFromString(imageSvgContent, "image/svg+xml");
          const imageRoot = imageDoc.documentElement;
          const g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
          g.setAttribute("transform", `translate(${img.x}, ${img.y})`);
          Array.from(imageRoot.childNodes).forEach((child) => {
            g.appendChild(doc.importNode(child, true));
          });
          const insertionPoint = findClosestElement(insertionParent, img.x, img.y) || doc.documentElement;
          insertionPoint.appendChild(g);
        }

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
