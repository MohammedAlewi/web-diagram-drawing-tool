 /**
     * Grid Drawing App
     * 
     * A class-based implementation of an SVG grid drawing tool that allows
     * creating grid-aligned paths with smooth corners.
     */
 class GridDrawingApp {
  /**
   * Constructor - Initialize the drawing application
   * @param {Object} config - Configuration settings
   */
  constructor(config) {
    // DOM Elements
    this.packetManager = config.packetManager
    this.toggleManager = config.toggleManager
    this.svgElement = config.svgElement;
    this.controls = {
      lineColor: config.controls.lineColor,
      lineThickness: config.controls.lineThickness,
      thicknessValue: config.controls.thicknessValue,
      gridSize: config.controls.gridSize,
      gridSizeValue: config.controls.gridSizeValue,
      dashedLine: config.controls.dashedLine,
      dashArray: config.controls.dashArray,
      dashArrayValue: config.controls.dashArrayValue,
      dashSettingsGroup: config.controls.dashSettingsGroup,
      undoButton: config.controls.undoButton,
      clearButton: config.controls.clearButton,
      getPathsButton: config.controls.getPathsButton,
      pathOutput: config.controls.pathOutput
    };
    
    // Canvas dimensions
    this.width = config.width || 800;
    this.height = config.height || 500;
    
    // Drawing state
    this.settings = {
      gridSize: parseInt(this.controls.gridSize.value),
      lineColor: this.controls.lineColor.value,
      lineThickness: parseInt(this.controls.lineThickness.value),
      isDashed: this.controls.dashedLine.checked,
      dashArray: parseInt(this.controls.dashArray.value)
    };
    
    // Path state
    this.currentPath = null;
    this.pathPoints = [];
    this.lastGridPoint = null;
    this.pathHistory = [];
    this.isDrawing = false;
    
    // Initialize
    this.setupSvgElement();
    this.drawGrid();
    this.attachEventListeners();
  }
  
  /**
   * Configure SVG element with dimensions
   */
  setupSvgElement() {
    this.svgElement.setAttribute('width', this.width);
    this.svgElement.setAttribute('height', this.height);
  }
  
  /**
   * Draw the grid on the SVG canvas
   */
  drawGrid() {
    // Remove old grid if exists
    const oldGrid = this.svgElement.querySelector('.grid-group');
    if (oldGrid) {
      this.svgElement.removeChild(oldGrid);
    }
    
    // Create new grid group
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.classList.add('grid-group');
    
    // Draw vertical lines
    for (let x = 0; x <= this.width; x += this.settings.gridSize) {
      const line = this.createSvgLine(x, 0, x, this.height, 'lightgrey', 1);
      gridGroup.appendChild(line);
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= this.height; y += this.settings.gridSize) {
      const line = this.createSvgLine(0, y, this.width, y, 'lightgrey', 1);
      gridGroup.appendChild(line);
    }
    
    // Insert grid at the bottom layer
    this.svgElement.insertBefore(gridGroup, this.svgElement.firstChild);
  }
  
  /**
   * Helper to create an SVG line element
   * @param {number} x1 - Start x coordinate
   * @param {number} y1 - Start y coordinate
   * @param {number} x2 - End x coordinate
   * @param {number} y2 - End y coordinate
   * @param {string} color - Line color
   * @param {number} width - Line width
   * @returns {SVGLineElement} The created line element
   */
  createSvgLine(x1, y1, x2, y2, color, width) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', width);
    return line;
  }
  
  /**
   * Attach all event listeners for drawing and controls
   */
  attachEventListeners() {
    // Drawing events
    this.svgElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.svgElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.svgElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.svgElement.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    
    // Control events
    this.controls.lineColor.addEventListener('input', this.updateLineColor.bind(this));
    this.controls.lineThickness.addEventListener('input', this.updateLineThickness.bind(this));
    this.controls.gridSize.addEventListener('input', this.updateGridSize.bind(this));
    this.controls.dashedLine.addEventListener('change', this.updateDashedLine.bind(this));
    this.controls.dashArray.addEventListener('input', this.updateDashArray.bind(this));
    
    // Button events
    this.controls.undoButton.addEventListener('click', this.undoLastPath.bind(this));
    this.controls.clearButton.addEventListener('click', this.clearAllPaths.bind(this));
    this.controls.getPathsButton.addEventListener('click', this.displayPathsOutput.bind(this));
  }
  
  /**
   * Handle mouse down event to start drawing
   * @param {MouseEvent} e - The mouse event
   */
  handleMouseDown(e) {
    if(this.toggleManager.getCurrentType() == "line") {
      const point = this.getMousePosition(e);
      this.isDrawing = true;
      this.startPath(point.x, point.y);
    }
  }
  
  /**
   * Handle mouse move event to continue drawing
   * @param {MouseEvent} e - The mouse event
   */
  handleMouseMove(e) {
    if (!this.isDrawing) return;
    
    const point = this.getMousePosition(e);
    this.continuePath(point.x, point.y);
  }
  
  /**
   * Handle mouse up event to finish drawing
   */
  handleMouseUp() {
    this.isDrawing = false;
    this.endPath();
  }
  
  /**
   * Handle mouse leave event to finish drawing if started
   */
  handleMouseLeave() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.endPath();
    }
  }
  
  /**
   * Get mouse position relative to SVG element
   * @param {MouseEvent} e - The mouse event
   * @returns {Object} Object with x and y coordinates
   */
  getMousePosition(e) {
    const rect = this.svgElement.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  
  /**
   * Snap coordinates to the nearest grid point
   * @param {number} x - Raw x coordinate
   * @param {number} y - Raw y coordinate
   * @returns {Object} Object with snapped x and y coordinates
   */
  snapToGrid(x, y) {
    const gridX = Math.round(x / this.settings.gridSize) * this.settings.gridSize;
    const gridY = Math.round(y / this.settings.gridSize) * this.settings.gridSize;
    return { x: gridX, y: gridY };
  }
  
  /**
   * Start a new path from a point
   * @param {number} x - Starting x coordinate
   * @param {number} y - Starting y coordinate
   */
  startPath(x, y) {
    const gridPoint = this.snapToGrid(x, y);
    
    // Create new SVG path element
    this.currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.currentPath.setAttribute('fill', 'none');
    this.currentPath.setAttribute('stroke', this.settings.lineColor);
    this.currentPath.setAttribute('stroke-width', this.settings.lineThickness);
    this.currentPath.setAttribute('stroke-linecap', 'round');
    this.currentPath.setAttribute('stroke-linejoin', 'round');
    
    // Apply dash pattern if enabled
    if (this.settings.isDashed) {
      this.currentPath.setAttribute('stroke-dasharray', 
        `${this.settings.dashArray} ${this.settings.dashArray}`);
    }
    
    // Initialize path points
    this.pathPoints = [gridPoint];
    this.lastGridPoint = gridPoint;
    
    // Add path to SVG
    this.svgElement.appendChild(this.currentPath);
  }
  
  /**
   * Continue the current path to a new point
   * @param {number} x - Next x coordinate
   * @param {number} y - Next y coordinate
   */
  continuePath(x, y) {
    if (!this.currentPath) return;
    
    const gridPoint = this.snapToGrid(x, y);
    
    // Only add points if they're different from the last point
    if (gridPoint.x !== this.lastGridPoint.x || gridPoint.y !== this.lastGridPoint.y) {
      // Create straight lines by adding intermediate points if moving diagonally
      if (Math.abs(gridPoint.x - this.lastGridPoint.x) > 0 && 
          Math.abs(gridPoint.y - this.lastGridPoint.y) > 0) {
          
        // For better curves, alternate between horizontal-first and vertical-first
        const numPoints = this.pathPoints.length;
        let intermediatePoint;
        
        if (numPoints % 2 === 0) {
          // Move horizontally first
          intermediatePoint = { x: gridPoint.x, y: this.lastGridPoint.y };
        } else {
          // Move vertically first
          intermediatePoint = { x: this.lastGridPoint.x, y: gridPoint.y };
        }
        
        this.pathPoints.push(intermediatePoint);
      }
      
      // Add the actual grid point
      this.pathPoints.push(gridPoint);
      this.lastGridPoint = gridPoint;
      
      // Update the path data
      this.currentPath.setAttribute('d', this.generateSmoothPath(this.pathPoints));
    }
  }
  
  /**
   * Generate a smooth SVG path from an array of points
   * @param {Array} points - Array of point objects with x and y coordinates
   * @returns {string} SVG path data string
   */
  generateSmoothPath(points) {
    if (points.length < 2) return '';
    
    let pathData = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const prev = points[i-1];
      
      // Check for direction change to add curve
      if (i < points.length - 1) {
        const next = points[i+1];
        
        // Check if there's a direction change (horizontal to vertical or vice versa)
        const isHorizThenVert = 
          (prev.y === current.y && current.x === next.x) ||
          (prev.x === current.x && current.y === next.y);
        
        if (isHorizThenVert) {
          // Use a smooth curve for corners
          const controlPoint = {
            x: current.x, 
            y: current.y
          };
          
          pathData += ` L ${current.x},${current.y}`;
          pathData += ` Q ${controlPoint.x},${controlPoint.y} ${next.x},${next.y}`;
          i++; // Skip the next point since we've already used it
        } else {
          pathData += ` L ${current.x},${current.y}`;
        }
      } else {
        pathData += ` L ${current.x},${current.y}`;
      }
    }
    
    return pathData;
  }
  
  /**
   * Finish the current path and add it to history
   */
  endPath() {
    if (this.currentPath) {
      // Add the path to history
      this.pathHistory.push(this.currentPath);
      
      this.currentPath.addEventListener('dblclick', (e) => this.packetManager.openDialog(e));

      // Enable undo button if there are paths
      // this.controls.undoButton.disabled = false;
    }
    
    this.currentPath = null;
    this.pathPoints = [];
    this.lastGridPoint = null;
  }
  
  /**
   * Remove the last path from the drawing
   */
  undoLastPath() {
    if(this.toggleManager.getCurrentType() != "line") {
      return
    }
    if (this.pathHistory.length > 0) {
      const lastPath = this.pathHistory.pop();
      this.svgElement.removeChild(lastPath);
      
      // Disable undo button if no more paths
      // if (this.pathHistory.length === 0) {
      //   this.controls.undoButton.disabled = true;
      // }
    }
  }
  
  /**
   * Clear all paths from the drawing
   */
  clearAllPaths() {
    // Remove all paths, keep the grid
    const paths = this.svgElement.querySelectorAll('path');
    paths.forEach(path => {
      this.svgElement.removeChild(path);
    });
    
    // Clear history and disable undo button
    this.pathHistory = [];
    // this.controls.undoButton.disabled = true;
  }
  
  /**
   * Get all path DOM elements in the grid
   * @returns {NodeList} List of SVG path elements
   */
  getPathElements() {
    return this.svgElement.querySelectorAll('path');
  }
  
  /**
   * Get all paths as SVG strings
   * @returns {Array} Array of path data strings
   */
  getPathsAsSvg() {
    const paths = this.getPathElements();
    const pathDataArray = [];
    
    paths.forEach(path => {
      const pathData = {
        d: path.getAttribute('d'),
        stroke: path.getAttribute('stroke'),
        'stroke-width': path.getAttribute('stroke-width'),
        'stroke-dasharray': path.getAttribute('stroke-dasharray') || 'none'
      };
      pathDataArray.push(pathData);
    });
    
    return pathDataArray;
  }
  
  /**
   * Display paths data in the output element
   */
  displayPathsOutput() {
    const paths = this.getPathsAsSvg();
    this.controls.pathOutput.style.display = paths.length > 0 ? 'block' : 'none';
    this.controls.pathOutput.textContent = JSON.stringify(paths, null, 2);
  }
  
  // Control update methods
  
  /**
   * Update line color from control
   */
  updateLineColor() {
    this.settings.lineColor = this.controls.lineColor.value;
  }
  
  /**
   * Update line thickness from control
   */
  updateLineThickness() {
    this.settings.lineThickness = parseInt(this.controls.lineThickness.value);
    this.controls.thicknessValue.textContent = this.settings.lineThickness + 'px';
  }
  
  /**
   * Update grid size from control
   */
  updateGridSize() {
    this.settings.gridSize = parseInt(this.controls.gridSize.value);
    this.controls.gridSizeValue.textContent = this.settings.gridSize + 'px';
    this.drawGrid();
  }
  
  /**
   * Update dashed line setting from control
   */
  updateDashedLine() {
    this.settings.isDashed = this.controls.dashedLine.checked;
    if (this.settings.isDashed) {
      this.controls.dashSettingsGroup.style.display = 'flex';
    } else {
      this.controls.dashSettingsGroup.style.display = 'none';
    }
  }
  
  /**
   * Update dash array from control
   */
  updateDashArray() {
    this.settings.dashArray = parseInt(this.controls.dashArray.value);
    this.controls.dashArrayValue.textContent = this.settings.dashArray + 'px';
  }
}



