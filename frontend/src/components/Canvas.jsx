import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import api from '../api';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const TOOLS = {
  PEN: 'pen',
  LINE: 'line',
  RECT: 'rect',
  CIRCLE: 'circle',
  TEXT: 'text',
  SELECT: 'select'
};

const ELEMENT_TYPES = {
  PEN: 'pen',
  LINE: 'line',
  RECT: 'rect',
  CIRCLE: 'circle',
  TEXT: 'text',
  IMAGE: 'image'
};

function drawLine(ctx, x0, y0, x1, y1, color = '#000', width = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function drawRect(ctx, x0, y0, x1, y1, color = '#000', width = 2, filled = false) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (filled) {
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  } else {
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }
  ctx.restore();
}

function drawCircle(ctx, cx, cy, r, color = '#000', width = 2, filled = false) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.restore();
}

function drawSelectionBox(ctx, bounds, selected = true) {
  const { x, y, width, height } = bounds;
  
  // Draw selection border
  ctx.save();
  ctx.strokeStyle = selected ? '#0066ff' : '#cccccc';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
  ctx.restore();
  
  if (selected) {
    // Draw resize handles
    const handleSize = 8;
    const handles = [
      { x: x - handleSize/2, y: y - handleSize/2 }, // top-left
      { x: x + width/2 - handleSize/2, y: y - handleSize/2 }, // top-center
      { x: x + width - handleSize/2, y: y - handleSize/2 }, // top-right
      { x: x + width - handleSize/2, y: y + height/2 - handleSize/2 }, // middle-right
      { x: x + width - handleSize/2, y: y + height - handleSize/2 }, // bottom-right
      { x: x + width/2 - handleSize/2, y: y + height - handleSize/2 }, // bottom-center
      { x: x - handleSize/2, y: y + height - handleSize/2 }, // bottom-left
      { x: x - handleSize/2, y: y + height/2 - handleSize/2 }, // middle-left
    ];
    
    ctx.save();
    ctx.fillStyle = '#0066ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
    ctx.restore();
  }
}

