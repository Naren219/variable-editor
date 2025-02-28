"use client"

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { handleSVGElementSelection } from "../utils/FindElement";

async function loadSvgFromFirebase(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  const downloadUrl = await getDownloadURL(storageRef);
  const response = await fetch(downloadUrl);
  return response.text();
}

const GenerateClient: React.FC = () => {
  const searchParams = useSearchParams()
  const paramsObj = Object.fromEntries(searchParams.entries());
  const { projectId, graphicName, ...otherVariables } = paramsObj;
  
  const [finalSVG, setFinalSVG] = useState<string>("");
  const [state, setState] = useState<ExportSchema>()

  function applyOverrides(
    state: ExportSchema,
    urlParams: { [key: string]: string }
  ): ExportSchema {
    const updatedTags = state.tags.map((tag) => {
      if (tag.value !== undefined && urlParams[tag.value] !== undefined) {
        return { ...tag, value: urlParams[tag.value] };
      }
      return tag;
    });
  
    const updatedImages = state.images.map((image) => {
      if (image.fileName !== undefined && urlParams[image.fileName] !== undefined) {
        return { ...image, fileName: urlParams[image.fileName] };
      }
      return image;
    });
  
    return { ...state, tags: updatedTags, images: updatedImages };
  }
  
  useEffect(() => {
    if (!projectId) return;
    
    getDoc(doc(db, "schemas", projectId))
      .then((docSnap) => {
        if (docSnap.exists()) {
          const beforeState = docSnap.data() as ExportSchema
          const afterState = applyOverrides(beforeState, otherVariables);
          setState(afterState);
        } else {
          console.log(`No document found with projectId: ${projectId}`);
        }
      })
  }, [projectId]);

  useEffect(() => {
    if (!state) return;
    
    const loadAndProcessSVG = async () => {
      try {
        const baseSvgContent = await loadSvgFromFirebase(graphicName); // FIREBASE!!
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
            
            if (tag.index! >= 0 && tag.index! < textCandidates.length) {
              const candidate = textCandidates[tag.index!];
              while (candidate.firstChild) {
                candidate.removeChild(candidate.firstChild);
              }
              candidate.appendChild(doc.createTextNode(tag.value ?? ""));
            }
          } else if (tag.type === "color") {
            handleSVGElementSelection(
              doc,
              tag.x ?? 0,
              tag.y ?? 0,
              tag.value ?? ""
            );
          }
        });

        // additional images
        if (state.images && state.images.length > 0) {
          const layers: Layer[] = [...state.images].sort((a, b) => a.order - b.order);

          const additionalGroup = doc.createElementNS("http://www.w3.org/2000/svg", "g");
          additionalGroup.setAttribute("id", "additionalImages");
          for (const img of layers) {
            const imageSvgContent = await loadSvgFromFirebase(img.fileName);
            const imageDoc = parser.parseFromString(imageSvgContent, "image/svg+xml");
            const imageRoot = imageDoc.documentElement;

            let scaleX = 1;
            let scaleY = 1;
            let origWidth = 0;
            let origHeight = 0;
            let viewBoxX = 0;
            let viewBoxY = 0;

            if (img.width && img.height) {
              const origWidthAttr = imageRoot.getAttribute("width");
              const origHeightAttr = imageRoot.getAttribute("height");
              if (origWidthAttr && origHeightAttr) {
                origWidth = parseFloat(origWidthAttr);
                origHeight = parseFloat(origHeightAttr);
              }
              if (!origWidth || !origHeight) {
                const viewBox = imageRoot.getAttribute("viewBox");
                if (viewBox) {
                  const parts = viewBox.split(/\s+|,/);
                  if (parts.length === 4) {
                    viewBoxX = parseFloat(parts[0]);
                    viewBoxY = parseFloat(parts[1]);
                    origWidth = parseFloat(parts[2]);
                    origHeight = parseFloat(parts[3]);
                  }
                }
              }
              if (origWidth && origHeight) {
                scaleX = img.width / origWidth;
                scaleY = img.height / origHeight;
              }

              const translateX = (img.x ?? 0) - viewBoxX * scaleX;
              const translateY = (img.y ?? 0) - viewBoxY * scaleY;
              
              const g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
              g.setAttribute(
                "transform",
                `translate(${translateX}, ${translateY}) scale(${scaleX}, ${scaleY})`
              );

              Array.from(imageRoot.childNodes).forEach((child) => {
                g.appendChild(doc.importNode(child, true));
              });
  
              additionalGroup.appendChild(g);
            }
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
  }, [state]);

  return (
    <div>
      {finalSVG ? (
        <div
          id="finalGraphic"
          style={{
            background: '#fff',
            margin: '0 auto',
            display: 'inline-block',
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
