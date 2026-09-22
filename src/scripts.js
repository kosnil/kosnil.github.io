const tabButtons = [...document.querySelectorAll("[data-tab]")];
const tabPanels = [...document.querySelectorAll("[role='tabpanel']")];
const tabLinks = [...document.querySelectorAll("[data-select-tab]")];
const tabNames = new Set(tabButtons.map((button) => button.dataset.tab));

function activateTab(tabName, options = {}) {
  const name = tabNames.has(tabName) ? tabName : "research";
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === name;
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
  tabPanels.forEach((tabPanel) => {
    tabPanel.hidden = tabPanel.id !== name;
  });

  if (options.updateHash && window.location.hash !== `#${name}`) {
    window.history.pushState(null, "", `#${name}`);
  }
}

tabButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab, { updateHash: true });
  });
  button.addEventListener("keydown", (event) => {
    let nextIndex = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabButtons.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabButtons.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextButton = tabButtons[nextIndex];
    nextButton.focus();
    activateTab(nextButton.dataset.tab, { updateHash: true });
  });
});

tabLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    activateTab(link.dataset.selectTab, { updateHash: true });
  });
});

window.addEventListener("popstate", () => {
  activateTab(window.location.hash.slice(1));
});

activateTab(window.location.hash.slice(1));

const panel = document.querySelector(".paper-panel");
const backdrop = document.querySelector(".panel-backdrop");
const details = [...document.querySelectorAll("[data-paper-detail]")];
const openButtons = [...document.querySelectorAll("[data-open-paper]")];
const closeButtons = [...document.querySelectorAll("[data-close-panel]")];
let lastTrigger = null;

function openPanel(paperId, trigger) {
  details.forEach((detail) => {
    detail.hidden = detail.dataset.paperDetail !== paperId;
  });
  lastTrigger = trigger;
  backdrop.hidden = false;
  document.body.classList.add("panel-open");
  panel.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    panel.classList.add("is-open");
    backdrop.classList.add("is-open");
    panel.querySelector(".panel-close").focus();
  });
}

function closePanel() {
  panel.classList.remove("is-open");
  backdrop.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("panel-open");
  window.setTimeout(() => {
    backdrop.hidden = true;
    details.forEach((detail) => { detail.hidden = true; });
  }, 250);
  if (lastTrigger) lastTrigger.focus();
}

openButtons.forEach((button) => {
  button.addEventListener("click", () => openPanel(button.dataset.openPaper, button));
});

closeButtons.forEach((button) => button.addEventListener("click", closePanel));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && panel.classList.contains("is-open")) closePanel();
});

const rfSlider = document.querySelector("#rf-k");
const rfCdf = document.querySelector("#rf-cdf");
const rfSupport = document.querySelector("#rf-support");
const rfSupportTable = document.querySelector("#rf-support-table");
const svgNamespace = "http://www.w3.org/2000/svg";
const forecastCase = { mean: 21, spread: 1.8, recentBias: 1.1, observed: 23.6 };

function pseudoRandom(index, salt) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function normalDraw(index, salt) {
  const u1 = Math.max(pseudoRandom(index, salt), 1e-8);
  const u2 = pseudoRandom(index, salt + 0.37);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const rfData = Array.from({ length: 320 }, (_, index) => {
  const day = 1 + Math.floor(pseudoRandom(index, 1.4) * 365);
  const seasonal = Math.sin(((day - 105) / 365) * 2 * Math.PI);
  const mean = 13.5 + 8.5 * seasonal + 4.1 * normalDraw(index, 2.2);
  const spread = 0.55 + 3 * pseudoRandom(index, 4.7);
  const recentBias = Math.max(-3.2, Math.min(3.2, 0.25 * seasonal + 1.15 * normalDraw(index, 5.8)));
  const observed = mean + 0.65 * recentBias + normalDraw(index, 7.1) * spread * 0.82;
  const distanceSquared =
    ((mean - forecastCase.mean) / 4.5) ** 2 +
    ((spread - forecastCase.spread) / 0.72) ** 2 +
    ((recentBias - forecastCase.recentBias) / 1.05) ** 2;
  return { index, mean, spread, recentBias, observed, distanceSquared, rawWeight: Math.exp(-0.5 * distanceSquared) };
});

const totalRawWeight = rfData.reduce((sum, point) => sum + point.rawWeight, 0);
rfData.forEach((point) => { point.weight = point.rawWeight / totalRawWeight; });
const rfWeightOrder = [...rfData].sort((a, b) => b.weight - a.weight);

function svgElement(name, attributes = {}, text = "") {
  const element = document.createElementNS(svgNamespace, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  if (text) element.textContent = text;
  return element;
}

function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
  return (value) => rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function interpolateColor(from, to, amount) {
  const channels = from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount));
  return `rgb(${channels.join(", ")})`;
}

