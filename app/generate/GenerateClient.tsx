"use client"

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

function parseState(encoded: string): ExportSchema | null {
  try {
    const decoded = decodeURIComponent(encoded)
    return JSON.parse(decoded) as ExportSchema;
  } catch (error) {
    console.error("Error parsing state:", error);
    return null;
  }
}

function getRenderedBBox(el: SVGGraphicsElement): DOMRect {
  // Create a temporary container that is rendered but invisible.
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "0";
  container.style.left = "0";
  container.style.opacity = "0"; // rendered but invisible
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  // Clone the element so we don't disturb the original.
  const clone = el.cloneNode(true) as SVGGraphicsElement;
  container.appendChild(clone);

  // Force a reflow.
  // void container.offsetHeight;
  void container.getBoundingClientRect();
  
  const bbox = clone.getBBox();
  document.body.removeChild(container);
  return bbox;
}

function getEffectiveBBox(el: SVGGraphicsElement): DOMRect {
  // Try to get the bbox directly.
  let bbox = el.getBBox();
  // If the dimensions are 0, the element might not be rendered.
  if (bbox.width === 0 && bbox.height === 0) {
    // Create a temporary offscreen SVG container.
    const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tempSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    tempSvg.style.position = "absolute";
    tempSvg.style.left = "-9999px";
    tempSvg.style.top = "-9999px";
    document.body.appendChild(tempSvg);

    // Clone the element and append it.
    const clone = el.cloneNode(true) as SVGGraphicsElement;
    tempSvg.appendChild(clone);

    // Force a reflow.
    void tempSvg.getBoundingClientRect();

    // Now measure the clone.
    bbox = clone.getBBox();

    // Clean up.
    document.body.removeChild(tempSvg);
  }
  return bbox;
}

function getAbsoluteBBox(el: SVGGraphicsElement): DOMRect {
  const bbox = el.getBBox();
  const ctm = el.getScreenCTM();
  console.log("CTM", ctm);
  
  if (ctm) {
    // Transform the top-left corner
    const absoluteX = bbox.x * ctm.a + bbox.y * ctm.c + ctm.e;
    const absoluteY = bbox.x * ctm.b + bbox.y * ctm.d + ctm.f;
    // Estimate width and height using the scale factors from the CTM.
    // This works best when there's no skew.
    const absoluteWidth = bbox.width * ctm.a;
    const absoluteHeight = bbox.height * ctm.d;
    return new DOMRect(absoluteX, absoluteY, absoluteWidth, absoluteHeight);
  }
  // Fallback: if no CTM, return the local bbox.
  return bbox;
}

