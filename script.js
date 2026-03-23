/*
README
How this webpage teaches PCA:
- The page is organized as a question-driven learning lab. Each section answers one conceptual question:
  what the original data looks like, why centering matters, what covariance means, how eigenvectors and
  eigenvalues define principal components, why the top x components are chosen, and what information is lost
  during reconstruction.
- Every control updates the full teaching flow: the synthetic or uploaded dataset, the covariance matrix,
  the principal-component plots, the explained-variance charts, and the reconstruction metrics.

Where the PCA computation happens:
- `analyzeDataset()` runs the PCA pipeline for any dataset dimension used by the app.
- `computeCovarianceMatrix()` builds the covariance matrix from centered data.
- `jacobiEigenDecomposition()` performs a symmetric eigendecomposition for the covariance matrix.
- `computeRetentionResult()` projects onto the retained components and reconstructs the data.

How to customize the dataset:
- Edit `DEFAULTS` for the initial dimensionality, point count, spread, correlation, noise, and keep count.
- Edit `generateSyntheticDataset()` to change the latent shape, rotations, and mean offsets of the synthetic data.
- Upload a CSV with 2 or 3 numeric columns to replace the synthetic data.
*/

const DEFAULTS = {
  dimensionMode: 3,
  pointCount: 140,
  spread: 4.2,
  correlation: 0.75,
  noise: 0.22,
  keepCount: 3
};

const AXIS_LABELS = ["x", "y", "z", "w", "v"];
const COMPONENT_COLORS = ["#2b465c", "#667f92", "#9aa7b2", "#bcc4ca"];
const SELECTED_COMPONENT_COLOR = "#1f5fae";
const PROJECTION_POINT_COLOR = "#c97f23";

const state = {
  ...DEFAULTS,
  labels: AXIS_LABELS.slice(0, DEFAULTS.dimensionMode),
  source: "synthetic dataset",
  points: [],
  selectedComponent: 0,
  selectedProjectionComponent: 0,
  selectedProjectionPointId: null,
  componentCamera: null,
  projectionCamera: null,
  focus: "original",
  walkthroughTimer: null,
  walkthroughStep: -1
};

let elements = {};

window.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  cacheElements();
  attachEventListeners();
  regenerateSyntheticDataset();
}

