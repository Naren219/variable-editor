import React, { useState } from "react";

interface Props {
  variable: TaggedVariable;
  updateTaggedVariableName: (id: string, type: "text" | "color", value: string) => void;
}

export default function TaggedVariableItem({
  variable,
  updateTaggedVariableName,
}: Props) {
  // Local state to hold the input value
  const [localName, setLocalName] = useState(variable.variableName ?? "");

  // Determine background color based on variable type
  const bgColor =
    variable.type === "text"
      ? "bg-blue-100"
      : variable.type === "color"
      ? "bg-green-100"
      : "bg-gray-100";

  return (
    <li
      className={`p-3 ${bgColor} rounded-lg shadow-sm flex flex-col md:flex-row items-center gap-2`}
    >
      <span className="text-sm text-gray-600">
        <span className="font-semibold">Type:</span> {variable.type}
      </span>
      <input
        type="text"
        placeholder="Variable Name"
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        className="w-32"
      />
      <button
        type="button"
        className="p-2 bg-blue-500 text-white rounded"
        onClick={() =>
          updateTaggedVariableName(variable.id!, variable.type, localName)
        }
      >
        &#10003;
      </button>
    </li>
  );
}
