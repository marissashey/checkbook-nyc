// nyc spending visualization - user interactions

class InteractionHandler {
  constructor(vizCore) {
    this.vizCore = vizCore;
  }

  // helper function to test if mouse position hits a segment
  isSegmentHit(mx, my, segment, offsetX = 0, offsetY = 0, scale = 1) {
    const segX = segment.x * scale + offsetX;
    const segY = (segment.y || 0) * scale + offsetY;
    const segWidth = segment.width * scale;
    const segHeight = this.vizCore.BOX_HEIGHT * scale;
    
    // extended hit area to include the top of the 3d box
    const depth = 30 * scale;
    const angle = 0.5;
    const topExtension = depth * angle;

    return (
      mx > segX - segWidth / 2 &&
      mx < segX + segWidth / 2 + depth * angle &&
      my > segY - segHeight / 2 - topExtension &&
      my < segY + segHeight / 2
    );
  }

  // helper function to handle hover actions
  handleSegmentHover(segmentIndex, segment, context, inMinimap = false) {
    this.vizCore.hoveredSegment = segmentIndex;
    this.vizCore.hoveredInMinimap = inMinimap;
    
    if (this.vizCore.currentTooltipData !== segment.data) {
      this.updateDisplay(segment.data, context);
    }
    cursor("pointer");
  }

  mouseMoved() {
    if (!this.vizCore.dataManager.dataLoaded) return;

    // check if mouse is over tooltip - if so, don't hide it
    const tooltip = document.getElementById("hover-tooltip");
    if (tooltip.classList.contains("visible")) {
      const rect = tooltip.getBoundingClientRect();
      if (mouseX >= rect.left && mouseX <= rect.right && 
          mouseY >= rect.top && mouseY <= rect.bottom) {
        return;
      }
    }

    const mx = mouseX - width / 2;
    const my = mouseY - height / 2 - 30; // Account for 30px downward shift of bars
    this.vizCore.hoveredSegment = null;
    this.vizCore.hoveredInMinimap = false;

    // check main view segments
    if (this.vizCore.currentView === "citywide") {
      for (let index = 0; index < this.vizCore.citywideSegments.length; index++) {
        const segment = this.vizCore.citywideSegments[index];
        if (this.isSegmentHit(mx, my, segment)) {
          this.handleSegmentHover(index, segment, "citywide");
          return;
        }
      }
    }

    // check miniature citywide when in department view
    if (this.vizCore.currentView === "department" && this.vizCore.citywideSegments) {
      const cornerMx = mx - this.vizCore.citywidePos.x;
      const cornerMy = my - this.vizCore.citywidePos.y;

      for (let index = 0; index < this.vizCore.citywideSegments.length; index++) {
        const segment = this.vizCore.citywideSegments[index];
        if (this.isSegmentHit(cornerMx, cornerMy, segment, 0, 0, this.vizCore.citywideScale)) {
          this.handleSegmentHover(index, segment, "citywide", true);
          return;
        }
      }
    }

    // check department view segments
    if (this.vizCore.currentView === "department" && !this.vizCore.hoveredInMinimap) {
      for (let index = 0; index < this.vizCore.segments.length; index++) {
        const segment = this.vizCore.segments[index];
        if (this.isSegmentHit(mx, my, segment)) {
          this.handleSegmentHover(index, segment, "department");
          return;
        }
      }
    }

    if (this.vizCore.hoveredSegment === null) {
      cursor("crosshair");
      if (this.vizCore.currentTooltipData) {
        this.vizCore.currentTooltipData = null;
        this.resetDisplay();
      }
    }
  }

  mousePressed() {
    if (!this.vizCore.dataManager.dataLoaded) return;

    const mx = mouseX - width / 2;
    const my = mouseY - height / 2 - 30; // Account for 30px downward shift of bars

    // when in department view, check minimap first
    if (this.vizCore.currentView === "department" && this.vizCore.citywideSegments) {
      const cornerMx = mx - this.vizCore.citywidePos.x;
      const cornerMy = my - this.vizCore.citywidePos.y;

      for (let index = 0; index < this.vizCore.citywideSegments.length; index++) {
        const segment = this.vizCore.citywideSegments[index];

        if (this.isSegmentHit(cornerMx, cornerMy, segment, 0, 0, this.vizCore.citywideScale)) {
          if (segment.data.name === this.vizCore.currentDepartment) {
            this.vizCore.returnToCitywide();
          } else if (!segment.data.collapsed) {
            this.vizCore.currentDepartment = segment.data.name;
            this.vizCore.createDepartmentBars(this.vizCore.currentDepartment);
            this.resetDisplay();
            document.getElementById('reset-btn').classList.add('visible');
          }
          return;
        }
      }
    }

    // check main segments
    if (this.vizCore.hoveredSegment !== null && !this.vizCore.hoveredInMinimap) {
      if (this.vizCore.currentView === "citywide") {
        const segment = this.vizCore.citywideSegments[this.vizCore.hoveredSegment];

        if (segment.data.collapsed && !segment.data.name.includes("programs")) {
          return;
        }

        this.vizCore.currentDepartment = segment.data.name;
        this.vizCore.currentView = "department";
        this.vizCore.createDepartmentBars(this.vizCore.currentDepartment);

        document.getElementById('reset-btn').classList.add('visible');

        // move to bottom-right, offset from center
        const miniWidth = this.vizCore.calculateBarWidth("citywide") * 0.7;
        const miniHeight = this.vizCore.BOX_HEIGHT * 0.7;
        const margin = 40;
        
        this.vizCore.targetCitywidePos.x = min(width * 0.15, (width / 2) - (miniWidth / 2) - margin);
        this.vizCore.targetCitywidePos.y = min(height * 0.25, (height / 2) - (miniHeight / 2) - margin);
        this.vizCore.targetCitywideScale = 0.7;

        this.vizCore.triggerFadeTransition();
      }
    }
  }