function cacheElements() {
  elements = {
    dimensionMode: document.getElementById("dimensionMode"),
    pointCount: document.getElementById("pointCount"),
    pointCountValue: document.getElementById("pointCountValue"),
    spreadControl: document.getElementById("spreadControl"),
    spreadValue: document.getElementById("spreadValue"),
    correlationControl: document.getElementById("correlationControl"),
    correlationValue: document.getElementById("correlationValue"),
    noiseControl: document.getElementById("noiseControl"),
    noiseValue: document.getElementById("noiseValue"),
    keepSlider: document.getElementById("keepSlider"),
    keepNumber: document.getElementById("keepNumber"),
    keepCountLabel: document.getElementById("keepCountLabel"),
    keepSummary: document.getElementById("keepSummary"),
    csvUpload: document.getElementById("csvUpload"),
    regenerateBtn: document.getElementById("regenerateBtn"),
    walkthroughBtn: document.getElementById("walkthroughBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    resetBtn: document.getElementById("resetBtn"),
    datasetSummary: document.getElementById("datasetSummary"),
    roadmapList: document.getElementById("roadmapList"),
    originalLead: document.getElementById("originalLead"),
    originalInsight: document.getElementById("originalInsight"),
    centeringSummary: document.getElementById("centeringSummary"),
    covarianceMatrix: document.getElementById("covarianceMatrix"),
    covarianceInsight: document.getElementById("covarianceInsight"),
    componentInsight: document.getElementById("componentInsight"),
    componentCards: document.getElementById("componentCards"),
    projectionSummary: document.getElementById("projectionSummary"),
    projectionInsight: document.getElementById("projectionInsight"),
    projectionComponentSelector: document.getElementById("projectionComponentSelector"),
    projectionSourcePlot: document.getElementById("projectionSourcePlot"),
    projectionDetailPlot: document.getElementById("projectionDetailPlot"),
    topXExplanation: document.getElementById("topXExplanation"),
    reconstructionMetrics: document.getElementById("reconstructionMetrics"),
    reconstructionExplanation: document.getElementById("reconstructionExplanation"),
    projectNotes: document.getElementById("projectNotes"),
    componentPlot: document.getElementById("componentPlot")
  };
}

function attachEventListeners() {
  elements.dimensionMode.addEventListener("change", (event) => {
    stopWalkthrough();
    state.dimensionMode = Number(event.target.value);
    state.focus = "original";
    regenerateSyntheticDataset();
  });

  elements.pointCount.addEventListener("input", (event) => {
    stopWalkthrough();
    state.pointCount = Number(event.target.value);
    state.focus = "original";
    regenerateSyntheticDataset();
  });

  elements.spreadControl.addEventListener("input", (event) => {
    stopWalkthrough();
    state.spread = Number(event.target.value);
    state.focus = "original";
    regenerateSyntheticDataset();
  });

  elements.correlationControl.addEventListener("input", (event) => {
    stopWalkthrough();
    state.correlation = Number(event.target.value);
    state.focus = "original";
    regenerateSyntheticDataset();
  });

  elements.noiseControl.addEventListener("input", (event) => {
    stopWalkthrough();
    state.noise = Number(event.target.value);
    state.focus = "original";
    regenerateSyntheticDataset();
  });

  elements.keepSlider.addEventListener("input", (event) => {
    stopWalkthrough();
    state.keepCount = clampKeepCount(Number(event.target.value), state.labels.length);
    state.focus = "variance";
    renderApp();
  });

  elements.keepNumber.addEventListener("input", (event) => {
    stopWalkthrough();
    state.keepCount = clampKeepCount(Number(event.target.value), state.labels.length);
    state.focus = "variance";
    renderApp();
  });

  elements.csvUpload.addEventListener("change", handleCsvUpload);
  elements.regenerateBtn.addEventListener("click", () => {
    stopWalkthrough();
    state.focus = "original";
    regenerateSyntheticDataset();
  });
  elements.walkthroughBtn.addEventListener("click", toggleWalkthrough);
  elements.downloadBtn.addEventListener("click", downloadDatasetCsv);
  elements.resetBtn.addEventListener("click", resetState);
  elements.componentCards.addEventListener("click", handleComponentCardClick);
  elements.projectionComponentSelector.addEventListener("click", handleProjectionComponentClick);
}

function regenerateSyntheticDataset() {
  const synthetic = generateSyntheticDataset(
    state.dimensionMode,
    state.pointCount,
    state.spread,
    state.correlation,
    state.noise
  );

  state.points = synthetic.points;
  state.labels = synthetic.labels;
  state.source = "synthetic dataset";
  state.keepCount = clampKeepCount(state.keepCount, state.labels.length);
  state.selectedComponent = clampComponentIndex(state.selectedComponent, state.labels.length);
  state.selectedProjectionComponent = clampComponentIndex(state.selectedProjectionComponent, state.labels.length);
  state.componentCamera = null;
  state.selectedProjectionPointId = null;
  state.projectionCamera = null;
  renderApp();
}

function handleCsvUpload(event) {
  stopWalkthrough();
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = parseCsvText(String(reader.result || ""));
      state.points = parsed.points;
      state.labels = parsed.labels;
      state.dimensionMode = parsed.labels.length;
      state.pointCount = parsed.points.length;
      state.keepCount = clampKeepCount(state.keepCount, state.labels.length);
      state.selectedComponent = 0;
      state.selectedProjectionComponent = 0;
      state.componentCamera = null;
      state.selectedProjectionPointId = null;
      state.projectionCamera = null;
      state.source = `uploaded CSV: ${file.name}`;
      state.focus = "original";
      renderApp();
    } catch (error) {
      window.alert(error.message);
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function toggleWalkthrough() {
  if (state.walkthroughTimer) {
    stopWalkthrough();
    renderApp();
    return;
  }

  state.walkthroughStep = -1;
  elements.walkthroughBtn.textContent = "Stop walkthrough";
  runWalkthroughStep();
  state.walkthroughTimer = window.setInterval(runWalkthroughStep, 1900);
}

function runWalkthroughStep() {
  const sequence = buildWalkthroughSequence(state.labels.length);
  state.walkthroughStep += 1;

  if (state.walkthroughStep >= sequence.length) {
    stopWalkthrough();
    return;
  }

  const step = sequence[state.walkthroughStep];
  state.focus = step.focus;
  if (typeof step.keepCount === "number") {
    state.keepCount = clampKeepCount(step.keepCount, state.labels.length);
  }

  renderApp();
  const sectionId = focusToSectionId(step.focus);
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function buildWalkthroughSequence(dimension) {
  return [
    { focus: "original" },
    { focus: "centering" },
    { focus: "covariance" },
    { focus: "components" },
    { focus: "projection" },
    { focus: "variance", keepCount: 1 },
    { focus: "reconstruction", keepCount: Math.min(Math.max(1, dimension - 1), dimension) }
  ];
}

function stopWalkthrough() {
  if (state.walkthroughTimer) {
    window.clearInterval(state.walkthroughTimer);
    state.walkthroughTimer = null;
  }
  state.walkthroughStep = -1;
  if (elements.walkthroughBtn) {
    elements.walkthroughBtn.textContent = "Play walkthrough";
  }
}

function resetState() {
  stopWalkthrough();
  state.dimensionMode = DEFAULTS.dimensionMode;
  state.pointCount = DEFAULTS.pointCount;
  state.spread = DEFAULTS.spread;
  state.correlation = DEFAULTS.correlation;
  state.noise = DEFAULTS.noise;
  state.keepCount = DEFAULTS.keepCount;
  state.selectedComponent = 0;
  state.selectedProjectionComponent = 0;
  state.componentCamera = null;
  state.selectedProjectionPointId = null;
  state.projectionCamera = null;
  state.focus = "original";
  elements.csvUpload.value = "";
  regenerateSyntheticDataset();
}

function handleComponentCardClick(event) {
  const card = event.target.closest("[data-component-index]");
  if (!card) {
    return;
  }

  stopWalkthrough();
  state.focus = "components";
  state.selectedComponent = clampComponentIndex(Number(card.dataset.componentIndex), state.labels.length);
  renderApp();
}

function handleProjectionComponentClick(event) {
  const button = event.target.closest("[data-projection-component]");
  if (!button) {
    return;
  }

  const componentIndex = clampComponentIndex(Number(button.dataset.projectionComponent), state.labels.length);
  if (componentIndex === state.selectedProjectionComponent) {
    return;
  }

  stopWalkthrough();
  state.focus = "projection";
  state.selectedProjectionComponent = componentIndex;
  renderApp();
}

function renderApp() {
  state.selectedComponent = clampComponentIndex(state.selectedComponent, state.labels.length);
  state.selectedProjectionComponent = clampComponentIndex(state.selectedProjectionComponent, state.labels.length);
  syncControls();
  syncRoadmap();

  const analysis = analyzeDataset(state.points, state.labels);
  const retention = computeRetentionResult(analysis, state.keepCount);

  renderDatasetSummary(analysis, retention);
  renderOriginalSection(analysis);
  renderCenteringSection(analysis);
  renderCovarianceSection(analysis);
  renderComponentSection(analysis);
  renderProjectionSection(analysis, retention);
  renderVarianceSection(analysis, retention);
  renderReconstructionSection(analysis, retention);
  renderProjectNotes();
}

function bindComponentPlotClick() {
  const plot = elements.componentPlot;
  if (!plot || typeof plot.on !== "function") {
    return;
  }

  if (typeof plot.removeAllListeners === "function") {
    plot.removeAllListeners("plotly_click");
    plot.removeAllListeners("plotly_relayout");
  }

  plot.on("plotly_click", (event) => {
    const clickedTrace = event?.points?.[0]?.data;
    const componentIndex = clickedTrace?.meta?.componentIndex;
    if (!Number.isInteger(componentIndex) || componentIndex === state.selectedComponent) {
      return;
    }

    stopWalkthrough();
    state.focus = "components";
    state.selectedComponent = clampComponentIndex(componentIndex, state.labels.length);
    renderApp();
  });

  plot.on("plotly_relayout", (event) => {
    if (event?.["scene.camera"]) {
      state.componentCamera = event["scene.camera"];
    }
  });
}

function bindProjectionSourcePlotClick() {
  const plot = elements.projectionSourcePlot;
  if (!plot || typeof plot.on !== "function") {
    return;
  }

  if (typeof plot.removeAllListeners === "function") {
    plot.removeAllListeners("plotly_click");
    plot.removeAllListeners("plotly_relayout");
  }

  plot.on("plotly_click", (event) => {
    const clickedPoint = event?.points?.[0];
    const clickedTrace = clickedPoint?.data;
    const pointId = Number(clickedPoint?.customdata);
    if (!clickedTrace?.meta?.projectionSource || !Number.isInteger(pointId) || pointId === state.selectedProjectionPointId) {
      return;
    }

    stopWalkthrough();
    state.focus = "projection";
    state.selectedProjectionPointId = pointId;
    renderApp();
  });

  plot.on("plotly_relayout", (event) => {
    if (event?.["scene.camera"]) {
      state.projectionCamera = event["scene.camera"];
    }
  });
}

function syncControls() {
  elements.dimensionMode.value = String(state.dimensionMode);
  elements.pointCount.min = String(Math.min(30, state.pointCount));
  elements.pointCount.max = String(Math.max(320, state.pointCount));
  elements.pointCount.step = state.source.startsWith("uploaded") ? "1" : "10";
  elements.pointCount.value = String(state.pointCount);
  elements.pointCountValue.textContent = String(state.pointCount);
  elements.spreadControl.value = String(state.spread);
  elements.spreadValue.textContent = Number(state.spread).toFixed(1);
  elements.correlationControl.value = String(state.correlation);
  elements.correlationValue.textContent = Number(state.correlation).toFixed(2);
  elements.noiseControl.value = String(state.noise);
  elements.noiseValue.textContent = Number(state.noise).toFixed(2);

  const dimension = state.labels.length;
  elements.keepSlider.max = String(dimension);
  elements.keepNumber.max = String(dimension);
  elements.keepSlider.value = String(state.keepCount);
  elements.keepNumber.value = String(state.keepCount);
  elements.keepCountLabel.textContent = String(state.keepCount);
  elements.keepSummary.textContent = "These are kept because they are the directions that capture the most important variation in the data.";
}

function syncRoadmap() {
  Array.from(elements.roadmapList.querySelectorAll("li")).forEach((item) => {
    item.classList.toggle("active", item.dataset.focus === state.focus);
  });
}

function syncSelectedProjectionPoint(analysis) {
  if (analysis.points.some((point) => point.id === state.selectedProjectionPointId)) {
    return state.selectedProjectionPointId;
  }

  const defaultIndex = analysis.scores.reduce((bestIndex, scoreRow, index) => (
    Math.abs(scoreRow[0]) > Math.abs(analysis.scores[bestIndex][0]) ? index : bestIndex
  ), 0);

  state.selectedProjectionPointId = analysis.points[defaultIndex]?.id ?? null;
  return state.selectedProjectionPointId;
}

function renderDatasetSummary(analysis, retention) {
  elements.datasetSummary.innerHTML = `
    <p><strong>Source:</strong> ${escapeHtml(state.source)}</p>
    <p><strong>Dimensionality:</strong> ${analysis.dimension}D</p>
    <p><strong>Points:</strong> ${analysis.points.length}</p>
    <p><strong>Keeping right now:</strong> top ${state.keepCount} / ${analysis.dimension} components (${state.keepCount} new coordinate${state.keepCount === 1 ? "" : "s"} per point)</p>
    <p><strong>Variation kept so far:</strong> ${formatPercent(retention.retainedVarianceRatio)}</p>
  `;
}

function renderOriginalSection(analysis) {
  const dim = analysis.dimension;
  const originalLeadText = "This plot shows the raw dataset before PCA does anything. Start by looking at the overall shape of the data cloud. PCA tries to find the main direction in which that cloud spreads out.";
  elements.originalLead.textContent = dim === 3
    ? `${originalLeadText} If one direction looks stronger than the others, PCA will usually choose it as the first principal component. In 3D, rotate the plot to inspect that trend from different angles.`
    : `${originalLeadText} If one direction looks stronger than the others, PCA will usually choose it as the first principal component.`;

  elements.originalInsight.innerHTML = `
    <p><strong>What to notice:</strong> Is the cloud roughly circular, stretched into a line, or spread out across a plane?</p>
    <p>
      PCA looks for the main trend of the cloud of points. PC1 points along the direction of maximum variance, meaning
      the direction where the cloud is most spread out. The later components describe the remaining directions of
      spread.
    </p>
    ${dim === 3
      ? "<p>Because this is a 3D dataset, rotate the view and check whether the cloud is mostly line-like, plane-like, or fully spread through space. That geometry tells you how many directions matter most.</p>"
      : "<p>In 2D, once PC1 is fixed, PC2 gives the remaining perpendicular direction and captures the smaller leftover variation.</p>"}
    <p><strong>Mean point:</strong> ${formatVector(analysis.mean)}</p>
  `;

  if (dim === 2) {
    render2DOriginalPlot(analysis);
  } else {
    render3DOriginalPlot(analysis);
  }
}

function renderCenteringSection(analysis) {
  elements.centeringSummary.innerHTML = `
    <p><strong>Mean vector:</strong> ${formatVector(analysis.mean)}</p>
    <p>
      Before finding the principal directions, we first center the data so the cloud is centered at the origin. PCA
      should capture the true spread of the cloud, not just where the cloud happens to sit on the graph. If the
      dataset is not centered, the chosen direction can be distorted by location instead of actual variation.
    </p>
  `;

  if (analysis.dimension === 2) {
    render2DCenteringPlot(analysis);
  } else {
    render3DCenteringPlot(analysis);
  }
}

function renderCovarianceSection(analysis) {
  renderCovarianceMatrixHtml(analysis);
  elements.covarianceInsight.innerHTML = buildCovarianceInsightHtml(analysis);
  renderCovarianceHeatmap(analysis);
}

function renderComponentSection(analysis) {
  const selectedComponent = clampComponentIndex(state.selectedComponent, analysis.dimension);
  const laterDirectionText = analysis.dimension === 2
    ? "In 2D, PC2 gives the remaining perpendicular direction and, once PC1 is fixed, it becomes the direction of minimum variance."
    : "Later components capture the remaining variation, with each new direction perpendicular to the earlier ones.";

  elements.componentInsight.innerHTML = `
    <p>
      These arrows show the principal directions found by PCA. PC1 is the direction of maximum variance, meaning it
      follows the strongest spread in the cloud of points.
    </p>
    <p>
      ${laterDirectionText} A larger eigenvalue means that direction explains more of the cloud's spread.
    </p>
    <p>
      Click any eigenvector line or component card to highlight that principal direction and compare its importance.
      This section is only showing the centered data cloud together with the eigenvectors themselves.
    </p>
  `;

  elements.componentCards.innerHTML = analysis.eigenvectors.map((vector, index) => {
    const retained = index < state.keepCount;
    const selected = index === selectedComponent;
    let importanceNote = "This direction explains less of the cloud's spread, so it can be dropped first when we want a reduced-size representation.";
    if (index === 0) {
      importanceNote = "This is the main direction of the cloud, and it matters most because its eigenvalue is the largest.";
    } else if (retained) {
      importanceNote = "This direction is still kept because its eigenvalue is among the largest, so it preserves more of the remaining spread.";
    }

    return `
      <article class="component-card ${retained ? "retained" : "discarded"} ${selected ? "selected" : ""}" data-component-index="${index}">
        <h3>PC${index + 1} ${retained ? "(retained)" : "(discarded)"}${selected ? " (selected)" : ""}</h3>
        <p><strong>Principal direction:</strong> ${formatVector(vector)}</p>
        <p><strong>Eigenvalue:</strong> ${formatNumber(analysis.eigenvalues[index])}</p>
        <p><strong>Explains this much variation:</strong> ${formatPercent(analysis.explainedVariance[index])}</p>
        <p>${importanceNote}</p>
        <p>${selected ? "The plot is currently highlighting this eigenvector in the centered data cloud." : "Click to highlight this eigenvector and compare it with the others."}</p>
      </article>
    `;
  }).join("");

  if (analysis.dimension === 2) {
    render2DComponentPlot(analysis);
  } else {
    render3DComponentPlot(analysis);
  }
}

function renderProjectionSection(analysis, retention) {
  const model = buildProjectionSectionModel(analysis);
  renderProjectionComponentSelector(analysis, model);

  elements.projectionSummary.innerHTML = `
    <p>
      Choose a point in the left plot. The right plot redraws that one point in a simple centered 2D frame where the
      horizontal axis is the currently selected principal direction, <strong>${model.componentLabel}</strong>.
    </p>
    <p>
      ${model.componentIndex === 0
        ? `${model.componentLabel} has the largest eigenvalue <strong>${formatNumber(model.eigenvalue)}</strong> and explains <strong>${formatPercent(model.explainedVariance)}</strong> of the total variation, so PCA keeps it first.`
        : `${model.componentLabel} has eigenvalue <strong>${formatNumber(model.eigenvalue)}</strong> and explains <strong>${formatPercent(model.explainedVariance)}</strong> of the total variation. Its eigenvalue is smaller than PC1's, so PCA ranks it later.`}
      The current keep control retains <strong>${formatPercent(retention.retainedVarianceRatio)}</strong> overall, but
      this section isolates what happens along ${model.componentLabel} for the selected point.
    </p>
  `;

  elements.projectionInsight.innerHTML = buildProjectionInsightHtml(analysis, model);

  if (analysis.dimension === 2) {
    render2DProjectionSourcePlot(analysis, model);
  } else {
    render3DProjectionSourcePlot(analysis, model);
  }

  renderProjectionDetailPlot(analysis, model);
}

function buildProjectionSectionModel(analysis) {
  const selectedPointId = syncSelectedProjectionPoint(analysis);
  const selectedIndex = Math.max(0, analysis.points.findIndex((point) => point.id === selectedPointId));
  const componentIndex = clampComponentIndex(state.selectedProjectionComponent, analysis.dimension);
  const componentLabel = `PC${componentIndex + 1}`;
  const selectedPoint = analysis.points[selectedIndex];
  const selectedCenteredPoint = analysis.centeredPoints[selectedIndex];
  const selectedVector = analysis.eigenvectors[componentIndex];
  const selectedScore = analysis.scores[selectedIndex][componentIndex];
  const projectedCenteredValues = scaleVector(selectedVector, selectedScore);
  const projectedRawValues = addVectors(projectedCenteredValues, analysis.mean);
  const residualVector = subtractVectors(selectedCenteredPoint.values, projectedCenteredValues);
  const residualMagnitude = magnitude(residualVector);
  const offAxisComponentIndex = analysis.dimension === 2 ? (componentIndex === 0 ? 1 : 0) : null;
  const offAxisCoordinate = analysis.dimension === 2 ? analysis.scores[selectedIndex][offAxisComponentIndex] : residualMagnitude;
  const axisExtent = Math.max(...analysis.scores.map((scoreRow) => Math.abs(scoreRow[componentIndex])), Math.abs(selectedScore), 1);
  const offAxisExtent = analysis.dimension === 2
    ? Math.max(...analysis.scores.map((scoreRow) => Math.abs(scoreRow[offAxisComponentIndex])), Math.abs(offAxisCoordinate), 1)
    : Math.max(residualMagnitude * 1.35, axisExtent * 0.2, 1);
  const detailVectors = [
    [-axisExtent, analysis.dimension === 2 ? -offAxisExtent : 0],
    [axisExtent, offAxisExtent],
    [selectedScore, offAxisCoordinate],
    [selectedScore, 0],
    [0, 0]
  ];

  return {
    componentIndex,
    componentLabel,
    componentColor: COMPONENT_COLORS[Math.min(componentIndex, COMPONENT_COLORS.length - 1)],
    eigenvalue: analysis.eigenvalues[componentIndex],
    explainedVariance: analysis.explainedVariance[componentIndex],
    selectedPoint,
    projectedRawPoint: {
      id: selectedPoint.id,
      values: projectedRawValues
    },
    selectedVector,
    selectedScore,
    projectionLength: Math.abs(selectedScore),
    residualMagnitude,
    offAxisCoordinate,
    axisLabel: `Coordinate along ${componentLabel}`,
    offAxisAxisLabel: analysis.dimension === 2
      ? `Coordinate along PC${offAxisComponentIndex + 1}`
      : `Distance away from ${componentLabel}`,
    projectionLengthLabelY: Math.max(offAxisExtent * 0.16, 0.24),
    detailBounds: computeBounds(detailVectors)
  };
}

function buildProjectionInsightHtml(analysis, model) {
  const keepContext = state.keepCount === 1
    ? `If you keep only the top 1 component, PCA stores this point using just its ${model.componentLabel} coordinate when that is the retained direction.`
    : `If you keep the top ${state.keepCount}, PCA stores this point using several principal coordinates. ${model.componentLabel} is one of those coordinates only when it falls within the retained set.`;
  const rankContext = model.componentIndex === 0
    ? `${model.componentLabel} is the most important direction because it has the largest eigenvalue.`
    : `${model.componentLabel} is ranked below PC1 because its eigenvalue is smaller, so projecting onto it preserves less variation overall.`;

  return `
    <p>
      ${analysis.dimension === 3
        ? "Rotate the left plot if needed, then click any point in the cloud."
        : "Click any point in the left plot."}
      The selector above the second plot lets you switch between the different principal directions.
    </p>
    <p><strong>Selected point:</strong> #${model.selectedPoint.id} at ${formatVector(model.selectedPoint.values)}</p>
    <p>
      <strong>How to read the right plot:</strong> the dark point is the selected point after mean centering. The amber
      diamond is its projection onto <strong>${model.componentLabel}</strong>. The dashed drop is the part perpendicular
      to ${model.componentLabel} that is discarded in this one-direction view.
    </p>
    <p><strong>Signed ${model.componentLabel} coordinate:</strong> ${formatNumber(model.selectedScore)}. <strong>Projection length:</strong> ${formatNumber(model.projectionLength)}. <strong>Perpendicular leftover:</strong> ${formatNumber(model.residualMagnitude)}.</p>
    <p><strong>Projected point back in the original axes:</strong> ${formatVector(model.projectedRawPoint.values)}</p>
    <p>${rankContext}</p>
    <p>${keepContext}</p>
  `;
}

function renderProjectionComponentSelector(analysis, model) {
  elements.projectionComponentSelector.innerHTML = analysis.eigenvalues.map((eigenvalue, index) => `
    <button
      type="button"
      class="projection-component-button ${index === model.componentIndex ? "active" : ""}"
      data-projection-component="${index}"
      aria-pressed="${index === model.componentIndex ? "true" : "false"}"
    >
      <strong>PC${index + 1}</strong>
      <span>eigenvalue ${formatNumber(eigenvalue)}</span>
    </button>
  `).join("");
}

function render2DProjectionSourcePlot(analysis, model) {
  const bounds = computeBounds(analysis.points.map((point) => point.values).concat([analysis.mean]));
  const axisLength = bounds.maxRadius * 0.95;
  const data = [
    scatter2DTrace(analysis.points, {
      name: "Original data",
      color: "#56616a",
      hoverLabel: "Original point",
      hovertemplate: "Point #%{customdata}<br>x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>",
      markerSize: 8.5,
      markerOpacity: 0.9,
      markerLineColor: "rgba(255,255,255,0.86)",
      markerLineWidth: 1,
      customdata: analysis.points.map((point) => point.id),
      meta: { projectionSource: true }
    }),
    ...analysis.eigenvectors.map((vector, index) => componentLine2DTrace(vector, axisLength, {
      center: analysis.mean,
      label: `PC${index + 1}`,
      color: index === model.componentIndex
        ? model.componentColor
        : "rgba(154, 167, 178, 0.42)",
      width: index === model.componentIndex ? 6 : 2.6,
      eigenvalue: analysis.eigenvalues[index],
      explainedVariance: analysis.explainedVariance[index],
      componentIndex: index
    })),
    singlePoint2DTrace(analysis.mean, {
      name: "Mean",
      color: "#203648",
      symbol: "diamond",
      hoverLabel: "Mean"
    }),
    singlePoint2DTrace(model.selectedPoint.values, {
      name: "Selected point",
      color: SELECTED_COMPONENT_COLOR,
      hoverLabel: `Selected point #${model.selectedPoint.id}`,
      markerSize: 13,
      markerLineColor: "#ffffff",
      markerLineWidth: 1.8
    })
  ];

  const plot = Plotly.react("projectionSourcePlot", data, build2DLayout(bounds, analysis.labels, {
    titleX: analysis.labels[0],
    titleY: analysis.labels[1]
  }), plotConfig());
  Promise.resolve(plot).then(bindProjectionSourcePlotClick);
}

