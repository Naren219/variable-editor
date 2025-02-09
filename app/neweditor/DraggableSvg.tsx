"use client";
import React, { useRef } from "react";
import Draggable from "react-draggable";
import SvgItem from "./SvgItem";
import { Rnd } from "react-rnd";
import { getSvgDimensions } from "./utils/getSvgDimensions";

interface DraggableSvgProps {
  svgId: string;
  content: string;
  onElementSelect: (svgId: string, element: HTMLElement, type: "text" | "color") => void;
  onSvgContentUpdate: (updatedContent: string) => void;
}

const DraggableSvg: React.FC<DraggableSvgProps> = ({ svgId, content, onElementSelect, onSvgContentUpdate }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const { width, height } = getSvgDimensions(content);

  return (
    // <Rnd
    //   default={{
    //     x: 0,
    //     y: 0,
    //     width,
    //     height
    //   }}
    //   bounds="parent"
    //   style={{
    //     border: "1px dashed #aaa",
    //     background: "#fff",
    //   }}
    //   // nodeRef={nodeRef as React.RefObject<HTMLDivElement>}
    // >
      <Draggable nodeRef={nodeRef as React.RefObject<HTMLDivElement>}>
        <div
          ref={nodeRef}
          style={{
          }}
        >
          <SvgItem
            svgId={svgId}
            content={content}
            onElementSelect={onElementSelect}
            onSvgContentUpdate={onSvgContentUpdate}
          />
        </div>
      </Draggable>
    // </Rnd>
  );
};

export default DraggableSvg;