  updateDisplay(data, context) {
    const tooltip = document.getElementById("hover-tooltip");
    const valueDiv = tooltip.querySelector(".tooltip-value");
    const percentageDiv = tooltip.querySelector(".tooltip-percentage");
    const breakdownDiv = tooltip.querySelector(".tooltip-breakdown");
    const scrollHintDiv = tooltip.querySelector(".tooltip-scroll-hint");
    
    const value = (data.value / 1000000000).toFixed(2);
    valueDiv.textContent = "$" + value + "B";
    
    const totalValue = context === "citywide"
      ? this.vizCore.dataManager.departments_df.reduce((sum, d) => sum + d.value, 0)
      : this.vizCore.segments.reduce((sum, s) => sum + s.data.value, 0);

    const percentage = (data.value / totalValue) * 100;
    const percentageStr = formatPercentage(percentage);
    let contextLabel = "";
    if (context === "citywide") {
      contextLabel = "citywide spending";
    } else {
      contextLabel = this.vizCore.currentDepartment ? 
        `${this.vizCore.currentDepartment} spending` : 
        "departmental spending";
    }
    
    percentageDiv.textContent = `${percentageStr}% of ${contextLabel}`;
    
    // add breakdown for "other" items
    if (data.collapsed && data.collapsed.length > 0) {
      let html = "";
      let budgetCodesTotal = 0;
      let budgetCodesCount = 0;
      let programs = [];
      
      data.collapsed.forEach((item) => {
        if (this.vizCore.dataManager.isSpendingCode(item.name)) {
          budgetCodesTotal += item.value;
          budgetCodesCount++;
        } else {
          programs.push(item);
        }
      });
      
      if (budgetCodesCount > 0) {
        const codeValue = (budgetCodesTotal / 1000000000).toFixed(2);
        const codePct = formatPercentage((budgetCodesTotal / data.value) * 100);
        html += `<div class="tooltip-breakdown-item" style="font-weight: 600; color: #88b0d3;">Budget Codes (${budgetCodesCount} items): $${codeValue}B (${codePct}%)</div>`;
      }
      
      programs.forEach((item) => {
        const itemValue = (item.value / 1000000000).toFixed(2);
        const itemPct = item.percentage
          ? formatPercentage(item.percentage)
          : formatPercentage((item.value / data.value) * 100);
        html += `<div class="tooltip-breakdown-item">${item.name}: $${itemValue}B (${itemPct}%)</div>`;
      });
      
      breakdownDiv.innerHTML = html;
      breakdownDiv.style.display = "block";
      
      if (data.collapsed.length > 8) {
        scrollHintDiv.textContent = "↓ Scroll for more";
        scrollHintDiv.style.display = "block";
      } else {
        scrollHintDiv.style.display = "none";
      }
    } else {
      breakdownDiv.style.display = "none";
      scrollHintDiv.style.display = "none";
    }
    
    tooltip.style.left = mouseX + "px";
    tooltip.style.top = mouseY + "px";
    tooltip.style.pointerEvents = data.collapsed && data.collapsed.length > 0 ? "auto" : "none";
    tooltip.classList.add("visible");
    
    this.vizCore.currentTooltipData = data;
  }

  resetDisplay() {
    const tooltip = document.getElementById("hover-tooltip");
    tooltip.classList.remove("visible");
    tooltip.style.pointerEvents = "none";
  }
}

// global p5.js event handlers
function mouseMoved() {
  if (window.interactionHandler) {
    window.interactionHandler.mouseMoved();
  }
}

function mousePressed() {
  if (window.interactionHandler) {
    window.interactionHandler.mousePressed();
  }
}