function render3DProjectionSourcePlot(analysis, model) {
  const bounds = computeBounds(analysis.points.map((point) => point.values).concat([analysis.mean]));
  const axisLength = bounds.maxRadius * 0.95;

  const data = [
    scatter3DTrace(analysis.points, {
      name: "Original data",
      hovertemplate: "Point #%{customdata}<br>x: %{x:.3f}<br>y: %{y:.3f}<br>z: %{z:.3f}<extra></extra>",
      hoverLabel: "Original point",
      color: "#56616a",
      markerSize: 5.8,
      markerOpacity: 0.88,
      markerLineColor: "rgba(255,255,255,0.66)",
      markerLineWidth: 0.8,
      customdata: analysis.points.map((point) => point.id),
      meta: { projectionSource: true }
    }),
    ...analysis.eigenvectors.flatMap((vector, index) => componentLine3DTraces(vector, axisLength, {
      center: analysis.mean,
      label: `PC${index + 1}`,
      color: index === model.componentIndex
        ? model.componentColor
        : "rgba(154, 167, 178, 0.34)",
      width: index === model.componentIndex ? 9 : 3,
      eigenvalue: analysis.eigenvalues[index],
      explainedVariance: analysis.explainedVariance[index],
      componentIndex: index
    })),
    singlePoint3DTrace(analysis.mean, {
      name: "Mean",
      color: "#203648",
      hoverLabel: "Mean"
    }),
    singlePoint3DTrace(model.selectedPoint.values, {
      name: "Selected point",
      color: SELECTED_COMPONENT_COLOR,
      hoverLabel: `Selected point #${model.selectedPoint.id}`,
      markerSize: 7.6,
      markerLineColor: "#ffffff",
      markerLineWidth: 1.1
    })
  ];

  const plot = Plotly.react("projectionSourcePlot", data, build3DLayout(bounds, analysis.labels, {
    uirevision: "projection-source-3d",
    sceneOptions: {
      camera: state.projectionCamera,
      uirevision: "projection-source-3d"
    }
  }), plotConfig(true));
  Promise.resolve(plot).then(bindProjectionSourcePlotClick);
}

