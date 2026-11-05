"use strict";

const initial = () => ({
  scores: [0, 0],
  sets: [0, 0],
  serving: 0,
  names: ["Home", "Away"],
  best: 3,
  points: 21,
  swapped: false
});

const key = "courtside-phone-v1";

let data = initial(), undo = [];

const $ = id => document.getElementById(id);

try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (
    saved &&
    Array.isArray(saved.scores) && saved.scores.length === 2 &&
    saved.scores.every(n => Number.isInteger(n) && n >= 0) &&
    Array.isArray(saved.sets) && saved.sets.length === 2 &&
    saved.sets.every(n => Number.isInteger(n) && n >= 0 && n <= 3) &&
    Array.isArray(saved.names) && saved.names.length === 2 &&
    saved.names.every(n => typeof n === "string" && n.length <= 18) &&
    [3, 5].includes(saved.best) &&
    [11, 15, 21, 25].includes(saved.points) &&
    [0, 1].includes(saved.serving)
  ) {
    // Copy only current fields so older saves shed their unused history.
    data = {
      scores: saved.scores,
      sets: saved.sets,
      serving: saved.serving,
      names: saved.names,
      best: saved.best,
      points: saved.points,
      swapped: saved.swapped === true
    };
  }
} catch {
  // A fresh match also works when storage is unavailable or invalid.
}

const completedSets = () => data.sets[0] + data.sets[1];

const target = () => {
  if (completedSets() === data.best - 1) return data.points <= 15 ? 11 : 15;
  return data.points;
};

const winner = () => [0, 1].find(i => data.scores[i] >= target() && data.scores[i] - data.scores[1 - i] >= 2);

const finished = () => data.sets.some(s => s >= Math.floor(data.best / 2) + 1);

const remember = () => {
  undo.push(JSON.stringify(data));
};

function render() {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    $("storage").textContent = "";
  } catch {
    $("storage").textContent = "Scores cannot be saved in this browser session. Keep this page open while scoring.";
  }
  $("teams").replaceChildren();
  for (const team of data.swapped ? [1, 0] : [0, 1]) {
    const card = document.createElement("article");
    card.className = "team";
    card.style.setProperty("--accent", team === 0 ? "#43ddc0" : "#ff917b");
    const head = document.createElement("div");
    head.className = "team-head";
    const ball = document.createElement("span");
    ball.className = "ball";
    ball.textContent = data.serving === team ? "🏐" : "";
    ball.setAttribute("aria-label", data.serving === team ? "Serving" : "");
    const serve = document.createElement("button");
    serve.className = "serve";
    serve.id = `team-${team}-serve`;
    serve.textContent = data.names[team];
    serve.setAttribute("aria-label", `Set ${data.names[team]} serving`);
    serve.setAttribute("aria-pressed", String(data.serving === team));
    serve.disabled = finished() || winner() !== undefined;
    serve.onclick = () => {
      remember();
      data.serving = team;
      render();
    };
    const score = document.createElement("div");
    score.className = "score";
    score.id = `team-${team}-score`;
    score.textContent = String(data.scores[team]).padStart(2, "0");
    score.setAttribute("aria-label", `${data.names[team]}: ${data.scores[team]} points`);
    const setsWon = document.createElement("div");
    setsWon.className = "sets-won";
    setsWon.setAttribute("aria-label", `${data.names[team]}: ${data.sets[team]} sets won`);
    const setCount = document.createElement("strong");
    setCount.id = `team-${team}-sets`;
    setCount.textContent = String(data.sets[team]);
    const setLabel = document.createElement("span");
    setLabel.textContent = "SETS WON";
    setsWon.append(setCount, setLabel);
    const point = document.createElement("button");
    point.className = "point";
    point.id = `team-${team}-point`;
    point.textContent = `+ Point for ${data.names[team]}`;
    point.disabled = finished() || winner() !== undefined;
    point.onclick = () => {
      if (finished() || winner() !== undefined) return;
      remember();
      data.scores[team]++;
      data.serving = team;
      render();
    };
    head.append(serve, ball);
    card.append(head, score, setsWon, point);
    $("teams").append(card);
  }
  $("set").textContent = `SET ${Math.min(completedSets() + 1, data.best)}`;
  $("undo").disabled = !undo.length;
  const win = winner();
  $("next").hidden = win === undefined || finished();
  $("next").textContent = win !== undefined && data.sets[win] + 1 > data.best / 2 ? "Finish match" : "Start next set";
  $("status").textContent = finished() ? `${data.names[data.sets[0] > data.sets[1] ? 0 : 1]} wins the match. Well played!` : win !== undefined ? `${data.names[win]} wins this set!` : "";
}

$("undo").onclick = () => {
  if (undo.length) {
    data = JSON.parse(undo.pop());
    render();
  }
};

$("swap").onclick = () => {
  data.swapped = !data.swapped;
  render();
};

$("next").onclick = () => {
  const win = winner();
  if (win === undefined || finished()) return;
  remember();
  data.sets[win]++;
  data.scores = [0, 0];
  data.serving = completedSets() % 2;
  render();
};

$("settings").onclick = () => {
  $("home").value = data.names[0];
  $("away").value = data.names[1];
  $("best").value = data.best;
  $("points").value = data.points;
  $("rules").disabled = completedSets() > 0 || data.scores.some(Boolean);
  $("settingsDialog").showModal();
};

$("settingsForm").onsubmit = e => {
  e.preventDefault();
  data.names = [$("home").value.trim() || "Home", $("away").value.trim() || "Away"];
  if (!$("rules").disabled) {
    data.best = Number($("best").value);
    data.points = Number($("points").value);
  }
  // Earlier snapshots use the old match format and names.
  undo = [];
  $("settingsDialog").close();
  render();
};

$("cancelSettings").onclick = () => $("settingsDialog").close();

$("reset").onclick = () => $("resetDialog").showModal();

$("cancelReset").onclick = () => $("resetDialog").close();

$("confirmReset").onclick = () => {
  data = {
    ...initial(),
    names: data.names,
    best: data.best,
    points: data.points,
    swapped: data.swapped
  };
  undo = [];
  $("resetDialog").close();
  render();
};

render();
