// nyc spending visualization - utility functions

// axis utility functions
function calculateNiceInterval(range, targetTicks = 8) {
  const viewportWidth = window.innerWidth;
  if (viewportWidth < 600) targetTicks = 4;
  else if (viewportWidth < 1000) targetTicks = 6;
  else targetTicks = 8;

  const roughInterval = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
  const normalized = roughInterval / magnitude;

  let niceInterval;
  if (normalized < 1.5) niceInterval = 1;
  else if (normalized < 3) niceInterval = 2;
  else if (normalized < 7) niceInterval = 5;
  else niceInterval = 10;

  return niceInterval * magnitude;
}

function formatAxisValue(value) {
  if (value === 0) return "$0";
  if (value >= 1000000000) {
    const billions = value / 1000000000;
    return `$${billions.toFixed(0)}B`;
  }
  if (value >= 100000000) {
    const billions = value / 1000000000;
    return `$${billions.toFixed(0)}B`;
  }
  if (value >= 1000000) {
    const millions = value / 1000000;
    return `$${millions.toFixed(0)}M`;
  }
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercentage(percentage) {
  return (Math.round(percentage * 10) / 10).toString();
}

function generateAxisTicks(minValue, maxValue, barWidth) {
  const range = maxValue - minValue;
  const interval = calculateNiceInterval(range);
  const ticks = [];

  const start = Math.ceil(minValue / interval) * interval;
  for (let value = start; value <= maxValue; value += interval) {
    const position = ((value - minValue) / range) * barWidth - barWidth / 2;
    ticks.push({ value, position });
  }

  // always include 0 if it's in range
  if (minValue <= 0 && maxValue >= 0) {
    const zeroPosition = ((0 - minValue) / range) * barWidth - barWidth / 2;
    if (!ticks.some((tick) => Math.abs(tick.value) < 0.01)) {
      ticks.unshift({ value: 0, position: zeroPosition });
    }
  }
  return ticks.sort((a, b) => a.value - b.value);
}

// scroll handling
function handleScroll() {
  const scrollIndicator = document.getElementById("scroll-indicator");
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  if (scrollTop + windowHeight >= documentHeight - 100) {
    scrollIndicator.classList.add("hidden");
  } else {
    scrollIndicator.classList.remove("hidden");
  }
}

// smooth scroll to about section
function smoothScrollToAbout() {
  const aboutSection = document.getElementById("about-section");
  if (aboutSection) {
    const yOffset = -50;
    const y = aboutSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
}

// tooltip hover handling
let tooltipHideTimeout;

function initializeTooltipHandlers() {
  document.getElementById("hover-tooltip").addEventListener("mouseenter", function () {
    if (tooltipHideTimeout) {
      clearTimeout(tooltipHideTimeout);
      tooltipHideTimeout = null;
    }
  });

  document.getElementById("hover-tooltip").addEventListener("mouseleave", function () {
    tooltipHideTimeout = setTimeout(function () {
      if (window.vizCore) {
        window.vizCore.currentTooltipData = null;
        window.vizCore.resetDisplay();
      }
    }, 100);
  });
}

// initialize event listeners
window.addEventListener("scroll", handleScroll);
window.addEventListener("load", handleScroll);

// global functions for navigation
function returnToCitywide() {
  if (window.vizCore) {
    window.vizCore.returnToCitywide();
  }
}