function renderProjectionDetailPlot(analysis, model) {
  const data = [
    {
      type: "scatter",
      mode: "lines+text",
      x: model.detailBounds.ranges[0],
      y: [0, 0],
      text: ["", model.componentLabel],
      textposition: "top right",
      line: { color: model.componentColor, width: 4 },
      hovertemplate: `${model.componentLabel}<br>Eigenvalue: ${formatNumber(model.eigenvalue)}<br>Explained variance: ${formatPercent(model.explainedVariance)}<extra></extra>`,
      name: model.componentLabel
    },
    {
      type: "scatter",
      mode: "lines",
      x: [0, model.selectedScore],
      y: [0, 0],
      line: { color: PROJECTION_POINT_COLOR, width: 4 },
      hovertemplate: `Projection length: ${formatNumber(model.projectionLength)}<br>Signed ${model.componentLabel} coordinate: ${formatNumber(model.selectedScore)}<extra></extra>`,
      name: `Projection onto ${model.componentLabel}`
    },
    errorSegments2DTrace(
      [{ values: [model.selectedScore, model.offAxisCoordinate] }],
      [{ values: [model.selectedScore, 0] }],
      colorWithAlpha(SELECTED_COMPONENT_COLOR, 0.42)
    ),
    {
      type: "scatter",
      mode: "text",
      x: [model.selectedScore / 2],
      y: [model.projectionLengthLabelY],
      text: [`Projection length = ${formatNumber(model.projectionLength)}`],
      textfont: { size: 12, color: PROJECTION_POINT_COLOR },
      hoverinfo: "skip",
      name: "Projection length label"
    },
    singlePoint2DTrace([0, 0], {
      name: "Centered mean",
      color: "#203648",
      symbol: "diamond",
      hoverLabel: "Centered mean",
      markerSize: 10
    }),
    singlePoint2DTrace([model.selectedScore, model.offAxisCoordinate], {
      name: "Selected point",
      color: SELECTED_COMPONENT_COLOR,
      hoverLabel: "Selected point in centered frame",
      markerSize: 12,
      markerLineColor: "#ffffff",
      markerLineWidth: 1.4
    }),
    singlePoint2DTrace([model.selectedScore, 0], {
      name: `Projection onto ${model.componentLabel}`,
      color: PROJECTION_POINT_COLOR,
      symbol: "diamond",
      hoverLabel: `Projection onto ${model.componentLabel}`,
      markerSize: 12,
      markerLineColor: "#ffffff",
      markerLineWidth: 1.4
    })
  ];

  const layout = build2DLayout(model.detailBounds, [model.axisLabel, model.offAxisAxisLabel], {
    titleX: model.axisLabel,
    titleY: model.offAxisAxisLabel,
    lockAspect: false
  });
  layout.annotations = [
    {
      text: "Selected point",
      x: model.selectedScore,
      y: model.offAxisCoordinate,
      xref: "x",
      yref: "y",
      showarrow: false,
      yshift: model.offAxisCoordinate >= 0 ? 16 : -16,
      font: { size: 12, color: SELECTED_COMPONENT_COLOR }
    },
    {
      text: "Projection",
      x: model.selectedScore,
      y: 0,
      xref: "x",
      yref: "y",
      showarrow: false,
      yshift: 16,
      font: { size: 12, color: PROJECTION_POINT_COLOR }
    }
  ];

  Plotly.react("projectionDetailPlot", data, layout, plotConfig());
}

function renderVarianceSection(analysis, retention) {
  const keptLabels = analysis.eigenvalues
    .map((_, index) => `PC${index + 1}`)
    .slice(0, state.keepCount)
    .join(", ");

  elements.keepSummary.textContent = `Keeping the top ${state.keepCount} means keeping ${keptLabels}, the direction${state.keepCount === 1 ? "" : "s"} where the projection spread is largest.`;

  elements.topXExplanation.innerHTML = `
    <p>
      PCA keeps the top components by selecting the eigenvectors with the largest eigenvalues. These are the directions
      where the projected points spread out the most. After that, each point is projected onto those directions, and
      the projection values become the point's new coordinates in a reduced-size representation.
    </p>
    <p>
      Right now that means keeping <strong>${keptLabels}</strong>. Together they keep
      <strong>${formatPercent(retention.retainedVarianceRatio)}</strong> of the total variation. So each point is
      described by <strong>${state.keepCount}</strong> new coordinate${state.keepCount === 1 ? "" : "s"} instead of
      <strong>${analysis.dimension}</strong>, while the discarded components account for the remaining
      <strong>${formatPercent(1 - retention.retainedVarianceRatio)}</strong>. In the projection section above, clicking
      one point shows its coordinate along the currently selected principal direction together with the perpendicular
      part that would be removed in that one-direction view.
    </p>
  `;

  renderScreePlot(analysis);
  renderCumulativePlot(analysis, retention);
}

function renderReconstructionSection(analysis, retention) {
  const rmse = Math.sqrt(retention.reconstructionMSE);
  elements.reconstructionMetrics.innerHTML = `
    <p>This section checks how well the reduced-size representation still matches the original dataset. After each point is projected onto the kept components and mapped back, smaller reconstruction error means less information was lost.</p>
    <p><strong>Mean squared reconstruction error:</strong> ${formatNumber(retention.reconstructionMSE)}</p>
    <p><strong>Root mean squared reconstruction error:</strong> ${formatNumber(rmse)}</p>
    <p><strong>Variation kept:</strong> ${formatPercent(retention.retainedVarianceRatio)}</p>
    <p><strong>Variation lost:</strong> ${formatPercent(1 - retention.retainedVarianceRatio)}</p>
  `;

  elements.reconstructionExplanation.innerHTML = `
    <p>
      To understand what was lost, we reconstruct the data from the kept components. If you keep fewer components, the
      reconstruction becomes less exact because each point is being described by fewer new coordinates.
    </p>
    <p>
      ${state.keepCount === analysis.dimension
        ? "Because all components are kept, the new coordinates still contain the full information, so the reconstruction matches the original data up to tiny numerical error."
        : "The dropped components contain the variation that was discarded, so the gap between the original point and the reconstructed point shows the information loss."}
    </p>
  `;

  if (analysis.dimension === 2) {
    render2DReconstructionPlot(analysis, retention);
  } else {
    render3DReconstructionPlot(analysis, retention);
  }
}

function renderProjectNotes() {
  elements.projectNotes.innerHTML = `
    <p>
      This learning lab is designed to help undergraduate students build intuition for PCA by linking the mathematics
      to the shape of a cloud of points. It shows how PCA centers the cloud at the origin, finds directions of maximum
      variance, projects the data onto the retained principal directions, and compresses the data into fewer
      coordinates with some possible information loss.
    </p>
  `;
}

function render2DOriginalPlot(analysis) {
  const rawVectors = analysis.points.map((point) => point.values);
  const bounds = computeBounds(rawVectors.concat([analysis.mean]));
  const axisLength = bounds.maxRadius * 0.35;

  const data = [
    scatter2DTrace(analysis.points, {
      name: "Original data",
      color: "rgba(70, 78, 86, 0.84)",
      hoverLabel: "Original point"
    }),
    singlePoint2DTrace(analysis.mean, {
      name: "Mean",
      color: "#203648",
      symbol: "diamond",
      hoverLabel: "Mean"
    }),
    axisDirection2DTrace(analysis.mean, [1, 0], axisLength, {
      name: `${analysis.labels[0]} direction`,
      color: "rgba(27, 31, 35, 0.18)",
      label: analysis.labels[0]
    }),
    axisDirection2DTrace(analysis.mean, [0, 1], axisLength, {
      name: `${analysis.labels[1]} direction`,
      color: "rgba(27, 31, 35, 0.18)",
      label: analysis.labels[1]
    })
  ];

  Plotly.react("originalPlot", data, build2DLayout(bounds, analysis.labels, {
    titleX: analysis.labels[0],
    titleY: analysis.labels[1]
  }), plotConfig());
}

function render3DOriginalPlot(analysis) {
  const rawVectors = analysis.points.map((point) => point.values);
  const bounds = computeBounds(rawVectors.concat([analysis.mean]));
  const axisLength = bounds.maxRadius * 0.3;

  const data = [
    scatter3DTrace(analysis.points, {
      name: "Original data",
      hoverLabel: "Original point",
      color: "rgba(70, 78, 86, 0.82)"
    }),
    singlePoint3DTrace(analysis.mean, {
      name: "Mean",
      color: "#203648",
      hoverLabel: "Mean"
    }),
    axisDirection3DTrace(analysis.mean, unitVector(analysis.dimension, 0), axisLength, {
      color: "rgba(27, 31, 35, 0.22)",
      label: analysis.labels[0]
    }),
    axisDirection3DTrace(analysis.mean, unitVector(analysis.dimension, 1), axisLength, {
      color: "rgba(27, 31, 35, 0.22)",
      label: analysis.labels[1]
    }),
    axisDirection3DTrace(analysis.mean, unitVector(analysis.dimension, 2), axisLength, {
      color: "rgba(27, 31, 35, 0.22)",
      label: analysis.labels[2]
    })
  ];

  Plotly.react("originalPlot", data, build3DLayout(bounds, analysis.labels), plotConfig(true));
}