class RectangleDrawer {
  constructor(app, toggleManager, svgElement, descriptions = []) {
      this.app = app;
      this.toggleManager = toggleManager
      this.svgElement = svgElement;
      this.width = app.height
      this.height = app.width
      
      this.currentRect = null;
      this.selectedRect = null;
      this.isDrawing = false;
      this.rectangles = []; // Store all created rectangles
      this.undoStack = []; // Stack for undo operations
      this.descriptions = descriptions;
      this.text_rects = []

      // Bind methods to ensure correct context
      this.handleMouseDown = this.handleMouseDown.bind(this);
      this.drawRectangle = this.drawRectangle.bind(this);
      this.stopDrawing = this.stopDrawing.bind(this);
      this.undoLastOperation = this.undoLastOperation.bind(this);
      this.dialogBox = this.dialogBox.bind(this); 
      this.update_text = this.update_text.bind(this); 
      this.clear_fakeones = this.clear_fakeones.bind(this); 
      this.initialize();
  }

  clear_fakeones(){
    this.SVGLineElement.get
  }

  initialize() {
      this.app.drawGrid();
      this.setupEventListeners();
      this.setupControls();
  }

  // Event listeners setup
  setupEventListeners() {
      this.svgElement.addEventListener('mousedown', this.handleMouseDown);
      this.svgElement.addEventListener('mousemove', this.drawRectangle);
      this.svgElement.addEventListener('mouseup', this.stopDrawing);
      this.svgElement.addEventListener('mouseleave', this.stopDrawing);
      this.svgElement.addEventListener('dblclick', this.dialogBox);
  }

