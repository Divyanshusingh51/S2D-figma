// ------------------------------
// 🧠 Importing canvas and file input elements
// ------------------------------
const canvas = document.getElementById('design-canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('file-input');

// ------------------------------
// 🧰 Initial setup of variables
// ------------------------------
let currentTool = 'select'; // current tool: 'select', 'rectangle', 'circle', or 'line'
let isDrawing = false;
let startX = 0;
let startY = 0;
let zoom = 1; // default zoom level
let offsetX = 0; // canvas pan x-offset
let offsetY = 0; // canvas pan y-offset
let panStart = null;

let shapes = [];         // all drawn shapes
let undoStack = [];      // for undo feature
let redoStack = [];      // for redo feature
let selectedShape = null;
let draggingShape = false;

// ------------------------------
// 🛠️ Tool and Coordinate Helpers
// ------------------------------

// Change the selected tool (draw/shape/select)
function setTool(tool) {
  currentTool = tool;
  selectedShape = null;
}

// Convert mouse screen coordinates into canvas space
function toCanvasCoords(x, y) {
  return {
    x: (x - offsetX) / zoom,
    y: (y - offsetY) / zoom
  };
}

// ------------------------------
// 💾 Undo/Redo State Management
// ------------------------------

// Save current shape state (before changes)
function saveState() {
  undoStack.push(JSON.stringify(shapes));
  redoStack = []; // Clear redo history after new action
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(shapes));
  shapes = JSON.parse(undoStack.pop());
  drawAll();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(shapes));
  shapes = JSON.parse(redoStack.pop());
  drawAll();
}

// ------------------------------
// ❌ Clear All Shapes
// ------------------------------
function clearCanvas() {
  saveState();
  shapes = [];
  drawAll();
}

// ------------------------------
// 🎨 Main Drawing Function
// ------------------------------
function drawAll() {
  // Reset transform before clearing
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply pan/zoom
  ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);

  for (const shape of shapes) {
    // Draw a rectangle
    if (shape.type === 'rectangle') {
      ctx.fillStyle = shape === selectedShape ? '#66bb6a' : '#4CAF50';
      ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
    }

    // Draw a circle
    else if (shape.type === 'circle') {
      ctx.fillStyle = shape === selectedShape ? '#64b5f6' : '#2196F3';
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw a line
    else if (shape.type === 'line') {
      ctx.strokeStyle = shape === selectedShape ? '#888' : '#000';
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
    }
  }
}

// ------------------------------
// 🖱️ Mouse Events (Draw, Drag, Pan)
// ------------------------------

// 1. Start drawing/selecting
canvas.addEventListener('mousedown', (e) => {
  const pos = toCanvasCoords(e.clientX, e.clientY);
  isDrawing = true;
  startX = pos.x;
  startY = pos.y;

  if (currentTool === 'select') {
    selectedShape = null;

    // Check if mouse is over a shape (starting from topmost)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      if (
        (s.type === 'rectangle' && pos.x >= s.x && pos.x <= s.x + s.w && pos.y >= s.y && pos.y <= s.y + s.h) ||
        (s.type === 'circle' && Math.hypot(pos.x - s.x, pos.y - s.y) <= s.r)
      ) {
        selectedShape = s;
        draggingShape = true;
        break;
      }
    }

    // If clicked on empty space, start panning
    if (!selectedShape) {
      panStart = { x: e.clientX, y: e.clientY, offsetX, offsetY };
    }

    drawAll();
  }
});

// 2. While mouse is moving
canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const pos = toCanvasCoords(e.clientX, e.clientY);

  if (currentTool === 'select') {
    // Drag shape
    if (draggingShape && selectedShape) {
      const dx = pos.x - startX;
      const dy = pos.y - startY;

      if (selectedShape.type === 'rectangle' || selectedShape.type === 'circle') {
        selectedShape.x += dx;
        selectedShape.y += dy;
      } else if (selectedShape.type === 'line') {
        selectedShape.x1 += dx;
        selectedShape.y1 += dy;
        selectedShape.x2 += dx;
        selectedShape.y2 += dy;
      }

      startX = pos.x;
      startY = pos.y;
      drawAll();
    }

    // Pan canvas
    if (panStart) {
      offsetX = panStart.offsetX + (e.clientX - panStart.x);
      offsetY = panStart.offsetY + (e.clientY - panStart.y);
      drawAll();
    }
  }
});