function render2DCenteringPlot(analysis) {
  const rawVectors = analysis.points.map((point) => point.values);
  const centeredVectors = analysis.centeredPoints.map((point) => point.values);
  const rawBounds = computeBounds(rawVectors.concat([analysis.mean]));
  const centeredBounds = computeBounds(centeredVectors.concat([Array(analysis.dimension).fill(0)]));

  const data = [
    scatter2DTrace(analysis.points, {
      name: "Raw",
      color: "rgba(70, 78, 86, 0.84)",
      hoverLabel: "Raw point",
      xaxis: "x",
      yaxis: "y"
    }),
    singlePoint2DTrace(analysis.mean, {
      name: "Mean",
      color: "#203648",
      symbol: "diamond",
      hoverLabel: "Mean",
      xaxis: "x",
      yaxis: "y"
    }),
    scatter2DTrace(analysis.centeredPoints, {
      name: "Centered",
      color: "rgba(49, 72, 93, 0.85)",
      hoverLabel: "Centered point",
      xaxis: "x2",
      yaxis: "y2"
    }),
    singlePoint2DTrace([0, 0], {
      name: "Origin",
      color: "#203648",
      symbol: "diamond",
      hoverLabel: "Origin",
      xaxis: "x2",
      yaxis: "y2"
    })
  ];

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.55)",
    margin: { l: 48, r: 24, t: 46, b: 48 },
    showlegend: false,
    grid: { rows: 1, columns: 2, pattern: "independent" },
    xaxis: build2DAxis(`${analysis.labels[0]} (raw)`, rawBounds.ranges[0]),
    yaxis: build2DAxis(`${analysis.labels[1]} (raw)`, rawBounds.ranges[1], "x"),
    xaxis2: build2DAxis(`${analysis.labels[0]} (centered)`, centeredBounds.ranges[0]),
    yaxis2: build2DAxis(`${analysis.labels[1]} (centered)`, centeredBounds.ranges[1], "x2"),
    annotations: [
      subplotTitle("Original cloud position", 0.19),
      subplotTitle("Centered at the origin", 0.81)
    ]
  };

  Plotly.react("centeringPlot", data, layout, plotConfig());
}

function render3DCenteringPlot(analysis) {
  const rawBounds = computeBounds(analysis.points.map((point) => point.values).concat([analysis.mean]));
  const centeredBounds = computeBounds(analysis.centeredPoints.map((point) => point.values).concat([Array(analysis.dimension).fill(0)]));

  const data = [
    scatter3DTrace(analysis.points, {
      name: "Raw",
      color: "rgba(70, 78, 86, 0.82)",
      hoverLabel: "Raw point",
      scene: "scene"
    }),
    singlePoint3DTrace(analysis.mean, {
      name: "Mean",
      color: "#203648",
      hoverLabel: "Mean",
      scene: "scene"
    }),
    scatter3DTrace(analysis.centeredPoints, {
      name: "Centered",
      color: "rgba(49, 72, 93, 0.84)",
      hoverLabel: "Centered point",
      scene: "scene2"
    }),
    singlePoint3DTrace(Array(analysis.dimension).fill(0), {
      name: "Origin",
      color: "#203648",
      hoverLabel: "Origin",
      scene: "scene2"
    })
  ];

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 0, r: 0, t: 48, b: 0 },
    showlegend: false,
    annotations: [
      subplotTitle("Original cloud position", 0.19),
      subplotTitle("Centered at the origin", 0.81)
    ],
    scene: buildSceneConfig(rawBounds, analysis.labels, { x: [0, 0.46], y: [0, 1] }),
    scene2: buildSceneConfig(centeredBounds, analysis.labels.map((label) => `${label} centered`), { x: [0.54, 1], y: [0, 1] })
  };

  Plotly.react("centeringPlot", data, layout, plotConfig(true));
}

function renderCovarianceHeatmap(analysis) {
  const labels = analysis.labels;
  const data = [
    {
      type: "heatmap",
      z: analysis.covariance,
      x: labels,
      y: labels,
      colorscale: [
        [0, "#dfe5e9"],
        [0.5, "#f7f8f9"],
        [1, "#31485d"]
      ],
      reversescale: false,
      showscale: false,
      text: analysis.covariance.map((row) => row.map((value) => formatNumber(value))),
      texttemplate: "%{text}",
      hovertemplate: "%{y} vs %{x}<br>covariance: %{z:.4f}<extra></extra>"
    }
  ];

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.55)",
    margin: { l: 54, r: 20, t: 12, b: 46 },
    xaxis: { tickfont: { color: "#5c6670" }, showgrid: false },
    yaxis: { tickfont: { color: "#5c6670" }, showgrid: false, autorange: "reversed" }
  };

  Plotly.react("covariancePlot", data, layout, plotConfig());
}

function renderCovarianceMatrixHtml(analysis) {
  const columns = `repeat(${analysis.dimension}, minmax(0, 1fr))`;
  const rows = analysis.covariance.map((row) => `
    <div class="matrix-row" style="grid-template-columns: ${columns};">
      ${row.map((value) => `<div class="matrix-cell">${formatNumber(value)}</div>`).join("")}
    </div>
  `).join("");

  elements.covarianceMatrix.innerHTML = rows;
}

function render2DComponentPlot(analysis) {
  const centeredVectors = analysis.centeredPoints.map((point) => point.values);
  const bounds = computeBounds(centeredVectors.concat([Array(analysis.dimension).fill(0)]));
  const axisLength = bounds.maxRadius * 0.9;
  const selectedComponent = clampComponentIndex(state.selectedComponent, analysis.dimension);

  const data = [
    scatter2DTrace(analysis.centeredPoints, {
      name: "Centered data",
      color: "rgba(70, 78, 86, 0.72)",
      hoverLabel: "Centered point"
    }),
    singlePoint2DTrace([0, 0], {
      name: "Origin",
      color: "#203648",
      symbol: "diamond",
      hoverLabel: "Origin",
      markerSize: 10
    }),
    ...analysis.eigenvectors.map((vector, index) => componentLine2DTrace(vector, axisLength, {
      label: `PC${index + 1}`,
      color: index === selectedComponent
        ? SELECTED_COMPONENT_COLOR
        : index < state.keepCount ? COMPONENT_COLORS[index] : "rgba(154, 167, 178, 0.36)",
      width: index === selectedComponent ? 8 : index < state.keepCount ? 4 : 2.5,
      eigenvalue: analysis.eigenvalues[index],
      explainedVariance: analysis.explainedVariance[index],
      componentIndex: index
    }))
  ];

  const plot = Plotly.react("componentPlot", data, build2DLayout(bounds, analysis.labels.map((label) => `${label} centered`), {
    titleX: `${analysis.labels[0]} centered`,
    titleY: `${analysis.labels[1]} centered`
  }), plotConfig());
  Promise.resolve(plot).then(bindComponentPlotClick);
}

function render3DComponentPlot(analysis) {
  const centeredVectors = analysis.centeredPoints.map((point) => point.values);
  const bounds = computeBounds(centeredVectors.concat([Array(analysis.dimension).fill(0)]));
  const axisLength = bounds.maxRadius * 0.9;
  const selectedComponent = clampComponentIndex(state.selectedComponent, analysis.dimension);

  const data = [
    scatter3DTrace(analysis.centeredPoints, {
      name: "Centered data",
      hoverLabel: "Centered point",
      color: "rgba(70, 78, 86, 0.74)"
    }),
    singlePoint3DTrace([0, 0, 0], {
      name: "Origin",
      color: "#203648",
      hoverLabel: "Origin",
      markerSize: 5.5
    }),
    ...analysis.eigenvectors.flatMap((vector, index) => componentLine3DTraces(vector, axisLength, {
      label: `PC${index + 1}`,
      color: index === selectedComponent
        ? SELECTED_COMPONENT_COLOR
        : index < state.keepCount ? COMPONENT_COLORS[index] : "rgba(154, 167, 178, 0.34)",
      width: index === selectedComponent ? 12 : index < state.keepCount ? 6 : 3,
      eigenvalue: analysis.eigenvalues[index],
      explainedVariance: analysis.explainedVariance[index],
      componentIndex: index
    }))
  ];

  const plot = Plotly.react("componentPlot", data, build3DLayout(bounds, analysis.labels.map((label) => `${label} centered`), {
    uirevision: "component-plot-3d",
    sceneOptions: {
      camera: state.componentCamera,
      uirevision: "component-plot-3d"
    }
  }), plotConfig(true));
  Promise.resolve(plot).then(bindComponentPlotClick);
}

function renderScreePlot(analysis) {
  const xLabels = analysis.eigenvalues.map((_, index) => `PC${index + 1}`);
  const colors = analysis.eigenvalues.map((_, index) => (
    index < state.keepCount ? COMPONENT_COLORS[index] : "rgba(154, 167, 178, 0.45)"
  ));

  const data = [
    {
      type: "bar",
      x: xLabels,
      y: analysis.explainedVariance.map((value) => value * 100),
      marker: {
        color: colors,
        line: { color: "rgba(27,31,35,0.08)", width: 1 }
      },
      hovertemplate: "%{x}<br>Explained variance: %{y:.2f}% of total variation<extra></extra>"
    }
  ];

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.55)",
    margin: { l: 54, r: 20, t: 18, b: 48 },
    showlegend: false,
    xaxis: { tickfont: { color: "#5c6670" }, showgrid: false },
    yaxis: { title: "Explained variance (%)", range: [0, 110], gridcolor: "rgba(27,31,35,0.06)" },
    shapes: [
      {
        type: "line",
        x0: state.keepCount - 0.5,
        x1: state.keepCount - 0.5,
        y0: 0,
        y1: 110,
        line: { color: "rgba(32,54,72,0.18)", width: 1.5, dash: "dot" }
      }
    ]
  };

  Plotly.react("screePlot", data, layout, plotConfig());
}

