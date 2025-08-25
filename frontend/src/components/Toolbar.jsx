import React from 'react';

const TOOLS = {
  SELECT: 'select',
  PEN: 'pen',
  LINE: 'line',
  RECT: 'rect',
  CIRCLE: 'circle',
  TEXT: 'text'
};

const Toolbar = ({ activeTool, onToolChange }) => {
  const tools = [
    { 
      name: TOOLS.SELECT, 
      icon: '↖️', 
      title: 'Select Tool - Click to select and move elements' 
    },
    { 
      name: TOOLS.PEN, 
      icon: '✏️', 
      title: 'Pen Tool - Draw freehand' 
    },
    { 
      name: TOOLS.LINE, 
      icon: '📏', 
      title: 'Line Tool - Draw straight lines' 
    },
    { 
      name: TOOLS.RECT, 
      icon: '⬜', 
      title: 'Rectangle Tool - Draw rectangles' 
    },
    { 
      name: TOOLS.CIRCLE, 
      icon: '⭕', 
      title: 'Circle Tool - Draw circles' 
    },
    { 
      name: TOOLS.TEXT, 
      icon: '📝', 
      title: 'Text Tool - Add text (coming soon)' 
    }
  ];

  return (
    <div className="flex gap-2 p-4 bg-white border-b border-gray-200">
      {tools.map((tool) => (
        <button
          key={tool.name}
          onClick={() => onToolChange && onToolChange(tool.name)}
          title={tool.title}
          className={`
            flex items-center justify-center w-12 h-12 rounded-lg border-2 transition-all
            ${activeTool === tool.name 
              ? 'border-blue-500 bg-blue-50 text-blue-700' 
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          <span className="text-lg">{tool.icon}</span>
        </button>
      ))}
      
      <div className="ml-4 flex items-center text-sm text-gray-600">
        <span className="capitalize">{activeTool} Tool Active</span>
      </div>
    </div>
  );
};

export default Toolbar;