  setupControls() {
      const bgColorPicker = document.getElementById('bgColorPicker');
      const borderColorPicker = document.getElementById('borderColorPicker');
      const borderRadiusSlider = document.getElementById('borderRadiusSlider');
      const borderRadiusValue = document.getElementById('borderRadiusValue');
      const borderThicknessSlider = document.getElementById('borderThicknessSlider');
      const borderThicknessValue = document.getElementById('borderThicknessValue');
      const undoButton = document.getElementById('undoButton');
      const clearButton = document.getElementById('clearButton');

      // Background color change
      bgColorPicker.addEventListener('input', (e) => {
          if (this.selectedRect) {
              this.selectedRect.setAttribute('fill', e.target.value);
          }
      });

      // Border color change
      borderColorPicker.addEventListener('input', (e) => {
          if (this.selectedRect) {
              this.selectedRect.setAttribute('stroke', e.target.value);
          }
      });

      // Border radius change
      borderRadiusSlider.addEventListener('input', (e) => {
          borderRadiusValue.textContent = e.target.value;
          if (this.selectedRect) {
              this.selectedRect.setAttribute('rx', e.target.value);
              this.selectedRect.setAttribute('ry', e.target.value);
          }
      });

      // Border thickness change
      borderThicknessSlider.addEventListener('input', (e) => {
          borderThicknessValue.textContent = e.target.value;
          if (this.selectedRect) {
              this.selectedRect.setAttribute('stroke-width', e.target.value);
          }
      });

      // Undo functionality
      undoButton.addEventListener('click', this.undoLastOperation);
      clearButton.addEventListener('click', this.clearAllRects);
  }