function renderCumulativePlot(analysis, retention) {
  const xLabels = analysis.eigenvalues.map((_, index) => `PC${index + 1}`);
  const markerColors = analysis.cumulativeVariance.map((_, index) => (
    index < state.keepCount ? COMPONENT_COLORS[Math.min(index, COMPONENT_COLORS.length - 1)] : "rgba(154, 167, 178, 0.46)"
  ));

  const data = [
    {
      type: "scatter",
      mode: "lines+markers",
      x: xLabels,
      y: analysis.cumulativeVariance.map((value) => value * 100),
      line: { color: "#203648", width: 2.5 },
      marker: { size: 9, color: markerColors },
      hovertemplate: "%{x}<br>Cumulative explained variance kept: %{y:.2f}%<extra></extra>"
    }
  ];

  const retainedPercent = retention.retainedVarianceRatio * 100;
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.55)",
    margin: { l: 54, r: 20, t: 18, b: 48 },
    showlegend: false,
    xaxis: { tickfont: { color: "#5c6670" }, showgrid: false },
    yaxis: { title: "Cumulative variance (%)", range: [0, 110], gridcolor: "rgba(27,31,35,0.06)" },
    shapes: [
      {
        type: "line",
        x0: -0.3,
        x1: state.keepCount - 1,
        y0: retainedPercent,
        y1: retainedPercent,
        line: { color: "rgba(32,54,72,0.18)", width: 1.5, dash: "dot" }
      }
    ]
  };

  Plotly.react("cumulativePlot", data, layout, plotConfig());
}

function render2DReconstructionPlot(analysis, retention) {
  const rawBounds = computeBounds(analysis.points.map((point) => point.values).concat(retention.reconstructedRaw.map((point) => point.values)));

  const originalData = [
    scatter2DTrace(analysis.points, {
      name: "Original data",
      color: "rgba(70, 78, 86, 0.84)",
      hoverLabel: "Original point"
    }),
    singlePoint2DTrace(analysis.mean, {
      name: "Mean",
      color: "#203648",
      symbol: "diamond",
      hoverLabel: "Mean"
    })
  ];

  const reconstructedData = [
    errorSegments2DTrace(analysis.points, retention.reconstructedRaw, "rgba(120, 132, 141, 0.38)"),
    scatter2DTrace(analysis.points, {
      name: "Original data",
      color: "rgba(120, 132, 141, 0.52)",
      hoverLabel: "Original point"
    }),
    scatter2DTrace(retention.reconstructedRaw, {
      name: "Reconstructed data",
      color: "#203648",
      hoverLabel: "Reconstructed point"
    })
  ];

  const originalLayout = build2DLayout(rawBounds, analysis.labels, {
    titleX: analysis.labels[0],
    titleY: analysis.labels[1]
  });
  const reconstructedLayout = build2DLayout(rawBounds, analysis.labels, {
    titleX: analysis.labels[0],
    titleY: analysis.labels[1]
  });

  Plotly.react("reconstructionOriginalPlot", originalData, originalLayout, plotConfig());
  Plotly.react("reconstructionPlot", reconstructedData, reconstructedLayout, plotConfig());
}

function render3DReconstructionPlot(analysis, retention) {
  const rawBounds = computeBounds(analysis.points.map((point) => point.values).concat(retention.reconstructedRaw.map((point) => point.values)));

  const axisLength = rawBounds.maxRadius * 0.3;
  const originalData = [
    scatter3DTrace(analysis.points, {
      name: "Original data",
      hoverLabel: "Original point",
      color: "rgba(70, 78, 86, 0.82)"
    }),
    singlePoint3DTrace(analysis.mean, {
      name: "Mean",
      color: "#203648",
      hoverLabel: "Mean"
    }),
    axisDirection3DTrace(analysis.mean, unitVector(analysis.dimension, 0), axisLength, {
      color: "rgba(27, 31, 35, 0.22)",
      label: analysis.labels[0]
    }),
    axisDirection3DTrace(analysis.mean, unitVector(analysis.dimension, 1), axisLength, {
      color: "rgba(27, 31, 35, 0.22)",
      label: analysis.labels[1]
    }),
    axisDirection3DTrace(analysis.mean, unitVector(analysis.dimension, 2), axisLength, {
      color: "rgba(27, 31, 35, 0.22)",
      label: analysis.labels[2]
    })
  ];

  const reconstructedData = [
    errorSegments3DTrace(analysis.points, retention.reconstructedRaw, "rgba(120, 132, 141, 0.24)"),
    scatter3DTrace(analysis.points, {
      name: "Original data",
      color: "rgba(120, 132, 141, 0.46)",
      hoverLabel: "Original point"
    }),
    scatter3DTrace(retention.reconstructedRaw, {
      name: "Reconstructed data",
      hoverLabel: "Reconstructed point",
      color: "#203648"
    })
  ];

  const originalLayout = build3DLayout(rawBounds, analysis.labels);
  const reconstructedLayout = build3DLayout(rawBounds, analysis.labels);

  Plotly.react("reconstructionOriginalPlot", originalData, originalLayout, plotConfig(true));
  Plotly.react("reconstructionPlot", reconstructedData, reconstructedLayout, plotConfig(true));
}

function buildCovarianceInsightHtml(analysis) {
  const pairLines = [];
  for (let i = 0; i < analysis.dimension; i += 1) {
    for (let j = i + 1; j < analysis.dimension; j += 1) {
      const covariance = analysis.covariance[i][j];
      pairLines.push(`<p><strong>${analysis.labels[i]}-${analysis.labels[j]}:</strong> ${covarianceDescription(covariance)}</p>`);
    }
  }

  const varianceLines = analysis.labels.map((label, index) => `
    <p><strong>Variance of ${label}:</strong> ${formatNumber(analysis.covariance[index][index])}</p>
  `).join("");

  return `
    <p>
      The covariance matrix summarizes how the centered variables vary together. The diagonal entries tell us how much
      each variable spreads on its own. The off-diagonal entries tell us whether pairs of variables tend to move
      together, move in opposite directions, or have only a weak linear relationship.
    </p>
    ${varianceLines}
    ${pairLines.join("")}
  `;
}

function covarianceDescription(value) {
  if (value > 0.08) {
    return `positive (${formatNumber(value)}), so these centered variables tend to increase together.`;
  }
  if (value < -0.08) {
    return `negative (${formatNumber(value)}), so when one tends to go up, the other tends to go down.`;
  }
  return `near zero (${formatNumber(value)}), so they have only a weak linear relationship.`;
}

function analyzeDataset(points, labels) {
  const dimension = labels.length;
  const values = points.map((point) => point.values);
  const mean = computeMeanVector(values, dimension);
  const centeredPoints = points.map((point) => ({
    id: point.id,
    values: subtractVectors(point.values, mean)
  }));
  const covariance = computeCovarianceMatrix(centeredPoints.map((point) => point.values));
  const decomposition = jacobiEigenDecomposition(covariance);
  const totalVariance = decomposition.eigenvalues.reduce((sum, value) => sum + value, 0);
  const explainedVariance = decomposition.eigenvalues.map((value, index) => (
    totalVariance > 1e-12 ? value / totalVariance : index === 0 ? 1 : 0
  ));
  const cumulativeVariance = runningSum(explainedVariance);
  const scores = centeredPoints.map((point) => (
    decomposition.eigenvectors.map((vector) => dot(point.values, vector))
  ));

  return {
    dimension,
    labels,
    points,
    mean,
    centeredPoints,
    covariance,
    eigenvalues: decomposition.eigenvalues,
    eigenvectors: decomposition.eigenvectors,
    explainedVariance,
    cumulativeVariance,
    scores
  };
}

function computeRetentionResult(analysis, keepCount) {
  const retainedVectors = analysis.eigenvectors.slice(0, keepCount);
  const projectedCentered = analysis.scores.map((scoreRow, index) => {
    const reconstructed = Array(analysis.dimension).fill(0);
    for (let componentIndex = 0; componentIndex < keepCount; componentIndex += 1) {
      const contribution = scaleVector(retainedVectors[componentIndex], scoreRow[componentIndex]);
      for (let dimIndex = 0; dimIndex < analysis.dimension; dimIndex += 1) {
        reconstructed[dimIndex] += contribution[dimIndex];
      }
    }
    return {
      id: analysis.centeredPoints[index].id,
      values: reconstructed
    };
  });

  const reconstructedRaw = projectedCentered.map((point) => ({
    id: point.id,
    values: addVectors(point.values, analysis.mean)
  }));

  const reconstructionMSE = average(
    analysis.centeredPoints.map((point, index) => squaredDistance(point.values, projectedCentered[index].values))
  );

  return {
    projectedCentered,
    reconstructedRaw,
    reconstructionMSE,
    retainedVarianceRatio: analysis.cumulativeVariance[keepCount - 1]
  };
}

function computeMeanVector(vectors, dimension) {
  const mean = Array(dimension).fill(0);
  vectors.forEach((vector) => {
    for (let index = 0; index < dimension; index += 1) {
      mean[index] += vector[index];
    }
  });
  return mean.map((value) => value / vectors.length);
}

function computeCovarianceMatrix(vectors) {
  const dimension = vectors[0].length;
  const matrix = Array.from({ length: dimension }, () => Array(dimension).fill(0));
  const denominator = Math.max(vectors.length - 1, 1);

  vectors.forEach((vector) => {
    for (let i = 0; i < dimension; i += 1) {
      for (let j = i; j < dimension; j += 1) {
        matrix[i][j] += vector[i] * vector[j];
      }
    }
  });

  for (let i = 0; i < dimension; i += 1) {
    for (let j = i; j < dimension; j += 1) {
      matrix[i][j] /= denominator;
      matrix[j][i] = matrix[i][j];
    }
  }

  return matrix;
}