function biasColor(value) {
  const bounded = Math.max(-3, Math.min(3, value));
  const neutral = [164, 166, 160];
  const endpoint = bounded < 0 ? [70, 108, 127] : [148, 91, 65];
  return interpolateColor(neutral, endpoint, Math.abs(bounded) / 3);
}

function stepPath(points, xScale, yScale, weightAccessor, left, right, bottom) {
  let cumulative = 0;
  let path = `M ${left} ${bottom}`;
  points.forEach((point) => {
    const x = xScale(point.observed);
    path += ` L ${x} ${yScale(cumulative)} L ${x} ${yScale(cumulative + weightAccessor(point))}`;
    cumulative += weightAccessor(point);
  });
  return `${path} L ${right} ${yScale(cumulative)}`;
}

function renderCdf(retained, retainedMass) {
  rfCdf.replaceChildren();
  const left = 38;
  const right = 484;
  const top = 16;
  const bottom = 212;
  const outcomes = rfData.map((point) => point.observed);
  const domainMin = Math.floor(Math.min(...outcomes) - 1);
  const domainMax = Math.ceil(Math.max(...outcomes) + 1);
  const x = linearScale(domainMin, domainMax, left, right);
  const y = linearScale(0, 1, bottom, top);

  [0, 0.5, 1].forEach((tick) => {
    rfCdf.append(
      svgElement("line", { x1: left, x2: right, y1: y(tick), y2: y(tick), class: "grid-line" }),
      svgElement("text", { x: left - 8, y: y(tick) + 3, "text-anchor": "end", class: "axis-label" }, tick.toFixed(1))
    );
  });
  [domainMin, Math.round((domainMin + domainMax) / 2), domainMax].forEach((tick) => {
    rfCdf.append(svgElement("text", { x: x(tick), y: 238, "text-anchor": "middle", class: "axis-label" }, `${tick}°`));
  });
  rfCdf.append(
    svgElement("line", { x1: left, x2: right, y1: bottom, y2: bottom, class: "axis" }),
    svgElement("line", { x1: left, x2: left, y1: top, y2: bottom, class: "axis" })
  );

  const fullSorted = [...rfData].sort((a, b) => a.observed - b.observed);
  const retainedSorted = [...retained].sort((a, b) => a.observed - b.observed);
  rfCdf.append(
    svgElement("path", { d: stepPath(fullSorted, x, y, (point) => point.weight, left, right, bottom), class: "cdf-full" }),
    svgElement("path", { d: stepPath(retainedSorted, x, y, (point) => point.weight / retainedMass, left, right, bottom), class: "cdf-sparse" })
  );

  const observationX = x(forecastCase.observed);
  rfCdf.append(
    svgElement("line", { x1: observationX, x2: observationX, y1: top, y2: bottom, class: "cdf-observation" }),
    svgElement("text", { x: observationX + 5, y: top + 10, class: "observation-label" }, `observation ${forecastCase.observed.toFixed(1)}°`)
  );

  fullSorted.forEach((point) => {
    rfCdf.append(svgElement("line", { x1: x(point.observed), x2: x(point.observed), y1: bottom + 3, y2: bottom + 6, class: "rug-full" }));
  });
  retained.forEach((point) => {
    const height = 5 + 13 * Math.sqrt(point.weight / rfWeightOrder[0].weight);
    rfCdf.append(svgElement("line", { x1: x(point.observed), x2: x(point.observed), y1: bottom + 3, y2: bottom + 3 + height, class: "rug-retained" }));
  });
}