  handleMouseDown(e) {
    if(this.toggleManager.getCurrentType() == "line") {
      return  // NOT RECTANGLE 
    }
    // Check if clicking on existing rectangle
    const clickedRect = e.target.closest('rect');
    if (clickedRect && clickedRect !== this.currentRect) {
        this.selectRectangle(clickedRect);
        return;
    }

    // If not clicking on existing rectangle, start drawing
    this.startDrawing(e);
  }
  dialogBox(e){
     // Check if clicking on existing rectangle

    let name = "";
    let description = "";


    this.selectTXT = e.target;
    this.selectedRectTXT = e.target.closest('rect');
    
  
    const rectInfo = this.descriptions.filter(
      val => val[0] == this.selectedRectTXT
    );



    if (rectInfo.length > 0) {
      name = rectInfo[0][1][0]
      description = rectInfo[0][1][1]
    }
    
    if (name && description && this.selectTXT && this.selectedRectTXT){
      open_dialog_view(name, description)
    } else if (this.selectTXT && this.selectedRectTXT){
      open_editor_view(e)
    }

  }
  selectRectangle(rect) {
      // Deselect previously selected rectangle
      if (this.selectedRect) {
          this.selectedRect.classList.remove('selected-rect');
      }
      this.selectedRectTXT = rect

      // Select new rectangle
      this.selectedRect = rect;
      rect.classList.add('selected-rect');

      // Update control values to match selected rectangle
      document.getElementById('bgColorPicker').value = this.rgbToHex(rect.getAttribute('fill'));
      document.getElementById('borderColorPicker').value = this.rgbToHex(rect.getAttribute('stroke'));
      
      const borderRadius = rect.getAttribute('rx') || '0';
      document.getElementById('borderRadiusSlider').value = borderRadius;
      document.getElementById('borderRadiusValue').textContent = borderRadius;

      const borderThickness = rect.getAttribute('stroke-width') || '2';
      document.getElementById('borderThicknessSlider').value = borderThickness;
      document.getElementById('borderThicknessValue').textContent = borderThickness;
  }

  // Helper method to convert RGB to Hex
  rgbToHex(rgb) {
      // If it's already a hex, return it
      if (rgb.startsWith('#')) return rgb;

      // Parse RGB values
      const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      if (!match) return rgb;

      // Convert to hex
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');

      return `#${r}${g}${b}`;
  }

  clearAllRects() {
    // Remove all rect, keep the grid
    const rects = document.getElementsByTagName('rect')
    Array.prototype.slice.call(rects).forEach(rect => {
      rect.remove();
    });
    
    // Clear history and disable undo button
    // this.pathHistory = [];
    // this.controls.undoButton.disabled = true;
  }
  
