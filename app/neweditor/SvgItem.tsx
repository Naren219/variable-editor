"use client";

import React, { useEffect, useRef } from "react";

interface SvgItemProps {
  svgId: string;
  content: string;
  onElementSelect: (svgId: string, element: HTMLElement, type: "text" | "color") => void;
  onSvgContentUpdate: (updatedContent: string) => void;
}

const SvgItem: React.FC<SvgItemProps> = ({ svgId, content, onElementSelect, onSvgContentUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (containerRef.current) {
      const textElements = containerRef.current.querySelectorAll<HTMLElement>("text");
      const textHandlers: Array<{ el: HTMLElement; handler: EventListener }> = [];
      textElements.forEach((el) => {
        el.style.cursor = "pointer";
        const handler = (e: Event) => {
          e.stopPropagation();
          if (!el.hasAttribute("data-editable-id")) {
            el.setAttribute("data-editable-id", `editable-${Date.now()}-${Math.random()}`);
            if (containerRef.current) {
              onSvgContentUpdate(containerRef.current.innerHTML);
            }
          }
          onElementSelect(svgId, el, "text");
        };
        el.addEventListener("click", handler);
        textHandlers.push({ el, handler });
      });

      const allPotentialColorElements = containerRef.current.querySelectorAll<HTMLElement>(
        "rect, circle, ellipse, polygon, path, line, g"
      );
      
      const colorHandlers: Array<{ el: HTMLElement; handler: EventListener }> = [];
      allPotentialColorElements.forEach((el) => {
        const fillAttr = el.getAttribute("fill");
        const inlineFill = el.style.fill;
        const computedFill = window.getComputedStyle(el).fill;
        const fillValue = fillAttr || inlineFill || computedFill;
        if (fillValue && fillValue !== "none") {
          el.style.cursor = "pointer";
          const handler = (e: Event) => {
            e.stopPropagation();
            if (!el.hasAttribute("data-editable-id")) {
              const unique = `editable-${Date.now()}-${Math.random()}`;
              el.setAttribute("data-editable-id", unique);
              if (containerRef.current) {
                const svgElement = containerRef.current.querySelector("svg");
                if (svgElement) {
                  onSvgContentUpdate(svgElement.outerHTML);
                }
              }
            }
            onElementSelect(svgId, el, "color");
          };
          el.addEventListener("click", handler);
          colorHandlers.push({ el, handler });
        }
      });      

      return () => {
        textHandlers.forEach(({ el, handler }) => el.removeEventListener("click", handler));
        colorHandlers.forEach(({ el, handler }) => el.removeEventListener("click", handler));
      };
    }
  }, [content, onElementSelect, svgId]);

  return (
    <div
      ref={containerRef}
      // style={{ width: "100%", height: "100%" }}
      style={{ width: "800px", height: "800px" }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default SvgItem;