function updateSupportDetail(point, retainedMass) {
  const bias = `${point.recentBias >= 0 ? "+" : ""}${point.recentBias.toFixed(1)} °C`;
  document.querySelector("#rf-support-detail").innerHTML = `
    <span>Observed<strong>${point.observed.toFixed(1)} °C</strong></span>
    <span>Ens. mean<strong>${point.mean.toFixed(1)} °C</strong></span>
    <span>Spread<strong>${point.spread.toFixed(1)} °C</strong></span>
    <span>Recent bias<strong>${bias}</strong></span>
    <span>Weight<strong>${(100 * point.weight / retainedMass).toFixed(1)}%</strong></span>
  `;
}

function renderSupportPlot(retained, retainedMass) {
  rfSupport.replaceChildren();
  const left = 38;
  const right = 484;
  const top = 16;
  const bottom = 201;
  const means = rfData.map((point) => point.mean);
  const xMin = Math.floor(Math.min(...means) - 1);
  const xMax = Math.ceil(Math.max(...means) + 1);
  const yMin = 0.4;
  const yMax = 3.7;
  const x = linearScale(xMin, xMax, left, right);
  const y = linearScale(yMin, yMax, bottom, top);

  [0.5, 2, 3.5].forEach((tick) => {
    rfSupport.append(
      svgElement("line", { x1: left, x2: right, y1: y(tick), y2: y(tick), class: "grid-line" }),
      svgElement("text", { x: left - 8, y: y(tick) + 3, "text-anchor": "end", class: "axis-label" }, tick.toFixed(1))
    );
  });
  [xMin, Math.round((xMin + xMax) / 2), xMax].forEach((tick) => {
    rfSupport.append(svgElement("text", { x: x(tick), y: 226, "text-anchor": "middle", class: "axis-label" }, `${tick}°`));
  });
  rfSupport.append(
    svgElement("line", { x1: left, x2: right, y1: bottom, y2: bottom, class: "axis" }),
    svgElement("line", { x1: left, x2: left, y1: top, y2: bottom, class: "axis" })
  );

  rfData.forEach((point) => {
    rfSupport.append(svgElement("circle", { cx: x(point.mean), cy: y(point.spread), r: 1.7, class: "support-all" }));
  });

  retained.slice().reverse().forEach((point) => {
    const circle = svgElement("circle", {
      cx: x(point.mean),
      cy: y(point.spread),
      r: 2.6 + 5.2 * Math.sqrt(point.weight / rfWeightOrder[0].weight),
      class: "support-retained",
      style: `--support-color: ${biasColor(point.recentBias)}`,
      tabindex: "0",
      role: "button",
      "aria-label": `Support point: observed ${point.observed.toFixed(1)} degrees, ensemble mean ${point.mean.toFixed(1)} degrees, recent bias ${point.recentBias.toFixed(1)} degrees`
    });
    circle.addEventListener("mouseenter", () => updateSupportDetail(point, retainedMass));
    circle.addEventListener("focus", () => updateSupportDetail(point, retainedMass));
    rfSupport.append(circle);
  });

  const queryX = x(forecastCase.mean);
  const queryY = y(forecastCase.spread);
  rfSupport.append(
    svgElement("line", { x1: queryX - 7, x2: queryX + 7, y1: queryY, y2: queryY, class: "query-mark" }),
    svgElement("line", { x1: queryX, x2: queryX, y1: queryY - 7, y2: queryY + 7, class: "query-mark" }),
    svgElement("text", { x: queryX + 9, y: queryY - 8, class: "axis-label" }, "new case · bias +1.1°")
  );

  updateSupportDetail(retained[0], retainedMass);
}

function renderSupportTable(retained, retainedMass) {
  const rows = retained.map((point, rank) => {
    const row = document.createElement("tr");
    row.tabIndex = 0;
    row.innerHTML = `
      <td>${rank + 1}</td>
      <td>${(100 * point.weight / retainedMass).toFixed(2)}%</td>
      <td>${point.observed.toFixed(1)} °C</td>
      <td>${point.mean.toFixed(1)} °C</td>
      <td>${point.spread.toFixed(1)} °C</td>
      <td>${point.recentBias >= 0 ? "+" : ""}${point.recentBias.toFixed(1)} °C</td>
    `;
    row.addEventListener("mouseenter", () => updateSupportDetail(point, retainedMass));
    row.addEventListener("focus", () => updateSupportDetail(point, retainedMass));
    return row;
  });
  rfSupportTable.replaceChildren(...rows);
}