const Canvas = forwardRef(({ activeTool = 'pen', diagramId, initialData, onCanvasChange }, ref) => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageCache = useRef(new Map()); // Cache loaded images
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [selectedElements, setSelectedElements] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [originalBounds, setOriginalBounds] = useState(null);
  const [dragStartPositions, setDragStartPositions] = useState(null);
  const changeTimeoutRef = useRef(null);

  // Helper function to preload image into cache
  const preloadImage = (src) => {
    if (!imageCache.current.has(src)) {
      const img = new Image();
      img.onload = () => {
        // Image loaded, trigger redraw to show it
        requestAnimationFrame(() => redraw());
      };
      img.onerror = () => {
        console.error('Failed to preload image:', src);
      };
      imageCache.current.set(src, img);
      img.src = src;
    }
  };

  // Generate unique ID for elements
  const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);

  // Calculate element bounds
  const getElementBounds = (element) => {
    if (!element) return null;
    
    if (element.type === ELEMENT_TYPES.LINE || element.tool === TOOLS.LINE) {
      const [p0, p1] = element.points;
      return {
        x: Math.min(p0.x, p1.x),
        y: Math.min(p0.y, p1.y),
        width: Math.abs(p1.x - p0.x),
        height: Math.abs(p1.y - p0.y)
      };
    } else if (element.type === ELEMENT_TYPES.RECT || element.tool === TOOLS.RECT) {
      const [p0, p1] = element.points;
      return {
        x: Math.min(p0.x, p1.x),
        y: Math.min(p0.y, p1.y),
        width: Math.abs(p1.x - p0.x),
        height: Math.abs(p1.y - p0.y)
      };
    } else if (element.type === ELEMENT_TYPES.CIRCLE || element.tool === TOOLS.CIRCLE) {
      return {
        x: element.center.x - element.radius,
        y: element.center.y - element.radius,
        width: element.radius * 2,
        height: element.radius * 2
      };
    } else if (element.type === ELEMENT_TYPES.PEN || element.tool === TOOLS.PEN) {
      if (!element.points || element.points.length === 0) return null;
      const xs = element.points.map(p => p.x);
      const ys = element.points.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    } else if (element.type === ELEMENT_TYPES.IMAGE) {
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      };
    }
    return null;
  };

  // Check if point is inside element
  const isPointInElement = (point, element) => {
    const bounds = getElementBounds(element);
    if (!bounds) return false;
    
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && 
           point.y <= bounds.y + bounds.height;
  };

  // Check if point is on resize handle
  const getResizeHandle = (point, bounds) => {
    if (!bounds) return null;
    
    const handleSize = 8;
    const { x, y, width, height } = bounds;
    
    const handles = [
      { name: 'nw', x: x - handleSize/2, y: y - handleSize/2 },
      { name: 'n', x: x + width/2 - handleSize/2, y: y - handleSize/2 },
      { name: 'ne', x: x + width - handleSize/2, y: y - handleSize/2 },
      { name: 'e', x: x + width - handleSize/2, y: y + height/2 - handleSize/2 },
      { name: 'se', x: x + width - handleSize/2, y: y + height - handleSize/2 },
      { name: 's', x: x + width/2 - handleSize/2, y: y + height - handleSize/2 },
      { name: 'sw', x: x - handleSize/2, y: y + height - handleSize/2 },
      { name: 'w', x: x - handleSize/2, y: y + height/2 - handleSize/2 },
    ];
    
    for (const handle of handles) {
      if (point.x >= handle.x && point.x <= handle.x + handleSize &&
          point.y >= handle.y && point.y <= handle.y + handleSize) {
        return handle.name;
      }
    }
    return null;
  };

  // Handle image paste/upload
  const handleImageUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Scale image to fit canvas if too large
          let width = img.width;
          let height = img.height;
          const maxSize = 300;
          
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width *= ratio;
            height *= ratio;
          }
          
          const element = {
            id: generateId(),
            type: ELEMENT_TYPES.IMAGE,
            x: 50,
            y: 50,
            width,
            height,
            src: e.target.result
          };
          
          // Preload the image into cache
          preloadImage(e.target.result);
          
          setHistory(prev => [...prev, element]);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle clipboard paste
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        handleImageUpload(file);
        e.preventDefault();
        break;
      }
    }
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getCanvasData: () => {
      return history;
    },
    clearCanvas: () => {
      setHistory([]);
      setSelectedElements([]);
      if (onCanvasChange) {
        onCanvasChange([]);
      }
    },
    loadCanvasData: (data) => {
      if (data && Array.isArray(data)) {
        // Preload any images in the data
        data.forEach(item => {
          if (item.type === ELEMENT_TYPES.IMAGE && item.src) {
            preloadImage(item.src);
          }
        });
        
        setHistory(data);
        setSelectedElements([]);
      }
    },
    deleteSelected: () => {
      if (selectedElements.length > 0) {
        const selectedIds = selectedElements.map(el => el.id);
        setHistory(prev => prev.filter(el => !selectedIds.includes(el.id)));
        setSelectedElements([]);
      }
    }
  }));

  // Load initial data when component mounts
  useEffect(() => {
    if (initialData && initialData.elements) {
      setHistory(initialData.elements);
    }
  }, [initialData]);

  // Add paste event listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // Call onCanvasChange when history changes (debounced)
  useEffect(() => {
    // Clear previous timeout
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    
    // Only trigger onCanvasChange if there are actual changes
    if (onCanvasChange && history.length >= 0) {
      changeTimeoutRef.current = setTimeout(() => {
        onCanvasChange(history);
        changeTimeoutRef.current = null;
      }, 500); // Debounce by 500ms to avoid excessive calls
    }

    // Cleanup on unmount
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, [history, onCanvasChange]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw all elements
    history.forEach((item) => {
      if (item.tool === TOOLS.PEN || item.type === ELEMENT_TYPES.PEN) {
        for (let i = 1; i < item.points.length; i++) {
          drawLine(ctx, 
            item.points[i-1].x, item.points[i-1].y,
            item.points[i].x, item.points[i].y,
            item.color, item.width
          );
        }
      } else if (item.tool === TOOLS.LINE || item.type === ELEMENT_TYPES.LINE) {
        const [p0, p1] = item.points;
        drawLine(ctx, p0.x, p0.y, p1.x, p1.y, item.color, item.width);
      } else if (item.tool === TOOLS.RECT || item.type === ELEMENT_TYPES.RECT) {
        const [p0, p1] = item.points;
        drawRect(ctx, p0.x, p0.y, p1.x, p1.y, item.color, item.width);
      } else if (item.tool === TOOLS.CIRCLE || item.type === ELEMENT_TYPES.CIRCLE) {
        if (item.center && item.radius) {
          drawCircle(ctx, item.center.x, item.center.y, item.radius, item.color, item.width);
        }
      } else if (item.type === ELEMENT_TYPES.IMAGE) {
        // Check if image is already cached
        let img = imageCache.current.get(item.src);
        
        if (img && img.complete) {
          // Image is cached and loaded, draw immediately
          ctx.drawImage(img, item.x, item.y, item.width, item.height);
        } else if (!img) {
          // Image not in cache, create and cache it
          img = new Image();
          img.onload = () => {
            // Mark image as loaded and trigger a single redraw
            requestAnimationFrame(() => redraw());
          };
          img.onerror = () => {
            console.error('Failed to load image:', item.src);
          };
          imageCache.current.set(item.src, img);
          img.src = item.src;
        }
        // If img exists but not complete, it's still loading - do nothing
      }
    });

    // Draw selection boxes
    selectedElements.forEach((element) => {
      const bounds = getElementBounds(element);
      if (bounds) {
        drawSelectionBox(ctx, bounds, true);
      }
    });
  }, [history, selectedElements]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Cleanup image cache on unmount
  useEffect(() => {
    return () => {
      imageCache.current.clear();
    };
  }, []);

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    const { x, y } = getMousePos(e);
    const point = { x, y };
    
    if (activeTool === TOOLS.SELECT) {
      // Check if clicking on a resize handle first
      let handleFound = false;
      for (const element of selectedElements) {
        const bounds = getElementBounds(element);
        if (bounds) {
          const handle = getResizeHandle(point, bounds);
          if (handle) {
            setResizeHandle(handle);
            setIsResizing(true);
            setStart(point);
            setOriginalBounds(bounds); // Store original bounds for resize calculations
            handleFound = true;
            break;
          }
        }
      }
      
      if (!handleFound) {
        // Check if clicking on an element
        let elementFound = null;
        for (let i = history.length - 1; i >= 0; i--) {
          if (isPointInElement(point, history[i])) {
            elementFound = history[i];
            break;
          }
        }
        
        if (elementFound) {
          // Check if element is already selected
          const isAlreadySelected = selectedElements.some(el => el.id === elementFound.id);
          
          if (e.ctrlKey || e.metaKey) {
            // Multi-select
            if (isAlreadySelected) {
              setSelectedElements(prev => prev.filter(el => el.id !== elementFound.id));
            } else {
              setSelectedElements(prev => [...prev, elementFound]);
            }
          } else {
            if (!isAlreadySelected) {
              setSelectedElements([elementFound]);
            }
            setIsDragging(true);
            setDragStart(point);
            // Store original positions for consistent dragging
            setDragStartPositions(selectedElements.map(el => ({
              id: el.id,
              originalElement: { ...el }
            })));
          }
        } else {
          // Clicked on empty space
          setSelectedElements([]);
        }
      }
    } else {
      // Drawing tools
      setDrawing(true);
      setStart(point);
      
      if (activeTool === TOOLS.PEN) {
        setCurrentStroke([point]);
      }
    }
  };

  const handlePointerMove = (e) => {
    const { x, y } = getMousePos(e);
    const point = { x, y };
    
    // Update cursor based on what's under the mouse
    if (activeTool === TOOLS.SELECT && !isDragging && !isResizing) {
      let cursorStyle = 'default';
      
      // Check for resize handles
      for (const element of selectedElements) {
        const bounds = getElementBounds(element);
        if (bounds) {
          const handle = getResizeHandle(point, bounds);
          if (handle) {
            const cursors = {
              'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
              'w': 'w-resize', 'e': 'e-resize',
              'sw': 'sw-resize', 's': 's-resize', 'se': 'se-resize'
            };
            cursorStyle = cursors[handle];
            break;
          }
        }
      }
      
      // Check for elements under cursor
      if (cursorStyle === 'default') {
        for (let i = history.length - 1; i >= 0; i--) {
          if (isPointInElement(point, history[i])) {
            cursorStyle = 'pointer';
            break;
          }
        }
      }
      
      canvasRef.current.style.cursor = cursorStyle;
    } else if (activeTool !== TOOLS.SELECT) {
      canvasRef.current.style.cursor = 'crosshair';
    }
    
    // Handle different interaction modes
    if (isResizing && selectedElements.length > 0 && originalBounds) {
      // Resize selected elements
      const dx = x - start.x;
      const dy = y - start.y;
      
      const updatedHistory = history.map(element => {
        const selected = selectedElements.find(sel => sel.id === element.id);
        if (!selected) return element;
        
        // Use the stored original bounds for consistent resize calculations
        return resizeElement(element, resizeHandle, dx, dy, originalBounds);
      });
      
      setHistory(updatedHistory);
      
      // Update selectedElements to match the resized elements
      const updatedSelected = selectedElements.map(selected => {
        const updated = updatedHistory.find(el => el.id === selected.id);
        return updated || selected;
      });
      setSelectedElements(updatedSelected);
      
    } else if (isDragging && selectedElements.length > 0 && dragStartPositions) {
      // Drag selected elements using original positions as reference
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      const updatedHistory = history.map(element => {
        const dragStartPos = dragStartPositions.find(pos => pos.id === element.id);
        if (!dragStartPos) return element;
        
        const originalElement = dragStartPos.originalElement;
        
        // Apply drag offset to original positions
        if (originalElement.type === ELEMENT_TYPES.IMAGE) {
          return {
            ...element,
            x: originalElement.x + dx,
            y: originalElement.y + dy
          };
        }
        
        if (originalElement.points) {
          return {
            ...element,
            points: originalElement.points.map(p => ({ 
              x: p.x + dx, 
              y: p.y + dy 
            }))
          };
        }
        
        if (originalElement.center) {
          return {
            ...element,
            center: { 
              x: originalElement.center.x + dx, 
              y: originalElement.center.y + dy 
            }
          };
        }
        
        return element;
      });
      
      setHistory(updatedHistory);
      
      // Update selectedElements to match the moved elements
      const updatedSelected = selectedElements.map(selected => {
        const updated = updatedHistory.find(el => el.id === selected.id);
        return updated || selected;
      });
      setSelectedElements(updatedSelected);
      
    } else if (drawing && activeTool !== TOOLS.SELECT) {
      // Drawing mode
      if (activeTool === TOOLS.PEN) {
        setCurrentStroke(prev => [...prev, point]);
        const ctx = canvasRef.current.getContext('2d');
        if (currentStroke.length > 0) {
          const lastPoint = currentStroke[currentStroke.length - 1];
          drawLine(ctx, lastPoint.x, lastPoint.y, x, y, color, lineWidth);
        }
      } else {
        // Preview shape
        redraw();
        const ctx = canvasRef.current.getContext('2d');
        
        if (activeTool === TOOLS.LINE && start) {
          drawLine(ctx, start.x, start.y, x, y, color, lineWidth);
        } else if (activeTool === TOOLS.RECT && start) {
          drawRect(ctx, start.x, start.y, x, y, color, lineWidth);
        } else if (activeTool === TOOLS.CIRCLE && start) {
          const radius = Math.hypot(x - start.x, y - start.y);
          drawCircle(ctx, start.x, start.y, radius, color, lineWidth);
        }
      }
    }
  };

  // Helper function to resize an element
  const resizeElement = (element, handle, dx, dy, originalBounds) => {
    if (element.type === ELEMENT_TYPES.IMAGE) {
      const newElement = { ...element };
      switch (handle) {
        case 'se': // bottom-right
          newElement.width = Math.max(20, originalBounds.width + dx);
          newElement.height = Math.max(20, originalBounds.height + dy);
          break;
        case 'sw': // bottom-left
          newElement.x = originalBounds.x + dx;
          newElement.width = Math.max(20, originalBounds.width - dx);
          newElement.height = Math.max(20, originalBounds.height + dy);
          break;
        case 'ne': // top-right
          newElement.width = Math.max(20, originalBounds.width + dx);
          newElement.y = originalBounds.y + dy;
          newElement.height = Math.max(20, originalBounds.height - dy);
          break;
        case 'nw': // top-left
          newElement.x = originalBounds.x + dx;
          newElement.y = originalBounds.y + dy;
          newElement.width = Math.max(20, originalBounds.width - dx);
          newElement.height = Math.max(20, originalBounds.height - dy);
          break;
        case 'n': // top-center
          newElement.y = originalBounds.y + dy;
          newElement.height = Math.max(20, originalBounds.height - dy);
          break;
        case 's': // bottom-center
          newElement.height = Math.max(20, originalBounds.height + dy);
          break;
        case 'e': // middle-right
          newElement.width = Math.max(20, originalBounds.width + dx);
          break;
        case 'w': // middle-left
          newElement.x = originalBounds.x + dx;
          newElement.width = Math.max(20, originalBounds.width - dx);
          break;
      }
      return newElement;
    }
    
    // For rectangles, simplify the logic
    if (element.tool === TOOLS.RECT || element.type === ELEMENT_TYPES.RECT) {
      const newElement = { ...element };
      
      // Calculate new bounds
      let newX = originalBounds.x;
      let newY = originalBounds.y;
      let newWidth = originalBounds.width;
      let newHeight = originalBounds.height;
      
      switch (handle) {
        case 'nw': // top-left
          newX = originalBounds.x + dx;
          newY = originalBounds.y + dy;
          newWidth = Math.max(20, originalBounds.width - dx);
          newHeight = Math.max(20, originalBounds.height - dy);
          break;
        case 'n': // top-center
          newY = originalBounds.y + dy;
          newHeight = Math.max(20, originalBounds.height - dy);
          break;
        case 'ne': // top-right
          newY = originalBounds.y + dy;
          newWidth = Math.max(20, originalBounds.width + dx);
          newHeight = Math.max(20, originalBounds.height - dy);
          break;
        case 'e': // middle-right
          newWidth = Math.max(20, originalBounds.width + dx);
          break;
        case 'se': // bottom-right
          newWidth = Math.max(20, originalBounds.width + dx);
          newHeight = Math.max(20, originalBounds.height + dy);
          break;
        case 's': // bottom-center
          newHeight = Math.max(20, originalBounds.height + dy);
          break;
        case 'sw': // bottom-left
          newX = originalBounds.x + dx;
          newWidth = Math.max(20, originalBounds.width - dx);
          newHeight = Math.max(20, originalBounds.height + dy);
          break;
        case 'w': // middle-left
          newX = originalBounds.x + dx;
          newWidth = Math.max(20, originalBounds.width - dx);
          break;
      }
      
      // Convert back to points
      newElement.points = [
        { x: newX, y: newY },
        { x: newX + newWidth, y: newY + newHeight }
      ];
      
      return newElement;
    }
    
    // Handle lines
    if (element.tool === TOOLS.LINE || element.type === ELEMENT_TYPES.LINE) {
      const newElement = { ...element };
      const [p0, p1] = element.points;
      
      // Calculate new bounds
      let newX = originalBounds.x;
      let newY = originalBounds.y;
      let newWidth = originalBounds.width;
      let newHeight = originalBounds.height;
      
      switch (handle) {
        case 'nw': // top-left
          newX = originalBounds.x + dx;
          newY = originalBounds.y + dy;
          newWidth = Math.max(1, originalBounds.width - dx);
          newHeight = Math.max(1, originalBounds.height - dy);
          break;
        case 'n': // top-center
          newY = originalBounds.y + dy;
          newHeight = Math.max(1, originalBounds.height - dy);
          break;
        case 'ne': // top-right
          newY = originalBounds.y + dy;
          newWidth = Math.max(1, originalBounds.width + dx);
          newHeight = Math.max(1, originalBounds.height - dy);
          break;
        case 'e': // middle-right
          newWidth = Math.max(1, originalBounds.width + dx);
          break;
        case 'se': // bottom-right
          newWidth = Math.max(1, originalBounds.width + dx);
          newHeight = Math.max(1, originalBounds.height + dy);
          break;
        case 's': // bottom-center
          newHeight = Math.max(1, originalBounds.height + dy);
          break;
        case 'sw': // bottom-left
          newX = originalBounds.x + dx;
          newWidth = Math.max(1, originalBounds.width - dx);
          newHeight = Math.max(1, originalBounds.height + dy);
          break;
        case 'w': // middle-left
          newX = originalBounds.x + dx;
          newWidth = Math.max(1, originalBounds.width - dx);
          break;
      }
      
      // Convert back to points
      newElement.points = [
        { x: newX, y: newY },
        { x: newX + newWidth, y: newY + newHeight }
      ];
      
      return newElement;
    }
    
    // Handle freehand drawings (pen)
    if (element.tool === TOOLS.PEN || element.type === ELEMENT_TYPES.PEN) {
      const newElement = { ...element };
      
      if (!element.points || element.points.length === 0) {
        return element;
      }
      
      // Apply dampening factor to make resizing less sensitive
      const dampening = 0.1; // 90% reduction - very fine control
      const dampedDx = dx * dampening;
      const dampedDy = dy * dampening;
      
      // Calculate new bounds based on handle with dampened movement
      let newX = originalBounds.x;
      let newY = originalBounds.y;
      let newWidth = originalBounds.width;
      let newHeight = originalBounds.height;
      
      switch (handle) {
        case 'nw': // top-left
          newX = originalBounds.x + dampedDx;
          newY = originalBounds.y + dampedDy;
          newWidth = Math.max(10, originalBounds.width - dampedDx);
          newHeight = Math.max(10, originalBounds.height - dampedDy);
          break;
        case 'n': // top-center
          newY = originalBounds.y + dampedDy;
          newHeight = Math.max(10, originalBounds.height - dampedDy);
          break;
        case 'ne': // top-right
          newY = originalBounds.y + dampedDy;
          newWidth = Math.max(10, originalBounds.width + dampedDx);
          newHeight = Math.max(10, originalBounds.height - dampedDy);
          break;
        case 'e': // middle-right
          newWidth = Math.max(10, originalBounds.width + dampedDx);
          break;
        case 'se': // bottom-right
          newWidth = Math.max(10, originalBounds.width + dampedDx);
          newHeight = Math.max(10, originalBounds.height + dampedDy);
          break;
        case 's': // bottom-center
          newHeight = Math.max(10, originalBounds.height + dampedDy);
          break;
        case 'sw': // bottom-left
          newX = originalBounds.x + dampedDx;
          newWidth = Math.max(10, originalBounds.width - dampedDx);
          newHeight = Math.max(10, originalBounds.height + dampedDy);
          break;
        case 'w': // middle-left
          newX = originalBounds.x + dampedDx;
          newWidth = Math.max(10, originalBounds.width - dampedDx);
          break;
      }
      
      // Calculate scaling factors (now based on dampened movement)
      const scaleX = originalBounds.width > 0 ? newWidth / originalBounds.width : 1;
      const scaleY = originalBounds.height > 0 ? newHeight / originalBounds.height : 1;
      
      // Transform all points
      newElement.points = element.points.map(point => {
        const relativeX = point.x - originalBounds.x;
        const relativeY = point.y - originalBounds.y;
        
        return {
          x: newX + (relativeX * scaleX),
          y: newY + (relativeY * scaleY)
        };
      });
      
      return newElement;
    }
    
    // Handle circles
    if (element.tool === TOOLS.CIRCLE || element.type === ELEMENT_TYPES.CIRCLE) {
      const newElement = { ...element };
      
      switch (handle) {
        case 'se':
        case 'ne':
        case 'sw':
        case 'nw':
          // For corners, adjust radius based on distance from center
          const newRadius = Math.max(10, originalBounds.width / 2 + (handle.includes('e') ? dx : -dx));
          newElement.radius = newRadius;
          break;
        case 'n':
        case 's':
          const newRadiusY = Math.max(10, originalBounds.height / 2 + (handle === 's' ? dy : -dy));
          newElement.radius = newRadiusY;
          break;
        case 'e':
        case 'w':
          const newRadiusX = Math.max(10, originalBounds.width / 2 + (handle === 'e' ? dx : -dx));
          newElement.radius = newRadiusX;
          break;
      }
      return newElement;
    }
    
    return element;
  };

  // Helper function to move an element
  const moveElement = (element, dx, dy) => {
    if (element.type === ELEMENT_TYPES.IMAGE) {
      return {
        ...element,
        x: element.x + dx,
        y: element.y + dy
      };
    }
    
    if (element.points) {
      return {
        ...element,
        points: element.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
      };
    }
    
    if (element.center) {
      return {
        ...element,
        center: { x: element.center.x + dx, y: element.center.y + dy }
      };
    }
    
    return element;
  };

  const handlePointerUp = (e) => {
    const { x, y } = getMousePos(e);
    
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setOriginalBounds(null); // Reset original bounds
    } else if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragStartPositions(null);
    } else if (drawing && activeTool !== TOOLS.SELECT) {
      setDrawing(false);
      
      let element = null;
      
      if (activeTool === TOOLS.PEN) {
        element = {
          id: generateId(),
          tool: TOOLS.PEN,
          type: ELEMENT_TYPES.PEN,
          points: [...currentStroke, { x, y }],
          color,
          width: lineWidth
        };
        setCurrentStroke([]);
      } else if (activeTool === TOOLS.LINE) {
        element = {
          id: generateId(),
          tool: TOOLS.LINE,
          type: ELEMENT_TYPES.LINE,
          points: [start, { x, y }],
          color,
          width: lineWidth
        };
      } else if (activeTool === TOOLS.RECT) {
        element = {
          id: generateId(),
          tool: TOOLS.RECT,
          type: ELEMENT_TYPES.RECT,
          points: [start, { x, y }],
          color,
          width: lineWidth
        };
      } else if (activeTool === TOOLS.CIRCLE) {
        const radius = Math.hypot(x - start.x, y - start.y);
        element = {
          id: generateId(),
          tool: TOOLS.CIRCLE,
          type: ELEMENT_TYPES.CIRCLE,
          center: start,
          radius,
          color,
          width: lineWidth
        };
      }
      
      if (element) {
        setHistory(prev => [...prev, element]);
        setSelectedElements([element]); // Auto-select newly created element
      }
    }
    
    setStart(null);
  };

  const handleUndo = () => {
    setHistory(prev => prev.slice(0, -1));
    setSelectedElements([]);
  };

  const handleClear = () => {
    setHistory([]);
    setSelectedElements([]);
  };

  const handleDelete = () => {
    if (selectedElements.length > 0) {
      const selectedIds = selectedElements.map(el => el.id);
      setHistory(prev => prev.filter(el => !selectedIds.includes(el.id)));
      setSelectedElements([]);
    }
  };

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      handleDelete();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setSelectedElements([]);
    } else if (e.ctrlKey || e.metaKey) {
      if (e.key === 'a') {
        setSelectedElements([...history]);
        e.preventDefault();
      } else if (e.key === 'z') {
        handleUndo();
        e.preventDefault();
      }
    }
  }, [history, selectedElements]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="w-full h-full bg-gray-100 rounded-lg p-4">
      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 border-none rounded cursor-pointer"
        />
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="w-20"
        />
        
        <button
          onClick={() => fileInputRef.current.click()}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Upload Image
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e.target.files[0])}
          className="hidden"
        />
        
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        >
          Undo
        </button>
        <button
          onClick={handleClear}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear
        </button>
        
        {selectedElements.length > 0 && (
          <>
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete ({selectedElements.length})
            </button>
            <span className="text-sm text-gray-600">
              {selectedElements.length} selected
            </span>
          </>
        )}
      </div>
      
      <div className="mb-2 text-sm text-gray-600">
        {activeTool === TOOLS.SELECT ? (
          <span>Selection Mode - Click to select, drag to move, use handles to resize. Ctrl+Click for multi-select. Paste images with Ctrl+V</span>
        ) : (
          <span>Drawing Mode - {activeTool}</span>
        )}
      </div>
      
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-gray-300 bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ cursor: activeTool === TOOLS.SELECT ? 'default' : 'crosshair' }}
      />
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
