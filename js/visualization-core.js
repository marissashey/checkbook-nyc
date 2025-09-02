// nyc spending visualization - core rendering
class VisualizationCore {
  constructor(dataManager) {
    this.dataManager = dataManager;
    
    // visualization state
    this.segments = [];
    this.citywideSegments = null;
    this.hoveredSegment = null;
    this.hoveredInMinimap = false;
    this.currentView = "citywide";
    this.currentDepartment = null;
    this.animationProgress = 0;
    this.targetAnimationProgress = 1;
    
    // tooltip state
    this.currentTooltipData = null;
    
    // axis animation state
    this.currentAxisTicks = [];
    this.targetAxisTicks = [];
    this.axisTransitionProgress = 1;
    
    // animation for citywide position
    this.citywidePos = { x: 0, y: 0 };
    this.targetCitywidePos = { x: 0, y: 0 };
    this.citywideScale = 1;
    this.targetCitywideScale = 1;
    
    // constants
    this.BOX_HEIGHT = 60;
    this.MIN_WIDTH = 8;
    this.AXIS_MARGIN = 40;
    this.TICK_HEIGHT = 8;
  }

  setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent("canvas-container");

    this.dataManager.loadTreemapData().then(() => {
      if (this.dataManager.dataLoaded) this.createCitywideBars();
    });
  }

  draw() {
    background(10, 10, 15);
    if (!this.dataManager.dataLoaded) return;

    this.animationProgress += (this.targetAnimationProgress - this.animationProgress) * 0.02;

    // smooth animation for citywide position
    this.citywidePos.x += (this.targetCitywidePos.x - this.citywidePos.x) * 0.02;
    this.citywidePos.y += (this.targetCitywidePos.y - this.citywidePos.y) * 0.02;
    this.citywideScale += (this.targetCitywideScale - this.citywideScale) * 0.02;

    // draw fixed axis at top
    this.drawFixedAxis();

    push();
    if (this.currentView === "department") {
      this.drawSegments(this.segments, 1, true, 0, 0, 1, false);
    }

    // draw citywide (either main view or corner mini-view)
    if (this.citywideSegments) {
      const opacity = this.currentView === "department" ? 0.4 : 1;
      const showLabels = true;
      const isHighlighted = this.currentView === "department";
      this.drawSegments(
        this.citywideSegments,
        opacity,
        showLabels,
        this.citywidePos.x,
        this.citywidePos.y,
        this.citywideScale,
        isHighlighted
      );
    }
    pop();
  }

  calculateBarWidth(viewType = this.currentView) {
    if (viewType === "citywide") {
      const padding = 120;
      const maxWidth = min(width * 0.7, 800);
      const availableWidth = width - padding * 2;
      return min(availableWidth, maxWidth);
    } else {
      const padding = 250;
      const maxWidth = min(width * 0.45, 550);
      const availableWidth = width - padding * 2;
      return min(availableWidth, maxWidth);
    }
  }

  drawSegments(segs, opacity, drawLabels, offsetX, offsetY, scaleFactor, isHighlighted, hoveredSegmentIndex) {
    push();
    translate(width / 2 + offsetX, height / 2 + offsetY + 30); // Moved bars down by 30px
    scale(scaleFactor);

    const sortedSegments = [...segs].sort((a, b) => a.x - b.x);

    // draw boxes
    sortedSegments.forEach((segment) => {
      const segIndex = segs.indexOf(segment);

      push();
      translate(segment.x, segment.y + (segment.hoverOffset || 0));

      let boxScale = 1;
      let isHovered = this.isSegmentHovered(segs, segIndex);

      // enhanced hover effects with movement and scale
      if (isHovered) {
        segment.hoverOffset = segment.hoverOffset || 0;
        segment.hoverOffset += (-8 - segment.hoverOffset) * 0.15;
        boxScale = 1.08;
        segment.currentBrightness += (1.4 - segment.currentBrightness) * 0.08;
      } else if (isHighlighted && segment.data.name === this.currentDepartment) {
        segment.hoverOffset = segment.hoverOffset || 0;
        segment.hoverOffset += (0 - segment.hoverOffset) * 0.15;
        boxScale = 1;
        segment.currentBrightness += (1.2 - segment.currentBrightness) * 0.08;
      } else {
        segment.hoverOffset = segment.hoverOffset || 0;
        segment.hoverOffset += (0 - segment.hoverOffset) * 0.15;
        boxScale = 1;
        segment.currentBrightness += (0.85 - segment.currentBrightness) * 0.08;
      }

      this.draw3DBox(segment, boxScale, opacity, isHighlighted);
      
      pop();
    });

    // draw labels with 45° diagonal leader lines
    if (drawLabels) {
      this.drawLabels(sortedSegments, segs, scaleFactor, opacity);
    }

    pop();
  }

  draw3DBox(segment, boxScale, opacity, isHighlighted) {
    const h = this.BOX_HEIGHT * this.animationProgress * boxScale;
    const w = segment.width * boxScale;
    const depth = 30;
    const angle = 0.5;

    push();

    // enhanced shadow
    const shadowOpacity = isHighlighted && segment.data.name === this.currentDepartment ? 80 : 60;
    fill(0, 0, 0, shadowOpacity * opacity);
    noStroke();
    beginShape();
    vertex(-w / 2 + 8, h / 2 + 8);
    vertex(w / 2 + 8, h / 2 + 8);
    vertex(w / 2 + 8 + depth * angle, h / 2 + 8 - depth * angle);
    vertex(-w / 2 + 8, -h / 2 + 8);
    endShape(CLOSE);

    const col = segment.color;

    // right face
    fill(
      col[0] * segment.currentBrightness * 0.6,
      col[1] * segment.currentBrightness * 0.6,
      col[2] * segment.currentBrightness * 0.6,
      255 * opacity
    );
    stroke(255, 255, 255, 150 * opacity);
    strokeWeight(1);
    beginShape();
    vertex(w / 2, -h / 2);
    vertex(w / 2 + depth * angle, -h / 2 - depth * angle);
    vertex(w / 2 + depth * angle, h / 2 - depth * angle);
    vertex(w / 2, h / 2);
    endShape(CLOSE);

    // top face
    fill(
      col[0] * segment.currentBrightness,
      col[1] * segment.currentBrightness,
      col[2] * segment.currentBrightness,
      255 * opacity
    );
    beginShape();
    vertex(-w / 2, -h / 2);
    vertex(w / 2, -h / 2);
    vertex(w / 2 + depth * angle, -h / 2 - depth * angle);
    vertex(-w / 2 + depth * angle, -h / 2 - depth * angle);
    endShape(CLOSE);

    // front face
    fill(
      col[0] * segment.currentBrightness * 0.8,
      col[1] * segment.currentBrightness * 0.8,
      col[2] * segment.currentBrightness * 0.8,
      255 * opacity
    );
    rect(-w / 2, -h / 2, w, h);

    // highlight selected department
    if (isHighlighted && segment.data.name === this.currentDepartment) {
      noFill();
      strokeWeight(1);
      stroke(255, 255, 150, 120 * opacity);
      rect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
    }

    pop();
  }

  isSegmentHovered(segs, segIndex) {
    return (
      (segs === this.segments &&
        this.hoveredSegment === segIndex &&
        this.currentView === "department" &&
        !this.hoveredInMinimap) ||
      (segs === this.citywideSegments &&
        this.hoveredSegment === segIndex &&
        ((this.currentView === "citywide" && !this.hoveredInMinimap) ||
          (this.currentView === "department" && this.hoveredInMinimap)))
    );
  }

  windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    this.createCitywideBars();
    if (this.currentDepartment) {
      this.createDepartmentBars(this.currentDepartment);
    }
  }

  // axis drawing methods
  updateAxisTicks() {
    const activeSegs = this.currentView === "citywide" ? this.citywideSegments : this.segments;
    if (!activeSegs || activeSegs.length === 0) return;

    const values = activeSegs.map((s) => s.data.value);
    const maxValue = Math.max(...values);
    const minValue = 0;
    const barWidth = this.calculateBarWidth();
    const newTicks = generateAxisTicks(minValue, maxValue, barWidth);

    if (JSON.stringify(this.targetAxisTicks) !== JSON.stringify(newTicks)) {
      this.currentAxisTicks = [...this.targetAxisTicks];
      this.targetAxisTicks = newTicks;
      this.axisTransitionProgress = 0;
    }
  }

  drawFixedAxis() {
    if (!this.dataManager.dataLoaded || this.targetAxisTicks.length === 0) return;

    this.axisTransitionProgress += (1 - this.axisTransitionProgress) * 0.025;

    const displayTicks = [];

    if (this.axisTransitionProgress < 1 && this.currentAxisTicks.length > 0) {
      const progress = this.axisTransitionProgress;

      this.targetAxisTicks.forEach((targetTick, i) => {
        if (i < this.currentAxisTicks.length) {
          const currentTick = this.currentAxisTicks[i];
          displayTicks.push({
            value: lerp(currentTick.value, targetTick.value, progress),
            position: lerp(currentTick.position, targetTick.position, progress),
            opacity: 1,
          });
        } else {
          displayTicks.push({
            ...targetTick,
            opacity: progress,
          });
        }
      });

      this.currentAxisTicks.slice(this.targetAxisTicks.length).forEach((oldTick) => {
        displayTicks.push({
          ...oldTick,
          opacity: 1 - progress,
        });
      });
    } else {
      displayTicks.push(...this.targetAxisTicks.map((tick) => ({ ...tick, opacity: 1 })));
    }

    push();
    translate(width / 2, 140);

    const axisWidth = this.calculateBarWidth();

    for (let i = 1; i < displayTicks.length; i++) {
      const prevTick = displayTicks[i - 1];
      const currentTick = displayTicks[i];
      const midPosition = (prevTick.position + currentTick.position) / 2;
      const alpha = Math.min(prevTick.opacity || 1, currentTick.opacity || 1);

      const barDistance = this.currentView === "citywide"
        ? height / 2 + 60 - 140
        : height / 2 - 20 - 140;

      stroke(60, 60, 60, 25 * alpha);
      strokeWeight(0.5);
      line(midPosition, 0, midPosition, barDistance);
    }

    displayTicks.forEach((tick) => {
      const alpha = tick.opacity || 1;

      stroke(120, 120, 120, 150 * alpha);
      strokeWeight(1);
      line(tick.position, -this.TICK_HEIGHT / 3, tick.position, this.TICK_HEIGHT / 3);

      push();
      translate(tick.position, -this.TICK_HEIGHT / 2 - 8);

      noStroke();
      fill(150, 150, 150, 200 * alpha);
      const fontSize = window.innerWidth < 600 ? 12 : window.innerWidth < 1000 ? 13 : 14;
      textSize(fontSize);
      textFont("Barlow Condensed");
      textAlign(CENTER, BOTTOM);

      text(formatAxisValue(tick.value), 0, 0);
      pop();
    });

    pop();
  }

  drawLabels(sortedSegments, segs, scaleFactor, opacity) {
    const isMiniature = scaleFactor < 1;
    const isCitywide = segs === this.citywideSegments;
    
    if (isCitywide || !isMiniature) {
      sortedSegments.forEach((segment, idx) => {
        const isTop = idx % 2 === 1;

        push();
        translate(segment.x, segment.y);

        const lineLength = 26;
        const invisibleLength = 3;

        let startX, startY, endX, endY;
        let visibleStartX, visibleStartY;

        if (isTop) {
          const depth = 30;
          const angle = 0.5;
          startX = depth * angle;
          startY = -this.BOX_HEIGHT / 2 - depth * angle;
          endX = startX + lineLength * cos(-PI / 4);
          endY = startY + lineLength * sin(-PI / 4);

          visibleStartX = startX + invisibleLength * cos(-PI / 4);
          visibleStartY = startY + invisibleLength * sin(-PI / 4);
        } else {
          startX = 0;
          startY = this.BOX_HEIGHT / 2;
          endX = startX + lineLength * cos((3 * PI) / 4);
          endY = startY + lineLength * sin((3 * PI) / 4);

          visibleStartX = startX + invisibleLength * cos((3 * PI) / 4);
          visibleStartY = startY + invisibleLength * sin((3 * PI) / 4);
        }

        const isInDepartmentView = this.currentView === "department" && isCitywide;
        const lineColor = isInDepartmentView ? 180 : 255;
        const lineOpacity = isInDepartmentView ? 160 : 200;
        stroke(lineColor, lineColor, lineColor, lineOpacity * opacity);
        strokeWeight(1);
        line(visibleStartX, visibleStartY, endX, endY);

        push();
        translate(endX, endY);

        if (isTop) {
          rotate(-PI / 4);
        } else {
          rotate(-PI / 4);
        }

        noStroke();
        const textColor = isInDepartmentView ? 200 : 220;
        const textOpacity = isInDepartmentView ? 220 : 255;
        fill(textColor, textColor, textColor, textOpacity * opacity);

        const segIndex = segs.indexOf(segment);
        const isHovered = this.isSegmentHovered(segs, segIndex);
        
        const baseFontSize = isMiniature && isCitywide ? 13 : 15;
        const fontSize = isHovered ? baseFontSize + 3 : baseFontSize;
        textSize(fontSize);
        textFont("Inter");

        const label = segment.data.name;

        if (isTop) {
          textAlign(LEFT, CENTER);
          text(label, 8, 0);
        } else {
          textAlign(RIGHT, CENTER);
          text(label, -8, 0);
        }

        pop();
        pop();
      });
    }
  }

  createCitywideBars() {
    this.segments = [];
    const totalValue = this.dataManager.departments_df.reduce((sum, d) => sum + d.value, 0);
    const barWidth = this.calculateBarWidth("citywide");
    let currentX = -barWidth / 2;

    const mainDepts = [];
    const otherDepts = [];
    let otherTotal = 0;

    this.dataManager.departments_df.forEach((dept) => {
      const segmentWidth = (dept.value / totalValue) * barWidth;
      if (segmentWidth >= this.MIN_WIDTH) {
        mainDepts.push(dept);
      } else {
        otherDepts.push(dept);
        otherTotal += dept.value;
      }
    });

    mainDepts.forEach((dept, i) => {
      const segmentWidth = (dept.value / totalValue) * barWidth;
      this.segments.push({
        x: currentX + segmentWidth / 2,
        y: 0,
        width: segmentWidth,
        data: dept,
        color: dept.color,
        currentBrightness: 1,
        type: "department",
      });
      currentX += segmentWidth;
    });

    if (otherDepts.length > 0) {
      const otherWidth = (otherTotal / totalValue) * barWidth;
      const otherData = {
        name: `Other (${otherDepts.length} depts)`,
        value: otherTotal,
        percentage: (otherTotal / totalValue) * 100,
        collapsed: otherDepts.sort((a, b) => b.value - a.value),
        color: [180, 180, 180],
      };

      this.segments.push({
        x: currentX + otherWidth / 2,
        y: 0,
        width: otherWidth,
        data: otherData,
        color: otherData.color,
        currentBrightness: 1,
        type: "department",
      });
    }

    this.citywideSegments = [...this.segments];
    this.animationProgress = 0;
    this.targetAnimationProgress = 1;

    this.updateAxisTicks();
  }

  createDepartmentBars(deptName) {
    this.segments = [];
    const programs = this.dataManager.prepareProgramData(deptName);
    const dept = this.dataManager.departments_df.find((d) => d.name === deptName);

    let actualTotalValue = 0;
    if (this.dataManager.dept_children_map[deptName]) {
      const originalPrograms = this.dataManager.dept_children_map[deptName];
      actualTotalValue = originalPrograms.reduce((sum, p) => sum + p.value, 0);
    } else {
      actualTotalValue = programs.reduce((sum, p) => sum + p.value, 0);
    }

    const totalValue = actualTotalValue || dept.value;
    const barWidth = this.calculateBarWidth("department");
    let currentX = -barWidth / 2;
    const yOffset = -50;

    const mainPrograms = [];
    const smallPrograms = [];
    let smallTotal = 0;

    let allSpendingCodes = [];
    if (this.dataManager.dept_children_map[deptName]) {
      const originalPrograms = this.dataManager.dept_children_map[deptName];
      allSpendingCodes = originalPrograms.filter((p) => this.dataManager.isSpendingCode(p.name));
    }

    programs.forEach((prog) => {
      const segmentWidth = (prog.value / totalValue) * barWidth;
      if (segmentWidth >= this.MIN_WIDTH) {
        mainPrograms.push(prog);
      } else {
        smallPrograms.push(prog);
        smallTotal += prog.value;
      }
    });

    if (allSpendingCodes.length > 0) {
      const spendingTotal = allSpendingCodes.reduce((sum, p) => sum + p.value, 0);
      smallTotal += spendingTotal;
    }

    mainPrograms.forEach((prog, i) => {
      const segmentWidth = (prog.value / totalValue) * barWidth;
      const intensity = prog.value / mainPrograms[0].value;
      const col = [
        dept.color[0] * (0.5 + intensity * 0.5),
        dept.color[1] * (0.5 + intensity * 0.5),
        dept.color[2] * (0.5 + intensity * 0.5),
      ];

      prog.percentage = (prog.value / totalValue) * 100;

      this.segments.push({
        x: currentX + segmentWidth / 2,
        y: yOffset,
        width: segmentWidth,
        data: prog,
        color: col,
        currentBrightness: 1,
        type: "program",
      });

      currentX += segmentWidth;
    });

    if (smallPrograms.length > 0 || allSpendingCodes.length > 0) {
      const otherWidth = (smallTotal / totalValue) * barWidth;
      const combinedItems = [...smallPrograms, ...allSpendingCodes].sort((a, b) => b.value - a.value);
      const otherData = {
        name: `Other (${combinedItems.length} items)`,
        value: smallTotal,
        percentage: (smallTotal / totalValue) * 100,
        collapsed: combinedItems,
        color: [
          dept.color[0] * 0.6,
          dept.color[1] * 0.6,
          dept.color[2] * 0.6,
        ],
      };

      this.segments.push({
        x: currentX + otherWidth / 2,
        y: yOffset,
        width: otherWidth,
        data: otherData,
        color: otherData.color,
        currentBrightness: 1,
        type: "program",
      });
    }

    this.animationProgress = 0;
    this.targetAnimationProgress = 1;

    this.updateAxisTicks();
  }

  returnToCitywide() {
    this.currentView = "citywide";
    this.currentDepartment = null;
    this.segments = [...this.citywideSegments];
    
    document.getElementById('reset-btn').classList.remove('visible');

    this.targetCitywidePos.x = 0;
    this.targetCitywidePos.y = 0;
    this.targetCitywideScale = 1;

    if (window.interactionHandler) {
      window.interactionHandler.resetDisplay();
    }

    this.triggerFadeTransition();
  }

  triggerFadeTransition() {
    this.segments.forEach((seg) => (seg.currentBrightness = 0));
  }
}