function jacobiEigenDecomposition(matrix) {
  const dimension = matrix.length;
  const a = matrix.map((row) => row.slice());
  const v = identityMatrix(dimension);
  const maxIterations = 80 * dimension * dimension;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let p = 0;
    let q = 1;
    let maxValue = 0;

    for (let i = 0; i < dimension; i += 1) {
      for (let j = i + 1; j < dimension; j += 1) {
        const value = Math.abs(a[i][j]);
        if (value > maxValue) {
          maxValue = value;
          p = i;
          q = j;
        }
      }
    }

    if (maxValue < 1e-10) {
      break;
    }

    const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const app = cos * cos * a[p][p] - 2 * sin * cos * a[p][q] + sin * sin * a[q][q];
    const aqq = sin * sin * a[p][p] + 2 * sin * cos * a[p][q] + cos * cos * a[q][q];

    for (let i = 0; i < dimension; i += 1) {
      if (i !== p && i !== q) {
        const aip = a[i][p];
        const aiq = a[i][q];
        a[i][p] = cos * aip - sin * aiq;
        a[p][i] = a[i][p];
        a[i][q] = sin * aip + cos * aiq;
        a[q][i] = a[i][q];
      }
    }

    a[p][p] = app;
    a[q][q] = aqq;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let i = 0; i < dimension; i += 1) {
      const vip = v[i][p];
      const viq = v[i][q];
      v[i][p] = cos * vip - sin * viq;
      v[i][q] = sin * vip + cos * viq;
    }
  }

  const pairs = Array.from({ length: dimension }, (_, index) => ({
    value: Math.max(0, a[index][index]),
    vector: orientVector(normalizeVector(v.map((row) => row[index])))
  })).sort((left, right) => right.value - left.value);

  return {
    eigenvalues: pairs.map((pair) => pair.value),
    eigenvectors: pairs.map((pair) => pair.vector)
  };
}

function identityMatrix(size) {
  return Array.from({ length: size }, (_, row) => (
    Array.from({ length: size }, (_, column) => row === column ? 1 : 0)
  ));
}

function generateSyntheticDataset(dimension, pointCount, spread, correlation, noise) {
  const safeCorrelation = clamp(correlation, -0.85, 0.95);
  const labels = AXIS_LABELS.slice(0, dimension);
  const mean = dimension === 2 ? [4.3, 2.4] : [4.2, 2.5, 3.1];
  const rotation = dimension === 2
    ? rotation2D(0.52)
    : multiplyMatrices(rotationZ(0.55), multiplyMatrices(rotationY(-0.38), rotationX(0.42)));
  const points = [];

  for (let index = 0; index < pointCount; index += 1) {
    const z1 = randomNormal();
    const z2 = randomNormal();
    const z3 = randomNormal();

    let latent;
    if (dimension === 2) {
      const minorScale = spread * (0.25 + 0.48 * (1 - Math.abs(safeCorrelation)));
      latent = [
        spread * z1,
        minorScale * (safeCorrelation * z1 + Math.sqrt(Math.max(0.05, 1 - safeCorrelation * safeCorrelation)) * z2)
      ];
    } else if (dimension === 3) {
      const midScale = spread * 0.58;
      const lowScale = spread * 0.22;
      const alpha = 0.58 * safeCorrelation;
      const beta = 0.34 * safeCorrelation;
      const gamma = Math.sqrt(Math.max(0.18, 1 - alpha * alpha - beta * beta));
      latent = [
        spread * z1,
        midScale * (safeCorrelation * z1 + Math.sqrt(Math.max(0.05, 1 - safeCorrelation * safeCorrelation)) * z2),
        lowScale * (alpha * z1 + beta * z2 + gamma * z3)
      ];
    }

    const rotated = multiplyMatrixVector(rotation, latent);
    const noisy = rotated.map((value) => value + noise * randomNormal());
    const shifted = noisy.map((value, dimIndex) => value + mean[dimIndex]);

    points.push({
      id: index + 1,
      values: shifted
    });
  }

  return { points, labels };
}

function parseCsvText(csvText) {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error("The CSV must contain at least two rows.");
  }

  const rows = lines.map((line) => line.split(",").map((cell) => cell.trim()));
  const firstRowNumeric = rows[0].every((cell) => Number.isFinite(Number.parseFloat(cell)));
  const headerOffset = firstRowNumeric ? 0 : 1;
  const labels = headerOffset === 1 ? rows[0] : AXIS_LABELS.slice(0, rows[headerOffset].length);
  const dimension = rows[headerOffset].length;

  if (dimension !== 2 && dimension !== 3) {
    throw new Error("This app accepts CSV files with exactly 2 or 3 numeric columns.");
  }

  const points = rows.slice(headerOffset).map((row, index) => {
    if (row.length < dimension) {
      return null;
    }
    const values = row.slice(0, dimension).map((cell) => Number.parseFloat(cell));
    if (values.some((value) => !Number.isFinite(value))) {
      return null;
    }
    return { id: index + 1, values };
  }).filter(Boolean);

  if (points.length < 2) {
    throw new Error("The CSV did not contain enough valid numeric rows.");
  }

  return {
    points,
    labels: labels.slice(0, dimension)
  };
}

function scatter2DTrace(points, options = {}) {
  const coords = points.map((point) => point.values);
  return {
    type: "scatter",
    mode: "markers",
    x: coords.map((vector) => vector[0]),
    y: coords.map((vector) => vector[1]),
    marker: {
      size: options.markerSize || 8,
      color: options.color,
      symbol: options.symbol || "circle",
      opacity: options.markerOpacity,
      line: {
        color: options.markerLineColor || "rgba(255,255,255,0.78)",
        width: options.markerLineWidth ?? 0.8
      }
    },
    hovertemplate: options.hovertemplate || `${options.hoverLabel || "Point"}<br>x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>`,
    customdata: options.customdata,
    xaxis: options.xaxis,
    yaxis: options.yaxis,
    name: options.name,
    meta: options.meta
  };
}

function singlePoint2DTrace(vector, options = {}) {
  return {
    type: "scatter",
    mode: "markers",
    x: [vector[0]],
    y: [vector[1]],
    marker: {
      size: options.markerSize || 12,
      color: options.color,
      symbol: options.symbol || "circle",
      line: {
        color: options.markerLineColor || "rgba(255,255,255,0.82)",
        width: options.markerLineWidth ?? 0.8
      }
    },
    hovertemplate: options.hovertemplate || `${options.hoverLabel || "Point"}<br>x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>`,
    customdata: options.customdata,
    xaxis: options.xaxis,
    yaxis: options.yaxis,
    name: options.name,
    meta: options.meta
  };
}

function axisDirection2DTrace(center, direction, magnitude, options = {}) {
  return {
    type: "scatter",
    mode: "lines+text",
    x: [center[0] - direction[0] * magnitude, center[0] + direction[0] * magnitude],
    y: [center[1] - direction[1] * magnitude, center[1] + direction[1] * magnitude],
    text: ["", options.label || ""],
    textposition: "top right",
    line: { color: options.color, width: 2, dash: "dash" },
    hovertemplate: `${options.name || "Axis"}<extra></extra>`,
    name: options.name
  };
}

function componentLine2DTrace(vector, magnitude, options = {}) {
  const center = options.center || [0, 0];
  return {
    type: "scatter",
    mode: "lines+markers+text",
    x: [center[0] - vector[0] * magnitude, center[0] + vector[0] * magnitude],
    y: [center[1] - vector[1] * magnitude, center[1] + vector[1] * magnitude],
    text: ["", options.label || ""],
    textposition: "top right",
    marker: { size: 6, color: options.color },
    line: { color: options.color, width: options.width || 3 },
    hovertemplate: `${options.label}<br>Principal direction: ${formatVector(vector)}<br>Eigenvalue: ${formatNumber(options.eigenvalue)}<br>Explained variance: ${formatPercent(options.explainedVariance)}<extra></extra>`,
    name: options.label,
    meta: { componentIndex: options.componentIndex }
  };
}

function errorSegments2DTrace(pointsA, pointsB, color) {
  const x = [];
  const y = [];

  for (let index = 0; index < pointsA.length; index += 1) {
    x.push(pointsA[index].values[0], pointsB[index].values[0], null);
    y.push(pointsA[index].values[1], pointsB[index].values[1], null);
  }

  return {
    type: "scatter",
    mode: "lines",
    x,
    y,
    line: { color, width: 1.2, dash: "dot" },
    hoverinfo: "skip",
    name: "Error"
  };
}

function scatter3DTrace(points, options = {}) {
  const coords = points.map((point) => point.values);
  return {
    type: "scatter3d",
    mode: "markers",
    x: coords.map((vector) => vector[0]),
    y: coords.map((vector) => vector[1]),
    z: coords.map((vector) => vector[2]),
    marker: {
      size: options.markerSize || 4.5,
      color: options.color,
      symbol: options.symbol,
      opacity: options.markerOpacity,
      line: {
        color: options.markerLineColor || "rgba(255,255,255,0.4)",
        width: options.markerLineWidth ?? 0.5
      }
    },
    hovertemplate: options.hovertemplate || `${options.hoverLabel || "Point"}<br>x: %{x:.3f}<br>y: %{y:.3f}<br>z: %{z:.3f}<extra></extra>`,
    customdata: options.customdata,
    scene: options.scene,
    name: options.name,
    meta: options.meta
  };
}

function singlePoint3DTrace(vector, options = {}) {
  return {
    type: "scatter3d",
    mode: "markers",
    x: [vector[0]],
    y: [vector[1]],
    z: [vector[2]],
    marker: {
      size: options.markerSize || 6,
      color: options.color,
      line: {
        color: options.markerLineColor || "rgba(255,255,255,0.72)",
        width: options.markerLineWidth ?? 0.6
      }
    },
    hovertemplate: options.hovertemplate || `${options.hoverLabel || "Point"}<br>x: %{x:.3f}<br>y: %{y:.3f}<br>z: %{z:.3f}<extra></extra>`,
    customdata: options.customdata,
    scene: options.scene,
    name: options.name,
    meta: options.meta
  };
}