function findClosestElement(
  candidates: SVGGraphicsElement[],
  targetX: number,
  targetY: number
): Element | null {
  let closest: Element | null = null;
  let minDistance = Infinity;
  candidates.forEach((el) => {
    const bbox = getEffectiveBBox(el);
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    // console.log(bbox);
    console.log(centerX, centerY);
    
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

const GenerateClient: React.FC = () => {
  const searchParams = useSearchParams()
  const data = searchParams.get("data");
  const [finalSVG, setFinalSVG] = useState<string>("");

  useEffect(() => {
    if (!data) return;
    const state = parseState(data);
    if (!state) return;
    
    const loadAndProcessSVG = async () => {
      try {
        const baseSvgContent = await loadSvgFromFirebase(state.graphic.file); // FIREBASE!!
        const parser = new DOMParser();
        const doc = parser.parseFromString(baseSvgContent, "image/svg+xml");
        if (state.graphic.width && state.graphic.height) {
          doc.documentElement.setAttribute("width", state.graphic.width.toString());
          doc.documentElement.setAttribute("height", state.graphic.height.toString());
        }

        // colors and text
        state.tags.forEach((tag) => {
          if (tag.type === "text") {
            const textCandidates = Array.from(doc.querySelectorAll("text")) as SVGGraphicsElement[];
            // const candidate = findClosestElement(textCandidates, tag.x, tag.y);
            
            if (tag.index >= 0 && tag.index < textCandidates.length) {
              const candidate = textCandidates[tag.index];
              // Clear old content.
              while (candidate.firstChild) {
                candidate.removeChild(candidate.firstChild);
              }
              candidate.appendChild(doc.createTextNode(tag.value ?? ""));
            }

            // if (candidate) {
            //   candidate.innerHTML = "";
            //   candidate.textContent = tag.value ?? "";
            // }
          } else if (tag.type === "color") {
            let fillCandidates = Array.from(doc.querySelectorAll("[fill]"));
            if (fillCandidates.length === 0) {
              fillCandidates = Array.from(doc.querySelectorAll("path, rect, circle, polygon, polyline"));
            }

            // const candidate = findClosestElement(fillCandidates, tag.x, tag.y);
            
            // if (candidate) {
            //   if (candidate.hasAttribute("fill")) {
            //     candidate.setAttribute("fill", tag.value ?? "");
            //   } else if (candidate.getAttribute("style")) {
            //     let styleStr = candidate.getAttribute("style") || "";
            //     styleStr = styleStr.replace(/fill\s*:\s*[^;]+/, `fill: ${tag.value ?? ""}`);
            //     candidate.setAttribute("style", styleStr);
            //   }
            // }
          }
        });

        // additional images
        if (state.images && state.images.length > 0) {
          const layers: Layer[] = [...state.images].sort((a, b) => a.order - b.order);

          const additionalGroup = doc.createElementNS("http://www.w3.org/2000/svg", "g");
          additionalGroup.setAttribute("id", "additionalImages");
          for (const img of layers) {
            const imageSvgContent = await loadSvgFromFirebase(img.file); // FIREBASE!!
            const imageDoc = parser.parseFromString(imageSvgContent, "image/svg+xml");
            const imageRoot = imageDoc.documentElement;

            let scaleX = 1;
            let scaleY = 1;
            if (img.width && img.height) {
              let origWidth = 0;
              let origHeight = 0;
              // First try to get explicit width/height attributes.
              const origWidthAttr = imageRoot.getAttribute("width");
              const origHeightAttr = imageRoot.getAttribute("height");
              if (origWidthAttr && origHeightAttr) {
                origWidth = parseFloat(origWidthAttr);
                origHeight = parseFloat(origHeightAttr);
              }
              // Fallback: if width/height attributes are missing, try viewBox.
              if (!origWidth || !origHeight) {
                const viewBox = imageRoot.getAttribute("viewBox");
                if (viewBox) {
                  const parts = viewBox.split(/\s+|,/);
                  if (parts.length === 4) {
                    origWidth = parseFloat(parts[2]);
                    origHeight = parseFloat(parts[3]);
                  }
                }
              }
              if (origWidth && origHeight) {
                scaleX = img.width / origWidth;
                scaleY = img.height / origHeight;
              } else {
                scaleX = 1;
                scaleY = 1;
              }
            }

            const g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${img.x ?? 0}, ${img.y ?? 0}) scale(${scaleX}, ${scaleY})`);

            Array.from(imageRoot.childNodes).forEach((child) => {
              g.appendChild(doc.importNode(child, true));
            });

            additionalGroup.appendChild(g);
          }

          doc.documentElement.appendChild(additionalGroup);
        }
        const serializer = new XMLSerializer();
        const updatedSVG = serializer.serializeToString(doc);
        setFinalSVG(updatedSVG);
      } catch (error) {
        console.error("Error processing SVGs:", error);
      }
    };

    loadAndProcessSVG();
  }, [data]);

  return (
    <div>
      {finalSVG ? (
        <div
          id="finalGraphic"
          style={{
            width: '800px',
            height: '600px',
            background: '#fff',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          }}
          dangerouslySetInnerHTML={{ __html: finalSVG }}
        />
      ) : (
        <p>Loading graphic...</p>
      )}
    </div>
  );
};

export default GenerateClient;