// 3. Mouse released
canvas.addEventListener('mouseup', (e) => {
  if (!isDrawing) return;
  const pos = toCanvasCoords(e.clientX, e.clientY);
  isDrawing = false;

  // If drawing a shape (not selecting)
  if (currentTool !== 'select') {
    saveState();
    let newShape = null;

    if (currentTool === 'rectangle') {
      newShape = { type: 'rectangle', x: startX, y: startY, w: pos.x - startX, h: pos.y - startY };
    } else if (currentTool === 'circle') {
      newShape = { type: 'circle', x: startX, y: startY, r: Math.hypot(pos.x - startX, pos.y - startY) };
    } else if (currentTool === 'line') {
      newShape = { type: 'line', x1: startX, y1: startY, x2: pos.x, y2: pos.y };
    }

    if (newShape) shapes.push(newShape);
  }

  draggingShape = false;
  panStart = null;
  drawAll();
});

// ------------------------------
// 🔍 Mouse Wheel to Zoom In/Out
// ------------------------------
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();

  const mouse = toCanvasCoords(e.clientX, e.clientY);
  const delta = e.deltaY < 0 ? 1.1 : 0.9;

  zoom *= delta;
  offsetX -= (mouse.x * delta - mouse.x) * zoom;
  offsetY -= (mouse.y * delta - mouse.y) * zoom;

  drawAll();
});

// ------------------------------
// 💾 Save/Load/Export as PNG
// ------------------------------
function saveDesign() {
  const json = JSON.stringify(shapes);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'design.json';
  a.click();
}

function loadDesign() {
  fileInput.click();
}

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    shapes = JSON.parse(reader.result);
    drawAll();
  };
  reader.readAsText(file);
}

function saveImage() {
  const link = document.createElement('a');
  link.download = 'design.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Initial draw
drawAll();

// ------------------------------
// 🎤 Voice Commands
// ------------------------------
function startListening() {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Voice recognition not supported in this browser.');
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    console.log('Listening...');
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    console.log('Heard:', transcript);
    handleVoiceCommand(transcript);
  };

  recognition.start();
}

function handleVoiceCommand(command) {
    command = command.toLowerCase();
    console.log("🎤 Heard:", command);
  
    // Quick commands
    if (command.includes("clear")) return clearCanvas();
    if (command.includes("undo")) return undo();
    if (command.includes("redo")) return redo();
  
    const shape = parseNaturalCommand(command);
  
    if (!shape) {
      alert("Sorry, I couldn't understand your command.");
      return;
    }
  
    saveState();
    shapes.push(shape);
    drawAll();
  }
  
  // 🧠 Smart natural language parser
  function parseNaturalCommand(text) {
    const shapeTypes = ["rectangle", "circle", "line", "square"];
    const colors = ["red", "blue", "green", "black", "white", "yellow", "orange", "purple", "gray"];
  
    const shapeType = shapeTypes.find(type => text.includes(type));
    if (!shapeType) return null;
  
    const color = colors.find(c => text.includes(c)) || "black";
  
    const nums = text.match(/\d+/g)?.map(Number) || [];
  
    // 🧩 Helper to find labeled numbers like "width 100"
    function findLabeled(label, fallback) {
      const regex = new RegExp(label + "\\s*(\\d+)");
      const match = text.match(regex);
      return match ? parseInt(match[1]) : fallback;
    }
  
    if (shapeType === "rectangle" || shapeType === "square") {
      const x = findLabeled("x", nums[0] ?? 100);
      const y = findLabeled("y", nums[1] ?? 100);
      const w = findLabeled("width", nums[2] ?? (shapeType === "square" ? 100 : 150));
      const h = findLabeled("height", nums[3] ?? (shapeType === "square" ? 100 : 100));
  
      return { type: "rectangle", x, y, w, h, color };
    }
  
    if (shapeType === "circle") {
      const x = findLabeled("x", nums[0] ?? 150);
      const y = findLabeled("y", nums[1] ?? 150);
      const r = findLabeled("radius", nums[2] ?? 50);
  
      return { type: "circle", x, y, r, color };
    }
  
    if (shapeType === "line") {
      const x1 = findLabeled("from", nums[0] ?? 100);
      const y1 = nums[1] ?? 100;
      const x2 = findLabeled("to", nums[2] ?? 200);
      const y2 = nums[3] ?? 200;
  
      return { type: "line", x1, y1, x2, y2, color };
    }
  
    return null;
  }
  

// Actually draw the shape from voice command
function drawShape(shape) {
  saveState();
  if (shape.color) ctx.fillStyle = shape.color;
  shapes.push(shape);
  drawAll();
}