function updateRfFigure() {
  const k = Number(rfSlider.value);
  const retained = rfWeightOrder.slice(0, k);
  const mass = retained.reduce((sum, point) => sum + point.weight, 0);
  const effective = 1 / retained.reduce((sum, point) => sum + (point.weight / mass) ** 2, 0);

  document.querySelector("#rf-k-output").value = `${k} of ${rfData.length}`;
  document.querySelector("#rf-mass").textContent = `${Math.round(mass * 100)}%`;
  document.querySelector("#rf-effective").textContent = effective.toFixed(1);
  document.querySelector("#rf-table-count").textContent = `${k} rows`;
  renderCdf(retained, mass);
  renderSupportPlot(retained, mass);
  renderSupportTable(retained, mass);
}

rfSlider.addEventListener("input", updateRfFigure);
updateRfFigure();

const outcomeSlider = document.querySelector("#forecast-outcome");
const outcomeMark = document.querySelector("#forecast-outcome-mark");

function updateForecastFigure() {
  const outcome = Number(outcomeSlider.value);
  outcomeMark.style.left = `${outcome}%`;
  document.querySelector("#forecast-outcome-output").value = outcome;

  let status = "The outcome falls inside the central 50% interval.";
  if (outcome < 30 || outcome > 66) status = "The outcome is outside the central 50%, but inside the 95% interval.";
  if (outcome < 10 || outcome > 90) status = "The outcome falls outside the 95% interval.";
  document.querySelector("#forecast-status").textContent = status;
}

outcomeSlider.addEventListener("input", updateForecastFigure);
updateForecastFigure();

const maskSlider = document.querySelector("#mask-progress");
const maskNetwork = document.querySelector("#mask-network");
const networkLayerSpecs = [
  { key: "input", label: "INPUT", nodePrefix: "x", x: 42, count: 6, yStart: 60, yEnd: 330 },
  { key: "hidden1", label: "HIDDEN 1", nodePrefix: "h¹", x: 190, count: 9, yStart: 40, yEnd: 350 },
  { key: "hidden2", label: "HIDDEN 2", nodePrefix: "h²", x: 340, count: 7, yStart: 55, yEnd: 335 },
  { key: "output", label: "OUTPUT", nodePrefix: "y", x: 488, count: 3, yStart: 130, yEnd: 270 }
];
const layerMagnitudes = [0.18, 0.12, 0.28];
const networkLayers = networkLayerSpecs.map((layer) => ({
  ...layer,
  nodes: Array.from({ length: layer.count }, (_, index) => ({
    x: layer.x,
    y: layer.count === 1 ? (layer.yStart + layer.yEnd) / 2 : layer.yStart + index * ((layer.yEnd - layer.yStart) / (layer.count - 1)),
    label: `${layer.nodePrefix}${index + 1}`
  }))
}));
const networkEdges = [];

networkLayers.slice(0, -1).forEach((layer, layerIndex) => {
  const nextLayer = networkLayers[layerIndex + 1];
  layer.nodes.forEach((source, sourceIndex) => {
    nextLayer.nodes.forEach((target, targetIndex) => {
      networkEdges.push({
        source,
        target,
        sourceIndex,
        targetIndex,
        layerIndex,
        layerLabel: `${layer.label.toLowerCase()} → ${nextLayer.label.toLowerCase()}`,
        magnitude: layerMagnitudes[layerIndex]
      });
    });
  });
});

const finalRetainedEdgeIndices = new Set(
  networkEdges
    .map((edge, index) => ({ edge, index }))
    .filter(({ index }) => pseudoRandom(index, 21.2) >= 0.84)
    .map(({ index }) => index)
);
const outputConnectionLayer = networkLayers.length - 2;
networkLayers[networkLayers.length - 1].nodes.forEach((_, targetIndex) => {
  const incoming = networkEdges
    .map((edge, index) => ({ edge, index }))
    .filter(({ edge }) => edge.layerIndex === outputConnectionLayer && edge.targetIndex === targetIndex);
  if (!incoming.some(({ index }) => finalRetainedEdgeIndices.has(index))) {
    const strongest = incoming.reduce((best, candidate) =>
      pseudoRandom(candidate.index, 21.2) > pseudoRandom(best.index, 21.2) ? candidate : best
    );
    finalRetainedEdgeIndices.add(strongest.index);
  }
});