  startDrawing(e) {
      // Deselect any previously selected rectangle
      if (this.selectedRect) {
          this.selectedRect.classList.remove('selected-rect');
          this.selectedRect = null;
      }

      this.isDrawing = true;
      const point = this.getGridSnappedCoords(e);
      
      this.currentRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      this.currentRect.setAttribute('x', point.x);
      this.currentRect.setAttribute('y', point.y);
      this.currentRect.setAttribute('width', '0');
      this.currentRect.setAttribute('height', '0');
      this.currentRect.setAttribute('fill', document.getElementById('bgColorPicker').value);
      this.currentRect.setAttribute('stroke', document.getElementById('borderColorPicker').value);
      this.currentRect.setAttribute('stroke-width', '2');
      this.svgElement.appendChild(this.currentRect);

  }

  drawRectangle(e) {
      if (!this.isDrawing) return;
      
      const point = this.getGridSnappedCoords(e);
      const startX = parseFloat(this.currentRect.getAttribute('x'));
      const startY = parseFloat(this.currentRect.getAttribute('y'));
      
      const width = Math.abs(point.x - startX);
      const height = Math.abs(point.y - startY);
      
      const x = point.x < startX ? point.x : startX;
      const y = point.y < startY ? point.y : startY;
      
      this.currentRect.setAttribute('x', x);
      this.currentRect.setAttribute('y', y);
      this.currentRect.setAttribute('width', width);
      this.currentRect.setAttribute('height', height);
  }

  stopDrawing(e) {
      if (!this.isDrawing) return;


      this.isDrawing = false;
      
      // Only add to undo stack if rectangle has some size
      if (parseFloat(this.currentRect.getAttribute('width')) > 0 && 
          parseFloat(this.currentRect.getAttribute('height')) > 0) {
          this.undoStack.push(this.currentRect);
          this.update_text(this.currentRect)
      }
      
      this.currentRect = null;
  }

  update_text(rectangle, text = "Double click to edit") {
    const rectInfo = this.text_rects.filter(
      val => val[0] == rectangle
    );
    this.text_rects = this.text_rects.filter(
      val => val[0] != rectangle
    );
      // remove exixting one
      if(rectInfo.length){
        this.svgElement.removeChild(rectInfo[0][1])
        // this.selectTXT.setAttribute("fill", rectangle.getAttribute("fill"))
      }
      // Calculate center position

      // if(!rectangle){
      //   return false
      // }
      const x = Number(rectangle.getAttribute("x"))
      const y = Number(rectangle.getAttribute("y"))
      const width = Number(rectangle.getAttribute("width"))
      const height = Number(rectangle.getAttribute("height"))
 
      // Calculate appropriate font size (simpler approach)
      // const fontSize = Math.min(
      //     Math.max(width / (text.length * 0.7), 12),
      //     this.height / 2
      // );
      let fontSize = Math.min(Math.max(width / (text.length * 0.7), 12), height /2)
      let centerX = x + Math.max((width - text.length * fontSize)/2, width*0.01);
      let centerY = y + height/2 + height* 0.15;
      // Update text
      let textSvg = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textSvg.setAttribute("x", centerX);
      textSvg.setAttribute("y", centerY);
      textSvg.setAttribute("font-size", fontSize + "px");
      textSvg.setAttribute("fill", "white");
      textSvg.textContent = text;

 
      this.svgElement.appendChild(textSvg);
      this.text_rects.push(
        [rectangle, textSvg]
      )

      let textWidth = textSvg.getComputedTextLength();
      centerX = x + Math.max((width - textWidth)/2, 0);
      centerY = y + height/2 + height* 0.15;
      fontSize = Math.min(Math.max(width / (textWidth * 0.7), 12), height /2)

      textSvg.setAttribute("x", centerX);
      textSvg.setAttribute("y", centerY);

      return true
  }

  undoLastOperation() {
    if(this.toggleManager.getCurrentType() == "line") {
      return
    }
      if (this.undoStack.length === 0) return;

      const lastRect = this.undoStack.pop();
      this.svgElement.removeChild(lastRect);


      // Deselect any selected rectangle
      if (this.selectedRect) {
          this.selectedRect.classList.remove('selected-rect');
          this.selectedRect = null;
      }
  }

  getGridSnappedCoords(e) {
      const rect = this.svgElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Snap to grid
      const snappedX = Math.round(x / this.app.settings.gridSize) * this.app.settings.gridSize;
      const snappedY = Math.round(y / this.app.settings.gridSize) * this.app.settings.gridSize;
      
      return { x: snappedX, y: snappedY };
  }
}


class ToggleManager {
  constructor() {
      // Initial state variable
      this.currentType = 'box';

      // Get all toggle buttons
      this.toggleButtons = document.querySelectorAll('.toggle-btn');

      // Bind the event listener method
      this.handleToggle = this.handleToggle.bind(this);

      // Add event listeners to buttons
      this.toggleButtons.forEach(button => {
          button.addEventListener('click', this.handleToggle);
      });
  }

