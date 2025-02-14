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
    <Rnd
      default={{
        x: 0,
        y: 0,
        width: 200,
        height: 200,
      }}
      bounds="parent"
      // Specify a CSS class for the drag handle
      dragHandleClassName="drag-handle"
      style={{
        border: "1px dashed #aaa",
        background: "#fff",
      }}
    >
      {/* This div acts as the drag handle */}
      <div
        className="drag-handle"
        style={{
          background: "#eee",
          padding: "5px",
          cursor: "move",
          userSelect: "none",
        }}
      >
        Drag Here
      </div>
      {/* The interactive SVG content */}
      {/* <div>
        <SvgItem
          svgId={svgId}
          content={content}
          onElementSelect={onElementSelect}
          onSvgContentUpdate={onSvgContentUpdate}
        />
      </div> */}
    </Rnd>
  );
};

export default DraggableSvg;
