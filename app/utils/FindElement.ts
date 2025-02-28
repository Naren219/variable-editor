export function findClosestSVGElement(elements: Element[], targetX: number, targetY: number): Element | null {
  let closest: Element | null = null;
  let minDistance = Infinity;

  console.log("target", targetX, targetY);
  elements.forEach(el => {
    let center: { x: number, y: number } | null = null;
    const tagName = el.tagName.toLowerCase();
    
    // Get center based on element type
    switch (tagName) {
      case 'polygon':
      case 'polyline':
        const points = el.getAttribute('points');
        if (points) {
          center = getPointsCenter(points);
        }
        break;
      
      case 'rect':
        const x = parseFloat(el.getAttribute('x') || '0');
        const y = parseFloat(el.getAttribute('y') || '0');
        const width = parseFloat(el.getAttribute('width') || '0');
        const height = parseFloat(el.getAttribute('height') || '0');
        center = {
          x: x + width / 2,
          y: y + height / 2
        };
        break;
      
      case 'circle':
        const cx = parseFloat(el.getAttribute('cx') || '0');
        const cy = parseFloat(el.getAttribute('cy') || '0');
        center = { x: cx, y: cy };
        break;
      
      case 'path':
        const d = el.getAttribute('d');
        if (d) {
          center = estimatePathCenter(d);
        }
        break;
    }
    
    // Calculate distance if center was found
    if (center) {
      const distance = Math.sqrt(
        Math.pow(center.x - targetX, 2) + 
        Math.pow(center.y - targetY, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closest = el;
      }
    }
  });

  return closest;
}

/**
 * Calculate center point from polygon/polyline points attribute
 */
export function getPointsCenter(pointsString: string): { x: number, y: number } {
  // Split the points string and convert to numbers
  const coordinates = pointsString.trim().split(/[\s,]+/).map(Number);
  
  // Group into x,y pairs
  const points: { x: number, y: number }[] = [];
  for (let i = 0; i < coordinates.length - 1; i += 2) {
    points.push({
      x: coordinates[i],
      y: coordinates[i + 1]
    });
  }
  
  // Calculate the centroid (average of all points)
  const sumX = points.reduce((sum, point) => sum + point.x, 0);
  const sumY = points.reduce((sum, point) => sum + point.y, 0);
  
  return {
    x: sumX / points.length,
    y: sumY / points.length
  };
}

/**
 * Estimate center of a path element by parsing its d attribute
 */
export function estimatePathCenter(pathData: string): { x: number, y: number } {
  // Extract all absolute coordinate pairs from the path data
  const coordinates: { x: number, y: number }[] = [];
  const commandRegex = /([MLHVCSQTA])\s*([^MLHVCSQTA]+)/gi;
  let match;
  let lastX = 0, lastY = 0;
  
  // Current position tracking
  let currentX = 0, currentY = 0;

  while ((match = commandRegex.exec(pathData)) !== null) {
    const command = match[1].toUpperCase();
    const params = match[2].trim().split(/[\s,]+/).map(parseFloat);
    
    switch (command) {
      case 'M': // MoveTo
      case 'L': // LineTo
        for (let i = 0; i < params.length; i += 2) {
          if (i + 1 < params.length) {
            currentX = params[i];
            currentY = params[i + 1];
            coordinates.push({ x: currentX, y: currentY });
          }
        }
        break;
        
      case 'H': // Horizontal LineTo
        for (let i = 0; i < params.length; i++) {
          currentX = params[i];
          coordinates.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'V': // Vertical LineTo
        for (let i = 0; i < params.length; i++) {
          currentY = params[i];
          coordinates.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'C': // CurveTo - cubic Bézier
        for (let i = 0; i < params.length; i += 6) {
          if (i + 5 < params.length) {
            // Add only the end point of the curve
            currentX = params[i + 4];
            currentY = params[i + 5];
            coordinates.push({ x: currentX, y: currentY });
          }
        }
        break;
        
      case 'S': // Smooth CurveTo - cubic Bézier
        for (let i = 0; i < params.length; i += 4) {
          if (i + 3 < params.length) {
            // Add only the end point of the curve
            currentX = params[i + 2];
            currentY = params[i + 3];
            coordinates.push({ x: currentX, y: currentY });
          }
        }
        break;
        
      case 'Q': // QuadraticCurveTo
        for (let i = 0; i < params.length; i += 4) {
          if (i + 3 < params.length) {
            // Add only the end point of the curve
            currentX = params[i + 2];
            currentY = params[i + 3];
            coordinates.push({ x: currentX, y: currentY });
          }
        }
        break;
        
      case 'T': // Smooth QuadraticCurveTo
        for (let i = 0; i < params.length; i += 2) {
          if (i + 1 < params.length) {
            currentX = params[i];
            currentY = params[i + 1];
            coordinates.push({ x: currentX, y: currentY });
          }
        }
        break;
        
      case 'A': // EllipticalArc
        for (let i = 0; i < params.length; i += 7) {
          if (i + 6 < params.length) {
            // Add only the end point of the arc
            currentX = params[i + 5];
            currentY = params[i + 6];
            coordinates.push({ x: currentX, y: currentY });
          }
        }
        break;
    }
    
    // Remember last position
    lastX = currentX;
    lastY = currentY;
  }

  // If no coordinates were found, return origin
  if (coordinates.length === 0) {
    return { x: 0, y: 0 };
  }
  
  // Calculate the centroid
  const sumX = coordinates.reduce((sum, point) => sum + point.x, 0);
  const sumY = coordinates.reduce((sum, point) => sum + point.y, 0);
  
  console.log("coords", sumX / coordinates.length, sumY / coordinates.length);
  
  return {
    x: sumX / coordinates.length,
    y: sumY / coordinates.length
  };
}

/**
 * Apply the color change to an SVG element
 */
export function applyColorToElement(element: Element, color: string): void {
  if (element.hasAttribute('fill')) {
    element.setAttribute('fill', color);
  } else if (element.hasAttribute('style')) {
    let styleStr = element.getAttribute('style') || '';
    
    if (styleStr.includes('fill:')) {
      // Replace existing fill in style
      styleStr = styleStr.replace(/fill\s*:\s*[^;]+/, `fill: ${color}`);
    } else {
      // Add fill to style
      styleStr += styleStr.endsWith(';') ? ` fill: ${color};` : `; fill: ${color};`;
    }
    
    element.setAttribute('style', styleStr);
  } else {
    // No fill or style attribute, add fill
    element.setAttribute('fill', color);
  }
}

/**
 * Find the closest SVG element to a click point and apply a color
 */
export function handleSVGElementSelection(
  svgElement: Document,
  x: number,
  y: number,
  color: string
): Element | null {
  // Get all fillable elements
  let candidates = Array.from(svgElement.querySelectorAll("[fill]"));
  
  if (candidates.length === 0) {
    candidates = Array.from(svgElement.querySelectorAll("path, rect, circle, polygon, polyline"));
  }
  
  // Find closest element
  const closest = findClosestSVGElement(candidates, x, y);
  
  // Apply color if element found
  if (closest) {
    applyColorToElement(closest, color);
  }

  console.log(closest);
  
  
  return closest;
}

/**
 * Alternative approach: Use bounding box calculation for element finding
 */
export function findClosestElementWithBBox(elements: Element[], targetX: number, targetY: number): Element | null {
  let closest: Element | null = null;
  let minDistance = Infinity;
  
  // Force layout recalculation if needed
  document.body.getBoundingClientRect();
  
  elements.forEach(el => {
    try {
      // Try to get bounding box
      const svgEl = el as SVGGraphicsElement;
      const bbox = svgEl.getBBox();
      
      // Check if bbox has valid dimensions
      if (bbox && (bbox.width > 0 || bbox.height > 0)) {
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;
        
        const dx = centerX - targetX;
        const dy = centerY - targetY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDistance) {
          minDistance = dist;
          closest = el;
        }
      }
    } catch (e) {
      // If getBBox fails, try our attribute-based approach
      const center = getElementCenterFromAttributes(el);
      if (center) {
        const dist = Math.sqrt(
          Math.pow(center.x - targetX, 2) + 
          Math.pow(center.y - targetY, 2)
        );
        
        if (dist < minDistance) {
          minDistance = dist;
          closest = el;
        }
      }
    }
  });
  
  return closest;
}

/**
 * Get element center from attributes as a fallback method
 */
export function getElementCenterFromAttributes(el: Element): { x: number, y: number } | null {
  const tagName = el.tagName.toLowerCase();
  
  switch (tagName) {
    case 'rect':
      const x = parseFloat(el.getAttribute('x') || '0');
      const y = parseFloat(el.getAttribute('y') || '0');
      const width = parseFloat(el.getAttribute('width') || '0');
      const height = parseFloat(el.getAttribute('height') || '0');
      return { x: x + width / 2, y: y + height / 2 };
      
    case 'circle':
      return { 
        x: parseFloat(el.getAttribute('cx') || '0'),
        y: parseFloat(el.getAttribute('cy') || '0')
      };
      
    case 'polygon':
    case 'polyline':
      const points = el.getAttribute('points');
      return points ? getPointsCenter(points) : null;
      
    case 'path':
      const d = el.getAttribute('d');
      return d ? estimatePathCenter(d) : null;
      
    default:
      return null;
  }
}