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
  constructor(app, toggleManager, svgElement) {
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

      // Bind methods to ensure correct context
      this.handleMouseDown = this.handleMouseDown.bind(this);
      this.drawRectangle = this.drawRectangle.bind(this);
      this.stopDrawing = this.stopDrawing.bind(this);
      this.undoLastOperation = this.undoLastOperation.bind(this);

      this.initialize();
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
    console.log('"çlicked"')
    const name = $('#name').val();
    const description = $('#summernote').summernote('code');
    
    if (name && description){
      open_dialog_view()
    } else{
      open_editor_view()
    }

    //  const clickedRect = e.target.closest('rect');
    //  const dialog = new DialogBox()
    //  dialog.open_editor()
  }
  selectRectangle(rect) {
      // Deselect previously selected rectangle
      if (this.selectedRect) {
          this.selectedRect.classList.remove('selected-rect');
      }

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

  stopDrawing() {
      if (!this.isDrawing) return;

      this.isDrawing = false;
      
      // Only add to undo stack if rectangle has some size
      if (parseFloat(this.currentRect.getAttribute('width')) > 0 && 
          parseFloat(this.currentRect.getAttribute('height')) > 0) {
          this.undoStack.push(this.currentRect);
      }

      this.currentRect = null;
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
function open_dialog_view() {
    $('#dialog-box-viewer').css('display', "block")
    $('#dialog-box-viewer').css('top', "25%")
    $('#EditBtn').css('display', "inline-block")
    $('#view_mode').css('display', "block")
    $('#submitBtn').css('display', "none")
    $('#edit_mode').css('display', "none")
    $('#show_name').html($('#name').val())
    $('#show_description').html($('#summernote').summernote('code'))
}
function open_editor_view() {
    $('#dialog-box-viewer').css('display', "block")
    $('#body').css('backgroundColor', "rgba(0, 0, 0, 0.4)")
    $('#open-editor-btn').css('display', "none")
    $('#EditBtn').css('display', "none")
    $('#view_mode').css('display', "none")
    $('#submitBtn').css('display', "inline-block") 
    $('#edit_mode').css('display', "block")
}

class DialogBox {
  constructor() {
      this.name = "NAME"
      this.description = "DES"

      // Dialog Box
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
      return function() {
          $('#body').css('backgroundColor', "white")
          $('#dialog-box-viewer').css('display', "none")
          $('#open-editor-btn').css('display', "inline-block")
          $('#titles').css('display', "block")
      }

  }

  open_editor() {
      return function() {open_editor_view()}
  }

  submit_button() {
      return function() {
          const name = $('#name').val();
          const description = $('#summernote').summernote('code');
          
          if (name.trim() === '' || description.trim() === '') {
              alert('Please enter a name and description.');
              return;
          }
              
          this.name = name
          this.description = description
          console.log(description.trim())
          open_dialog_view()
      }
  }
}

// Initialize the drawing system
document.addEventListener('DOMContentLoaded', () => {
  const dialog = new DialogBox()
  const toggleManager = new ToggleManager();

  const screenHeight = window.innerHeight;
  const screenWidth = window.innerWidth;

  let width = screenWidth - Math.ceil(screenWidth * 0.022);
  let height = screenHeight - Math.ceil(screenHeight * 0.25);

  const app = new GridDrawingApp({
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

  new RectangleDrawer(app, toggleManager, svgElement);
});