  // Method to handle toggle
  handleToggle(event) {
      // Remove active class from all buttons
      this.toggleButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      event.target.classList.add('active');

      // Update the state variable
      this.currentType = event.target.dataset.type;

      // Log the current type (you can replace this with any desired action)
  }

  // Optional method to get current type
  getCurrentType() {
      return this.currentType;
  }
}

// Initialize the dialog manager
function open_dialog_view(name, description) {
    $('#dialog-box-viewer').css('display', "block")
    $('#dialog-box-viewer').css('top', "25%")
    $('#EditBtn').css('display', "inline-block")
    $('#view_mode').css('display', "block")
    $('#submitBtn').css('display', "none")
    $('#edit_mode').css('display', "none")
    $('#show_name').html(name)
    $('#show_description').html(description)
}

function open_editor_view() {
    $('#dialog-box-viewer').css('display', "block")
    $('#body').css('backgroundColor', "rgba(0, 0, 0, 0.4)")
    $('#open-editor-btn').css('display', "none")
    $('#EditBtn').css('display', "none")
    $('#view_mode').css('display', "none")
    $('#submitBtn').css('display', "inline-block") 
    $('#edit_mode').css('display', "block")
    $('#show_name').html("<br>")
    $('#show_description').html('<br>')
}

class DialogBox {
  constructor(rectangles) {
      // Dialog Box
      this.rectangles = rectangles
      this.create_description()
      $('#closeBtn, #cancelBtn').click(this.close_editor())
      $('#submitBtn').click(this.submit_button())
      $('#EditBtn').click(this.open_editor())
  }

  create_description() {
      $('#summernote').summernote({
          placeholder: 'Enter description here...',
          height: '400',
          toolbar: [
              ['style', ['style']],
              ['font', ['bold', 'underline', 'clear']],
              ['color', ['color']],
              ['para', ['ul', 'ol', 'paragraph']],
              ['insert', ['link', ]],
              ['view', ['fullscreen', 'help']]
          ]
      });
  }

  close_editor() {
      return () =>  {
          $('#body').css('backgroundColor', "white")
          $('#dialog-box-viewer').css('display', "none")
          $('#open-editor-btn').css('display', "inline-block")
          $('#titles').css('display', "block")
      }

  }

  open_editor() {
      return () => {open_editor_view()}
  }

  submit_button() {
    return () => {
      const name = $('#name').val();
      const description = $('#summernote').summernote('code');
      
      if (name.trim() === '' || description.trim() === '') {
          alert('Please enter a name and description.');
          return;
      }

      let updated = false
      for(let [i, rectInfo] of this.rectangles.descriptions.entries()) {
        if (rectInfo[0] == this.rectangles.selectedRect){
          rectInfo[1] = [name, description]
          updated = true
        }

      }

      if(!updated) {
        this.rectangles.descriptions.push(
          [
            this.rectangles.selectedRect,
            [name, description]
          ]
        )
      }
      let res = this.rectangles.update_text(this.rectangles.selectedRectTXT, name)
      open_dialog_view(name, description)
    }
  }
}

// Packet Management

class PacketAnimationManager {
  constructor() {
      // SVG Elements
      this.svg = document.getElementById('drawingSvg');
      // this.path = document.getElementById('svgPath');
      // this.pathLength = this.path.getTotalLength();
      
      // Dialog Elements
      this.dialog = document.getElementById('dialog');
      this.overlay = document.getElementById('overlay');
      
      // Form Elements
      this.packetIdInput = document.getElementById('packetId');
      this.packetColorInput = document.getElementById('packetColor');
      this.packetSizeInput = document.getElementById('packetSize');
      this.packetDirectionInput = document.getElementById('packetDirection');
      this.animationDurationInput = document.getElementById('animationDuration');
      this.animationRepeatInput = document.getElementById('animationRepeat');
      
      // Buttons
      this.startBtn = document.getElementById('startBtn');
      this.pauseBtn = document.getElementById('pauseBtn');
      this.restartBtn = document.getElementById('restartBtn');
      this.cancelBtn = document.getElementById('cancelBtn');
      this.addPacketBtn = document.getElementById('addPacketBtn');
      this.closeListBtn = document.getElementById('closeListBtn');
      
      // Tabs
      this.tabs = document.querySelectorAll('.tab');
      this.tabContents = document.querySelectorAll('.tab-content');
      
      // Table
      this.packetTableBody = document.getElementById('packetTableBody');
      
      // State variables
      this.packets = [];
      this.animationState = 'stopped'; // 'running', 'paused', 'stopped'
      
      // Initialize
      this.bindEvents();
  }
  
