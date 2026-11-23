import rounds from "./data/dax-rounds.json";

const roundCount = 5;
const roundLabel = document.querySelector("#dax-round");
const question = document.querySelector("#dax-question");
const distribution = document.querySelector("#dax-distribution");
const playerCurve = document.querySelector("#dax-player-curve");
const benchmarkCurve = document.querySelector("#dax-benchmark-curve");
const outcomeLine = document.querySelector("#dax-outcome-line");
const outcomeKey = document.querySelector("#dax-outcome-key");
const history = document.querySelector("#dax-history");
const historyScale = document.querySelector("#dax-history-scale");
const bars = [...history.querySelectorAll("rect")];
const form = document.querySelector("#dax-forecast-form");
const fieldset = document.querySelector("#dax-inputs");
const sliders = [...fieldset.querySelectorAll("input")];
const outputs = [...fieldset.querySelectorAll("output")];
const submit = document.querySelector("#dax-submit");
const next = document.querySelector("#dax-next");
const result = document.querySelector("#dax-result");
const resultHeading = document.querySelector("#dax-result-heading");
const resultOutcome = document.querySelector("#dax-result-outcome");
const playerScore = document.querySelector("#dax-player-score");
const benchmarkScore = document.querySelector("#dax-benchmark-score");
const sessionScore = document.querySelector("#dax-session-score");
const heading = form.closest(".forecast-game").querySelector(".figure-heading");

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" });
const probabilities = sliders.map((slider) => Number(slider.dataset.probability));
const { left, right, top, bottom } = JSON.parse(distribution.dataset.plot);
const minimum = Number(sliders[0].min);
const maximum = Number(sliders[0].max);
let selectedRounds;
let roundIndex;
let playerTotal;
let benchmarkTotal;

function xPosition(value) {
  return left + (value - minimum) / (maximum - minimum) * (right - left);
}

function drawDistribution(line, quantiles) {
  const values = [minimum, ...quantiles, maximum];
  const levels = [0, ...probabilities, 1];
  const points = values.map((value, index) => [
    xPosition(value),
    bottom - levels[index] * (bottom - top)
  ].join(","));
  line.setAttribute("points", points.join(" "));
}

function formatPercent(value) {
  return (value > 0 ? "+" : "") + value.toFixed(2) + "%";
}

function readForecast() {
  return sliders.map((slider) => Number(slider.value));
}

function updateForecast() {
  const forecast = readForecast();
  drawDistribution(playerCurve, forecast);
  forecast.forEach((value, index) => {
    const label = formatPercent(value);
    outputs[index].value = label;
    sliders[index].setAttribute("aria-valuetext", label);
  });
}

function drawHistory(recentReturns) {
  const scale = Math.ceil(Math.max(0.5, ...recentReturns.map(Math.abs)) * 2) / 2;
  historyScale.textContent = "Scale ±" + scale + "%";
  history.setAttribute("aria-label", "Recent DAX returns, oldest first: " + recentReturns.map(formatPercent).join(", "));
  recentReturns.forEach((value, index) => {
    const height = 22 * Math.abs(value) / scale;
    bars[index].setAttribute("y", value > 0 ? 24 - height : 24);
    bars[index].setAttribute("height", height);
    bars[index].toggleAttribute("data-negative", value < 0);
  });
}

function startRound() {
  const round = selectedRounds[roundIndex];
  roundLabel.textContent = "Round " + (roundIndex + 1) + " of " + roundCount;
  question.textContent = `What do you think the DAX return was on ${dateFormat.format(new Date(round.date))}?`;
  sliders.forEach((slider, index) => {
    slider.value = round.benchmark[index];
  });
  drawDistribution(benchmarkCurve, round.benchmark);
  drawHistory(round.recentReturns);
  outcomeLine.setAttribute("visibility", "hidden");
  outcomeKey.hidden = true;
  distribution.setAttribute("aria-label", "Benchmark and your forecast as cumulative probabilities");
  fieldset.disabled = false;
  submit.hidden = false;
  result.hidden = true;
  sessionScore.hidden = true;
  updateForecast();
}

function startGame() {
  const remaining = [...rounds];
  selectedRounds = Array.from({ length: roundCount }, () => {
    const index = Math.floor(Math.random() * remaining.length);
    return remaining.splice(index, 1)[0];
  }).sort((first, second) => first.date.localeCompare(second.date));
  roundIndex = 0;
  playerTotal = 0;
  benchmarkTotal = 0;
  startRound();
}

function meanQuantileScore(quantiles, realized) {
  const loss = quantiles.reduce((sum, quantile, index) => {
    const error = realized - quantile;
    const weight = error < 0 ? 1 - probabilities[index] : probabilities[index];
    return sum + 2 * weight * Math.abs(error);
  }, 0);
  return loss / quantiles.length;
}

sliders.forEach((slider, index) => {
  slider.addEventListener("input", () => {
    const forecast = readForecast();
    const lower = forecast[index - 1] ?? minimum;
    const upper = forecast[index + 1] ?? maximum;
    slider.value = Math.max(lower, Math.min(upper, forecast[index]));
    updateForecast();
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (fieldset.disabled) return;

  const { date, benchmark, realized } = selectedRounds[roundIndex];
  const forecast = readForecast();
  const score = meanQuantileScore(forecast, realized);
  const referenceScore = meanQuantileScore(benchmark, realized);
  playerTotal += score;
  benchmarkTotal += referenceScore;

  fieldset.disabled = true;
  submit.hidden = true;

  const x = xPosition(realized);
  outcomeLine.setAttribute("x1", x);
  outcomeLine.setAttribute("x2", x);
  outcomeLine.setAttribute("visibility", "visible");
  outcomeKey.hidden = false;
  distribution.setAttribute("aria-label", "Benchmark and your forecast with observed return " + formatPercent(realized));

  const displayedScore = score.toFixed(3);
  const displayedReferenceScore = referenceScore.toFixed(3);
  playerScore.textContent = displayedScore;
  benchmarkScore.textContent = displayedReferenceScore;
  if (displayedScore === displayedReferenceScore) {
    resultHeading.textContent = "Tied with the benchmark";
  } else {
    resultHeading.textContent = score < referenceScore ? "You beat the benchmark" : "The benchmark won this round";
  }
  const insideRange = realized >= forecast[0] && realized <= forecast[forecast.length - 1];
  const returnDate = dateFormat.format(new Date(date));
  const coverage = insideRange ? "inside" : "outside";
  resultOutcome.textContent = `The DAX returned ${formatPercent(realized)} on ${returnDate}, ${coverage} your 95% interval.`;

  const isLastRound = roundIndex === roundCount - 1;
  next.textContent = isLastRound ? "Play again" : "Next round";
  if (isLastRound) {
    const skill = 100 * (1 - playerTotal / benchmarkTotal);
    sessionScore.textContent = "Skill over " + roundCount + " rounds: " + formatPercent(skill) + " against the benchmark.";
    sessionScore.hidden = false;
  }
  result.hidden = false;
  resultHeading.focus();
});

next.addEventListener("click", () => {
  if (roundIndex === roundCount - 1) {
    startGame();
  } else {
    roundIndex += 1;
    startRound();
  }
  heading.tabIndex = -1;
  heading.focus();
});

startGame();