function maskStageName(progress) {
  if (progress === 0) return "initialization";
  if (progress < 25) return "sign search";
  if (progress < 55) return "mask formation";
  if (progress < 85) return "pruning";
  if (progress < 100) return "refinement";
  return "final mask";
}

function maskStateForEdge(edge, index, progress) {
  if (progress === 0) return "pending";
  const importance = pseudoRandom(index, 21.2);
  const retainedAtEnd = finalRetainedEdgeIndices.has(index);
  const dropAt = 18 + importance * 72;
  if (!retainedAtEnd && progress >= dropAt) return "zero";

  const finalSign = pseudoRandom(index, 8.4) >= 0.5 ? "plus" : "minus";
  if (progress >= 85) return finalSign;
  const signRound = Math.ceil(progress / 10);
  return pseudoRandom(index + signRound * 137 + edge.layerIndex * 29, 4.9) >= 0.5 ? "plus" : "minus";
}

function updateMaskConnectionDetail(state, edge) {
  const magnitude = edge.magnitude.toFixed(2);
  let mask = "not learned";
  let effective = "—";
  let action = "candidate connection";
  if (state === "plus") {
    mask = "+1";
    effective = `+${magnitude}`;
    action = "kept";
  } else if (state === "minus") {
    mask = "−1";
    effective = `−${magnitude}`;
    action = "sign inverted";
  } else if (state === "zero") {
    mask = "0";
    effective = "0";
    action = "removed";
  }
  document.querySelector("#mask-connection-detail").innerHTML = `
    <span>Layer<strong>${edge.layerLabel}</strong></span>
    <span>Connection<strong>${edge.source.label} → ${edge.target.label}</strong></span>
    <span>Fixed magnitude<strong>${magnitude}</strong></span>
    <span>Learned mask<strong>${mask}</strong></span>
    <span>Effective weight<strong>${effective} · ${action}</strong></span>
  `;
}

function renderMaskNetwork(states) {
  maskNetwork.replaceChildren();
  networkLayers.forEach((layer) => {
    maskNetwork.append(svgElement("text", { x: layer.x, y: 18, "text-anchor": "middle", class: "mask-layer-label" }, layer.label));
  });

  networkEdges.forEach((edge, index) => {
    const state = states[index];
    const line = svgElement("line", {
      x1: edge.source.x,
      y1: edge.source.y,
      x2: edge.target.x,
      y2: edge.target.y,
      class: `mask-edge is-${state}`
    });
    line.append(svgElement("title", {}, `${edge.source.label} → ${edge.target.label} · |w| = ${edge.magnitude.toFixed(2)} · ${state}`));
    line.addEventListener("mouseenter", () => updateMaskConnectionDetail(state, edge));
    maskNetwork.append(line);
  });

  networkLayers.flatMap((layer) => layer.nodes).forEach((node) => {
    maskNetwork.append(
      svgElement("circle", { cx: node.x, cy: node.y, r: 8.5, class: "mask-node" }),
      svgElement("text", { x: node.x, y: node.y + 2.5, "text-anchor": "middle", class: "mask-node-label" }, node.label)
    );
  });
}

function updateMaskFigure() {
  const progress = Number(maskSlider.value);
  const states = networkEdges.map((edge, index) => maskStateForEdge(edge, index, progress));
  const activeCount = states.filter((state) => state !== "zero").length;
  document.querySelector("#mask-progress-output").value = `${progress}% · ${maskStageName(progress)}`;
  document.querySelector("#mask-active-output").textContent = progress === 0 ? `${networkEdges.length} candidates` : `${activeCount} of ${networkEdges.length}`;
  renderMaskNetwork(states);
  updateMaskConnectionDetail(states[0], networkEdges[0]);
}

maskSlider.addEventListener("input", updateMaskFigure);
updateMaskFigure();