  bindEvents() {
      // Path double-click event
      // this.path.addEventListener('dblclick', () => this.openDialog());
      
      // Button events
      this.startBtn.addEventListener('click', () => this.startAnimation());
      this.pauseBtn.addEventListener('click', () => this.pauseAnimation());
      this.restartBtn.addEventListener('click', () => this.restartAnimation());
      this.cancelBtn.addEventListener('click', () => this.closeDialog());
      this.addPacketBtn.addEventListener('click', () => this.addPacket());
      this.closeListBtn.addEventListener('click', () => this.closeDialog());
      
      // Tab events
      this.tabs.forEach(tab => {
          tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
      });
      
      // Close dialog when clicking overlay
      this.overlay.addEventListener('click', () => this.closeDialog());
  }
  
  openDialog(e) {
      this.path = e.target
      this.pathLength = this.path.getTotalLength();
      this.dialog.style.display = 'block';
      this.overlay.style.display = 'block';
      this.updatePacketTable();
  }
  
  closeDialog() {
      this.dialog.style.display = 'none';
      this.overlay.style.display = 'none';
  }
  
  switchTab(tabId) {
      // Update tab active state
      this.tabs.forEach(tab => {
          tab.classList.toggle('active', tab.dataset.tab === tabId);
      });
      
      // Update tab content visibility
      this.tabContents.forEach(content => {
          content.classList.toggle('active', content.id === tabId + 'Tab');
      });
      
      if (tabId === 'listPackets') {
          this.updatePacketTable();
      }
  }
  
  updatePacketTable() {
      this.packetTableBody.innerHTML = '';
      
      if (this.packets.length === 0) {
          const row = document.createElement('tr');
          row.innerHTML = '<td colspan="7" style="text-align: center;">No packets added yet</td>';
          this.packetTableBody.appendChild(row);
          return;
      }
      
      this.packets.forEach((packet, index) => {
          const row = document.createElement('tr');
          
          // Format the repeat display
          let repeatText;
          if (packet.repeat === -1) {
              repeatText = 'Loop';
          } else if (packet.repeat === 1) {
              repeatText = 'Once';
          } else {
              repeatText = `${packet.repeat} Times`;
          }
          
          row.innerHTML = `
              <td>${packet.id}</td>
              <td style="background-color: ${packet.color}; color: ${this.getContrastColor(packet.color)}">${packet.color}</td>
              <td>${packet.size}px</td>
              <td>${packet.direction === 'start' ? 'Start to End' : 'End to Start'}</td>
              <td>${packet.duration}ms</td>
              <td>${repeatText}</td>
              <td>
                  <button class="delete-btn" data-index="${index}">Delete</button>
              </td>
          `;
          this.packetTableBody.appendChild(row);
      });
      
      // Add event listeners to delete buttons
      const deleteButtons = document.querySelectorAll('.delete-btn');
      deleteButtons.forEach(button => {
          button.addEventListener('click', (e) => {
              const index = parseInt(e.target.dataset.index);
              this.deletePacket(index);
          });
      });
  }
  
