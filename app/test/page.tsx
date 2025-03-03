"use client";

import React, { useEffect, useState } from 'react';

const TestSVGMarkerPage: React.FC = () => {
  const [finalSVG, setFinalSVG] = useState<string>('');

  useEffect(() => {
    // Fetch the SVG from your public folder (ensure you have placed your file there).
    fetch('/graphic-test.svg')
      .then((res) => res.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgEl = doc.documentElement;
        console.log(svgEl);
        
        // Create a marker: a red circle at a specific position (adjust as needed)
        const marker = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        marker.setAttribute('cx', '300'); // x-coordinate in SVG coordinate system
        marker.setAttribute('cy', '300'); // y-coordinate in SVG coordinate system
        marker.setAttribute('r', '5');
        marker.setAttribute('fill', 'red');

        // Append the marker to the SVG.
        svgEl.appendChild(marker);

        // Serialize the updated SVG.
        const serializer = new XMLSerializer();
        const updatedSVG = serializer.serializeToString(doc);
        setFinalSVG(updatedSVG);
      })
      .catch((err) => console.error('Error loading SVG:', err));
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>SVG Marker Test Page</h1>
      {finalSVG ? (
        <div
          style={{ margin: '0 auto', border: '1px solid #ccc' }}
          id="finalGraphic"
          dangerouslySetInnerHTML={{ __html: finalSVG }}
        />
      ) : (
        <p>Loading SVG...</p>
      )}
    </div>
  );
};

export default TestSVGMarkerPage;
