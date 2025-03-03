import React from "react";
import { UploadItem } from "../page";

interface UploadItemProps {
  item: UploadItem;
  handleTagAsGraphic: (id: string) => void;
  handleVariableNameChange: (id: string, newVarName: string) => void;
  deleteUploadItem: (id: string) => void;
}

const UploadItemCard: React.FC<UploadItemProps> = ({
  item,
  handleTagAsGraphic,
  handleVariableNameChange,
  deleteUploadItem,
}) => {
  return (
    <li
      key={item.id}
      style={{
        marginBottom: "10px",
        padding: "5px",
        border: "1px solid #ddd",
        background: "#fff",
      }}
    >
      <div>
        <strong>{item.name}</strong>
      </div>
      {item.type === "image" && (
        <div style={{ marginTop: "5px" }}>
          <button
            onClick={() => handleTagAsGraphic(item.id)}
            style={{
              fontSize: "12px", marginBottom: "5px"
            }}
          >
            Tag as Graphic
          </button>
          <input
            type="text"
            placeholder="Variable name"
            value={item.variableName || ""}
            onChange={(e) => handleVariableNameChange(item.id, e.target.value)}
            style={{
              fontSize: "12px",
              width: "100%",
              padding: "5px 10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              outline: "none",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              marginBottom: "5px",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(174, 218, 182, 0.5)";
              e.currentTarget.style.boxShadow = "0 0 5px rgba(77, 255, 113, 0.5)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#ccc";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

        </div>
      )}
      {item.type === "graphic" && (
        <div style={{ marginTop: "5px", color: "blue", fontWeight: "bold" }}>
          Graphic (Editable)
        </div>
      )}
      <button
        onClick={() => deleteUploadItem(item.id)}
        style={{
          backgroundColor: "#ff4d4f",
          border: "none",
          borderRadius: "4px",
          padding: "2px 5px",
          fontSize: "12px",
          color: "#fff",
          cursor: "pointer",
          fontWeight: "bold",
          transition: "background-color 0.2s ease",
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ff7875";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ff4d4f";
        }}
      >
        Delete
      </button>
    </li>
  );
};

export default UploadItemCard;