  getContrastColor(hexColor) {
      // Convert hex to RGB
      const r = parseInt(hexColor.substr(1, 2), 16);
      const g = parseInt(hexColor.substr(3, 2), 16);
      const b = parseInt(hexColor.substr(5, 2), 16);
      
      // Calculate luminance using ITU-R BT.709
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      
      // Return black or white depending on luminance
      return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  addPacket() {
      const id = this.packetIdInput.value.trim();
      const color = this.packetColorInput.value;
      const size = parseInt(this.packetSizeInput.value);
      const direction = this.packetDirectionInput.value;
      const duration = parseInt(this.animationDurationInput.value);
      const repeat = parseInt(this.animationRepeatInput.value);
      
      // Validate input
      if (!id) {
          alert('Please enter a Packet ID');
          return;
      }
      
      // Check for duplicate ID
      if (this.packets.some(packet => packet.id === id)) {
          alert('Packet ID already exists. Please use a unique ID.');
          return;
      }
      
      // Create packet object
      const packet = {
          id,
          color,
          size,
          direction,
          duration,
          repeat,
          element: null,
          animation: null,
          state: 'stopped'
      };
      
      // Create SVG element for the packet
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('id', `packet-${id}`);
      rect.setAttribute('width', size);
      rect.setAttribute('height', size);
      rect.setAttribute('fill', color);
      rect.setAttribute('visibility', 'hidden'); // Hidden initially
      
      // Position at start or end of path
      const pathPoint = direction === 'start' ? 
          this.path.getPointAtLength(0) : 
          this.path.getPointAtLength(this.pathLength);
      
      rect.setAttribute('x', pathPoint.x - size / 2);
      rect.setAttribute('y', pathPoint.y - size / 2);
      
      // Add to SVG
      this.svg.appendChild(rect);
      
      // Store the element reference
      packet.element = rect;
      
      // Create animation using anime.js motion path
      this.createPathAnimation(packet);
      
      // Add to packets array
      this.packets.push(packet);
      
      // Update buttons
      this.startBtn.disabled = false;
      
      // Reset form
      this.packetIdInput.value = '';
      
      // Close dialog
      this.closeDialog();
  }
  
  createPathAnimation(packet) {
      const pathNode = this.path;
      const rect = packet.element;
      const size = packet.size;
      const duration = packet.duration;
      const direction = packet.direction;
      const repeat = packet.repeat;
      
      // Create SVG points for motion
      const pathLength = this.pathLength;
      let motionPath = [];
      
      // Create points along the path for animation
      const numPoints = 100; // More points = smoother animation
      for (let i = 0; i <= numPoints; i++) {
          const point = pathNode.getPointAtLength(
              direction === 'start' ? 
                  (i / numPoints) * pathLength : 
                  (1 - (i / numPoints)) * pathLength
          );
          motionPath.push({ x: point.x - size / 2, y: point.y - size / 2 });
      }
      
      // Create the animation
      const animation = anime({
          targets: rect,
          translateX: 0, // Reset any previous translations
          translateY: 0,
          x: motionPath.map(p => p.x),
          y: motionPath.map(p => p.y),
          duration: duration,
          easing: 'linear',
          autoplay: false,
          loop: repeat,
          begin: () => {
              rect.setAttribute('visibility', 'visible');
          },
          complete: () => {
              rect.setAttribute('visibility', 'hidden');
              packet.state = 'stopped';
              this.checkAllAnimationsComplete();
          }
      });
      
      packet.animation = animation;
  }
  
  deletePacket(index) {
      const packet = this.packets[index];
      
      // Remove SVG element
      if (packet.element) {
          this.svg.removeChild(packet.element);
      }
      
      // Remove from packets array
      this.packets.splice(index, 1);
      
      // Update UI
      this.updatePacketTable();
      
      // Update buttons
      if (this.packets.length === 0) {
          this.startBtn.disabled = true;
          this.pauseBtn.disabled = true;
          this.restartBtn.disabled = true;
          this.animationState = 'stopped';
      }
  }
  
  startAnimation() {
      if (this.animationState === 'running') return;
      
      this.packets.forEach(packet => {
          if (packet.state !== 'running') {
              packet.animation.play();
              packet.state = 'running';
          }
      });
      
      this.animationState = 'running';
      this.startBtn.disabled = true;
      this.pauseBtn.disabled = false;
      this.restartBtn.disabled = false;
  }
  
  pauseAnimation() {
      if (this.animationState !== 'running') return;
      
      this.packets.forEach(packet => {
          if (packet.state === 'running') {
              packet.animation.pause();
              packet.state = 'paused';
          }
      });
      
      this.animationState = 'paused';
      this.startBtn.disabled = false;
      this.pauseBtn.disabled = true;
  }
  
  restartAnimation() {
      this.packets.forEach(packet => {
          packet.animation.restart();
          packet.state = 'running';
      });
      
      this.animationState = 'running';
      this.startBtn.disabled = true;
      this.pauseBtn.disabled = false;
  }
  
  checkAllAnimationsComplete() {
      const allStopped = this.packets.every(packet => packet.state === 'stopped');
      
      if (allStopped) {
          this.animationState = 'stopped';
          this.startBtn.disabled = false;
          this.pauseBtn.disabled = true;
          this.restartBtn.disabled = false;
      }
  }
}


// Initialize the drawing system
document.addEventListener('DOMContentLoaded', () => {
  const packetManager = new PacketAnimationManager();
  const toggleManager = new ToggleManager();

  const screenHeight = window.innerHeight;
  const screenWidth = window.innerWidth;

  let width = screenWidth - Math.ceil(screenWidth * 0.022);
  let height = screenHeight - Math.ceil(screenHeight * 0.25);

  const app = new GridDrawingApp({
    packetManager: packetManager,
    toggleManager: toggleManager,
    svgElement: document.getElementById('drawingSvg'),
    width: width,
    height: height,
    controls: {
      lineColor: document.getElementById('lineColor'),
      lineThickness: document.getElementById('lineThickness'),
      thicknessValue: document.getElementById('thicknessValue'),
      gridSize: document.getElementById('gridSize'),
      gridSizeValue: document.getElementById('gridSizeValue'),
      dashedLine: document.getElementById('dashedLine'),
      dashArray: document.getElementById('dashArray'),
      dashArrayValue: document.getElementById('dashArrayValue'),
      dashSettingsGroup: document.getElementById('dashSettingsGroup'),
      undoButton: document.getElementById('undoButton'),
      clearButton: document.getElementById('clearButton'),
      getPathsButton: document.getElementById('getPathsButton'),
      pathOutput: document.getElementById('pathOutput')
    }
  });
  
  const svgElement = document.getElementById('drawingSvg');

  const rectangleD = new RectangleDrawer(app, toggleManager, svgElement);

  const dialog = new DialogBox(rectangleD)
});