function axisDirection3DTrace(center, direction, magnitude, options = {}) {
  return {
    type: "scatter3d",
    mode: "lines+text",
    x: [center[0] - direction[0] * magnitude, center[0] + direction[0] * magnitude],
    y: [center[1] - direction[1] * magnitude, center[1] + direction[1] * magnitude],
    z: [center[2] - direction[2] * magnitude, center[2] + direction[2] * magnitude],
    text: ["", options.label || ""],
    textposition: "top center",
    line: { color: options.color, width: 4 },
    hovertemplate: `${options.label || "Axis"}<extra></extra>`,
    name: options.label
  };
}

function componentLine3DTraces(vector, magnitude, options = {}) {
  const center = options.center || [0, 0, 0];
  const lineTrace = {
    type: "scatter3d",
    mode: "lines",
    x: [center[0] - vector[0] * magnitude, center[0] + vector[0] * magnitude],
    y: [center[1] - vector[1] * magnitude, center[1] + vector[1] * magnitude],
    z: [center[2] - vector[2] * magnitude, center[2] + vector[2] * magnitude],
    line: { color: options.color, width: options.width || 5 },
    hovertemplate: `${options.label}<br>Principal direction: ${formatVector(vector)}<br>Eigenvalue: ${formatNumber(options.eigenvalue)}<br>Explained variance: ${formatPercent(options.explainedVariance)}<extra></extra>`,
    name: options.label,
    meta: { componentIndex: options.componentIndex }
  };

  const labelTrace = {
    type: "scatter3d",
    mode: "markers+text",
    x: [center[0] + vector[0] * magnitude],
    y: [center[1] + vector[1] * magnitude],
    z: [center[2] + vector[2] * magnitude],
    text: [options.label],
    textposition: "top center",
    marker: { size: 4.5, color: options.color },
    hovertemplate: `${options.label}<extra></extra>`,
    name: options.label,
    meta: { componentIndex: options.componentIndex }
  };

  return [lineTrace, labelTrace];
}

function errorSegments3DTrace(pointsA, pointsB, color) {
  const x = [];
  const y = [];
  const z = [];

  for (let index = 0; index < pointsA.length; index += 1) {
    x.push(pointsA[index].values[0], pointsB[index].values[0], null);
    y.push(pointsA[index].values[1], pointsB[index].values[1], null);
    z.push(pointsA[index].values[2], pointsB[index].values[2], null);
  }

  return {
    type: "scatter3d",
    mode: "lines",
    x,
    y,
    z,
    line: { color, width: 2 },
    hoverinfo: "skip",
    name: "Error"
  };
}

function build2DLayout(bounds, labels, options = {}) {
  const lockAspect = options.lockAspect !== false;
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.55)",
    margin: { l: 56, r: 24, t: 16, b: 52 },
    showlegend: false,
    hovermode: "closest",
    xaxis: build2DAxis(options.titleX || labels[0], bounds.ranges[0]),
    yaxis: build2DAxis(options.titleY || labels[1], bounds.ranges[1], lockAspect ? "x" : undefined)
  };
}

function build2DAxis(title, range, scaleanchor) {
  const axis = {
    title,
    range,
    gridcolor: "rgba(27,31,35,0.06)",
    zeroline: false,
    tickfont: { color: "#5c6670" }
  };
  if (scaleanchor) {
    axis.scaleanchor = scaleanchor;
    axis.scaleratio = 1;
  }
  return axis;
}

function build3DLayout(bounds, labels, options = {}) {
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 0, r: 0, t: 12, b: 0 },
    showlegend: false,
    ...(options.uirevision ? { uirevision: options.uirevision } : {}),
    scene: buildSceneConfig(bounds, labels, options.domain, options.sceneOptions)
  };
}

function buildSceneConfig(bounds, labels, domain, options = {}) {
  return {
    ...(domain ? { domain } : {}),
    bgcolor: "rgba(255,255,255,0.55)",
    aspectmode: "data",
    dragmode: "orbit",
    ...(options.uirevision ? { uirevision: options.uirevision } : {}),
    camera: options.camera || {
      eye: { x: 1.45, y: 1.35, z: 0.95 }
    },
    xaxis: {
      title: labels[0],
      range: bounds.ranges[0],
      backgroundcolor: "rgba(255,255,255,0.4)",
      gridcolor: "rgba(27,31,35,0.06)",
      zerolinecolor: "rgba(27,31,35,0.12)"
    },
    yaxis: {
      title: labels[1],
      range: bounds.ranges[1],
      backgroundcolor: "rgba(255,255,255,0.4)",
      gridcolor: "rgba(27,31,35,0.06)",
      zerolinecolor: "rgba(27,31,35,0.12)"
    },
    zaxis: {
      title: labels[2],
      range: bounds.ranges[2],
      backgroundcolor: "rgba(255,255,255,0.4)",
      gridcolor: "rgba(27,31,35,0.06)",
      zerolinecolor: "rgba(27,31,35,0.12)"
    }
  };
}

function subplotTitle(text, xPosition) {
  return {
    text,
    x: xPosition,
    y: 1.08,
    xref: "paper",
    yref: "paper",
    showarrow: false,
    font: { size: 12, color: "#5c6670" }
  };
}

function plotConfig(is3D = false) {
  return {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: is3D ? [] : ["lasso2d", "select2d", "autoScale2d"]
  };
}

function computeBounds(vectors) {
  const dimension = vectors[0].length;
  const mins = Array(dimension).fill(Infinity);
  const maxs = Array(dimension).fill(-Infinity);

  vectors.forEach((vector) => {
    for (let index = 0; index < dimension; index += 1) {
      mins[index] = Math.min(mins[index], vector[index]);
      maxs[index] = Math.max(maxs[index], vector[index]);
    }
  });

  const ranges = mins.map((minValue, index) => {
    const span = maxs[index] - minValue;
    const padding = Math.max(span * 0.18, 0.9);
    return [minValue - padding, maxs[index] + padding];
  });

  const maxRadius = Math.max(...vectors.map((vector) => magnitude(vector)), 1);
  return { ranges, maxRadius };
}

function runningSum(values) {
  const output = [];
  values.reduce((sum, value) => {
    const next = sum + value;
    output.push(next);
    return next;
  }, 0);
  return output;
}

function multiplyMatrices(a, b) {
  return a.map((row) => b[0].map((_, columnIndex) => (
    row.reduce((sum, value, rowIndex) => sum + value * b[rowIndex][columnIndex], 0)
  )));
}

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => dot(row, vector));
}

function rotation2D(angle) {
  return [
    [Math.cos(angle), -Math.sin(angle)],
    [Math.sin(angle), Math.cos(angle)]
  ];
}

function rotationX(angle) {
  return [
    [1, 0, 0],
    [0, Math.cos(angle), -Math.sin(angle)],
    [0, Math.sin(angle), Math.cos(angle)]
  ];
}

function rotationY(angle) {
  return [
    [Math.cos(angle), 0, Math.sin(angle)],
    [0, 1, 0],
    [-Math.sin(angle), 0, Math.cos(angle)]
  ];
}

function rotationZ(angle) {
  return [
    [Math.cos(angle), -Math.sin(angle), 0],
    [Math.sin(angle), Math.cos(angle), 0],
    [0, 0, 1]
  ];
}

function randomNormal() {
  let u = 0;
  let v = 0;

  while (u === 0) {
    u = Math.random();
  }
  while (v === 0) {
    v = Math.random();
  }

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function unitVector(dimension, index) {
  return Array.from({ length: dimension }, (_, i) => i === index ? 1 : 0);
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function addVectors(a, b) {
  return a.map((value, index) => value + b[index]);
}

function subtractVectors(a, b) {
  return a.map((value, index) => value - b[index]);
}

function scaleVector(vector, scalar) {
  return vector.map((value) => value * scalar);
}

function magnitude(vector) {
  return Math.sqrt(dot(vector, vector));
}

function normalizeVector(vector) {
  const norm = magnitude(vector);
  if (norm < 1e-12) {
    return unitVector(vector.length, 0);
  }
  return vector.map((value) => value / norm);
}

function orientVector(vector) {
  const firstMeaningful = vector.find((value) => Math.abs(value) > 1e-10);
  if (typeof firstMeaningful === "number" && firstMeaningful < 0) {
    return scaleVector(vector, -1);
  }
  return vector;
}

function squaredDistance(a, b) {
  return a.reduce((sum, value, index) => {
    const difference = value - b[index];
    return sum + difference * difference;
  }, 0);
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampKeepCount(value, dimension) {
  const safeValue = Number.isFinite(value) ? Math.round(value) : 1;
  return clamp(safeValue, 1, dimension);
}

function clampComponentIndex(value, dimension) {
  const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
  return clamp(safeValue, 0, Math.max(0, dimension - 1));
}

function focusToSectionId(focus) {
  return {
    original: "sectionOriginal",
    centering: "sectionCentering",
    covariance: "sectionCovariance",
    components: "sectionComponents",
    projection: "sectionProjection",
    variance: "sectionVariance",
    reconstruction: "sectionReconstruction"
  }[focus] || "sectionOriginal";
}

function formatNumber(value) {
  return Number(value).toFixed(3);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatVector(vector) {
  return `[${vector.map((value) => formatNumber(value)).join(", ")}]`;
}

function colorWithAlpha(color, alpha) {
  if (!color.startsWith("#") || (color.length !== 7 && color.length !== 4)) {
    return color;
  }

  const expanded = color.length === 4
    ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    : color;
  const red = Number.parseInt(expanded.slice(1, 3), 16);
  const green = Number.parseInt(expanded.slice(3, 5), 16);
  const blue = Number.parseInt(expanded.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function downloadDatasetCsv() {
  const header = state.labels.join(",");
  const rows = state.points.map((point) => point.values.join(","));
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pca_learning_lab_dataset.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
