const STORAGE_KEY = "jokenpo:modern:v2";
const MAX_PLAYERS = 8;
const MAX_HISTORY_ITEMS = 12;

const PLAYER_COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#a3e635",
  "#38bdf8",
];

const MOVES = {
  rock: {
    key: "rock",
    label: "Pedra",
    emoji: "✊",
    beats: ["scissors"],
    subtitle: "força bruta",
    glow: "rgba(244, 63, 94, 0.45)",
    gradient: "from-rose-500/20 to-orange-500/10",
  },
  paper: {
    key: "paper",
    label: "Papel",
    emoji: "✋",
    beats: ["rock"],
    subtitle: "controle",
    glow: "rgba(34, 197, 94, 0.45)",
    gradient: "from-emerald-500/20 to-lime-500/10",
  },
  scissors: {
    key: "scissors",
    label: "Tesoura",
    emoji: "✌️",
    beats: ["paper"],
    subtitle: "precisão",
    glow: "rgba(56, 189, 248, 0.45)",
    gradient: "from-cyan-500/20 to-sky-500/10",
  },
};

const els = {
  goalLabel: document.getElementById("goal-label"),
  headerPlayerCount: document.getElementById("header-player-count"),
  headerRoundCount: document.getElementById("header-round-count"),
  turnBadge: document.getElementById("turn-badge"),
  resultText: document.getElementById("result-text"),
  resultSubtext: document.getElementById("result-subtext"),
  roundStatusLabel: document.getElementById("round-status-label"),
  currentRoundChoices: document.getElementById("current-round-choices"),
  actionHelper: document.getElementById("action-helper"),
  moveButtons: document.getElementById("move-buttons"),
  resetRoundBtn: document.getElementById("reset-round-btn"),
  resetScoresBtn: document.getElementById("reset-scores-btn"),
  historyList: document.getElementById("history-list"),
  roundCounter: document.getElementById("round-counter"),
  rankingList: document.getElementById("ranking-list"),
  statsRounds: document.getElementById("stats-rounds"),
  statsLeader: document.getElementById("stats-leader"),
  statsBestScore: document.getElementById("stats-best-score"),
  addPlayerForm: document.getElementById("add-player-form"),
  playerName: document.getElementById("player-name"),
  playerType: document.getElementById("player-type"),
  quickAddHuman: document.getElementById("quick-add-human"),
  quickAddBot: document.getElementById("quick-add-bot"),
  targetScore: document.getElementById("target-score"),
  playersList: document.getElementById("players-list"),
  toastContainer: document.getElementById("toast-container"),
  performanceChart: document.getElementById("performance-chart"),
};

let performanceChartInstance = null;

function uid() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getColorByIndex(index) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

function createPlayer(name, type = "human", index = 0) {
  return {
    id: uid(),
    name: name.trim(),
    type,
    score: 0,
    roundWins: 0,
    color: getColorByIndex(index),
    createdAt: new Date().toISOString(),
  };
}

function createInitialState() {
  return {
    players: [
      createPlayer("Você", "human", 0),
      createPlayer("CPU 1", "bot", 1),
    ],
    roundChoices: {},
    roundNumber: 0,
    history: [],
    settings: {
      targetScore: 5,
    },
    lastResult: {
      title: "Escolha uma jogada",
      subtext: "Comece a rodada escolhendo pedra, papel ou tesoura.",
      status: "Aguardando jogadas",
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();

    const parsed = JSON.parse(raw);

    if (!parsed || !Array.isArray(parsed.players) || !parsed.players.length) {
      return createInitialState();
    }

    return {
      players: parsed.players.map((player, index) => ({
        id: player.id || uid(),
        name: player.name || `Jogador ${index + 1}`,
        type: player.type === "bot" ? "bot" : "human",
        score: Number(player.score) || 0,
        roundWins: Number(player.roundWins) || 0,
        color: player.color || getColorByIndex(index),
        createdAt: player.createdAt || new Date().toISOString(),
      })),
      roundChoices: parsed.roundChoices || {},
      roundNumber: Number(parsed.roundNumber) || 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      settings: {
        targetScore: Number(parsed?.settings?.targetScore) || 5,
      },
      lastResult: parsed.lastResult || {
        title: "Escolha uma jogada",
        subtext: "Comece a rodada escolhendo pedra, papel ou tesoura.",
        status: "Aguardando jogadas",
      },
    };
  } catch (error) {
    console.error("Erro ao carregar estado:", error);
    return createInitialState();
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSortedPlayers() {
  return [...state.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.roundWins !== a.roundWins) return b.roundWins - a.roundWins;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function getHumanPlayers() {
  return state.players.filter((player) => player.type === "human");
}

function getBotPlayers() {
  return state.players.filter((player) => player.type === "bot");
}

function getPendingHumanPlayers() {
  return getHumanPlayers().filter((player) => !state.roundChoices[player.id]);
}

function getCurrentHumanTurn() {
  return getPendingHumanPlayers()[0] || null;
}

function getCurrentRoundCount() {
  return Object.keys(state.roundChoices).length;
}

function getMoveByKey(moveKey) {
  return MOVES[moveKey];
}

function getRandomMoveKey() {
  const keys = Object.keys(MOVES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function updateLastResult(title, subtext, status) {
  state.lastResult = { title, subtext, status };
}

function compareMoves(moveA, moveB) {
  if (moveA === moveB) return 0;
  if (MOVES[moveA].beats.includes(moveB)) return 1;
  if (MOVES[moveB].beats.includes(moveA)) return -1;
  return 0;
}

function resolveRoundResults(choices) {
  const roundScores = Object.fromEntries(
    choices.map((choice) => [choice.playerId, 0])
  );

  for (let i = 0; i < choices.length; i++) {
    for (let j = i + 1; j < choices.length; j++) {
      const left = choices[i];
      const right = choices[j];
      const result = compareMoves(left.move, right.move);

      if (result === 1) roundScores[left.playerId] += 1;
      if (result === -1) roundScores[right.playerId] += 1;
    }
  }

  const bestRoundScore = Math.max(...Object.values(roundScores));
  const winnerIds =
    bestRoundScore <= 0
      ? []
      : Object.entries(roundScores)
          .filter(([, score]) => score === bestRoundScore)
          .map(([playerId]) => playerId);

  return {
    roundScores,
    bestRoundScore,
    winnerIds,
  };
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function hexToRGBA(hex, alpha = 1) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function showToast(message, type = "info") {
  if (!els.toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="mt-0.5 h-2.5 w-2.5 rounded-full ${
        type === "success"
          ? "bg-emerald-400"
          : type === "danger"
          ? "bg-rose-400"
          : type === "warning"
          ? "bg-amber-400"
          : "bg-sky-400"
      }"></div>
      <div>
        <strong class="block text-sm font-bold text-white">Jo-ken-pô</strong>
        <p class="mt-1 text-sm leading-5 text-slate-200">${message}</p>
      </div>
    </div>
  `;

  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
  }, 2800);

  setTimeout(() => {
    toast.remove();
  }, 3400);
}

function renderHeader() {
  if (els.goalLabel) {
    els.goalLabel.textContent = `${state.settings.targetScore} pts`;
  }

  if (els.headerPlayerCount) {
    els.headerPlayerCount.textContent = String(state.players.length);
  }

  if (els.headerRoundCount) {
    els.headerRoundCount.textContent = String(state.roundNumber);
  }

  if (els.turnBadge) {
    els.turnBadge.textContent = `${getCurrentRoundCount()}/${state.players.length} jogadas registradas`;
  }

  if (els.resultText) {
    els.resultText.textContent = state.lastResult.title;
  }

  if (els.resultSubtext) {
    els.resultSubtext.textContent = state.lastResult.subtext;
  }

  if (els.roundStatusLabel) {
    els.roundStatusLabel.textContent = state.lastResult.status;
  }

  const currentHuman = getCurrentHumanTurn();

  if (els.actionHelper) {
    els.actionHelper.textContent = currentHuman
      ? `Vez de ${currentHuman.name}`
      : getCurrentRoundCount() === 0
      ? "Sua vez"
      : "Processando rodada";
  }
}

function renderCurrentRoundChoices() {
  if (!els.currentRoundChoices) return;

  els.currentRoundChoices.innerHTML = state.players
    .map((player) => {
      const hasChoice = Boolean(state.roundChoices[player.id]);
      const currentHuman = getCurrentHumanTurn();
      const isActive = currentHuman?.id === player.id;

      return `
        <article class="round-choice-card ${isActive ? "player-card--active" : ""}">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-white">${player.name}</p>
              <p class="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                ${player.type === "bot" ? "bot" : "humano"}
              </p>
            </div>

            <span
              class="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-lg"
              style="background:${hexToRGBA(player.color, 0.16)}; color:${player.color}; border:1px solid ${hexToRGBA(player.color, 0.28)};"
            >
              ${player.type === "bot" ? "🤖" : "🧍"}
            </span>
          </div>

          <div class="mt-4">
            <div class="player-pill">
              ${
                hasChoice
                  ? "✅ escolha registrada"
                  : isActive
                  ? "🎯 aguardando escolha"
                  : player.type === "bot"
                  ? "⚙️ aguardando processamento"
                  : "⏳ na fila da rodada"
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderMoveButtons() {
  if (!els.moveButtons) return;

  const currentHuman = getCurrentHumanTurn();
  const isDisabled = !currentHuman;

  els.moveButtons.innerHTML = Object.values(MOVES)
    .map((move) => {
      return `
        <button
          type="button"
          class="choice-button bg-gradient-to-br ${move.gradient} p-5 text-left"
          data-move="${move.key}"
          ${isDisabled ? "disabled" : ""}
        >
          <span
            class="choice-button__glow"
            style="background:${move.glow};"
          ></span>

          <div class="relative z-10 flex h-full flex-col justify-between">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">
                  ${move.label}
                </p>
                <p class="mt-2 text-sm text-slate-400">${move.subtitle}</p>
              </div>

              <span class="text-5xl">${move.emoji}</span>
            </div>

            <p class="mt-6 text-sm font-medium text-slate-200">
              ${currentHuman ? `Escolher para ${currentHuman.name}` : "Rodada em processamento"}
            </p>
          </div>
        </button>
      `;
    })
    .join("");

  els.moveButtons.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", () => {
      const move = button.dataset.move;
      handleHumanMove(move);
    });
  });
}

function renderPlayersList() {
  if (!els.playersList) return;

  const currentHuman = getCurrentHumanTurn();

  els.playersList.innerHTML = state.players
    .map((player) => {
      const removable = state.players.length > 2;
      const isActive = currentHuman?.id === player.id;

      return `
        <article class="player-card ${isActive ? "player-card--active" : ""}">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <span
                class="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold"
                style="background:${hexToRGBA(player.color, 0.14)}; color:${player.color}; border:1px solid ${hexToRGBA(player.color, 0.24)};"
              >
                ${player.type === "bot" ? "🤖" : "🧍"}
              </span>

              <div>
                <strong class="block text-base font-bold text-white">${player.name}</strong>
                <p class="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                  ${player.type === "bot" ? "bot" : "humano"}
                </p>
              </div>
            </div>

            ${
              removable
                ? `
                <button
                  type="button"
                  data-remove-player="${player.id}"
                  class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                >
                  remover
                </button>
              `
                : ""
            }
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-3">
              <span class="block text-[11px] uppercase tracking-[0.22em] text-slate-400">Score</span>
              <strong class="mt-1 block text-xl font-black text-white">${player.score}</strong>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-3">
              <span class="block text-[11px] uppercase tracking-[0.22em] text-slate-400">Rodadas</span>
              <strong class="mt-1 block text-xl font-black text-white">${player.roundWins}</strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  els.playersList.querySelectorAll("[data-remove-player]").forEach((button) => {
    button.addEventListener("click", () => {
      removePlayer(button.dataset.removePlayer);
    });
  });
}

function renderRanking() {
  if (!els.rankingList) return;

  const sorted = getSortedPlayers();

  els.rankingList.innerHTML = sorted
    .map((player, index) => {
      return `
        <article class="player-card">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-white">
                #${index + 1}
              </span>

              <div>
                <strong class="block text-base font-bold text-white">${player.name}</strong>
                <p class="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                  ${player.type === "bot" ? "bot" : "humano"}
                </p>
              </div>
            </div>

            <div class="text-right">
              <strong class="block text-2xl font-black text-white">${player.score}</strong>
              <span class="text-xs uppercase tracking-[0.22em] text-slate-400">
                ${player.roundWins} rodadas
              </span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderHistory() {
  if (!els.historyList) return;

  if (!state.history.length) {
    els.historyList.innerHTML = `
      <div class="history-card">
        <p class="text-sm text-slate-300">Nenhuma rodada registrada ainda.</p>
      </div>
    `;
  } else {
    const latest = [...state.history].slice(-MAX_HISTORY_ITEMS).reverse();

    els.historyList.innerHTML = latest
      .map((entry) => {
        const choicesMarkup = entry.choices
          .map((choice) => {
            return `
              <span class="player-pill">
                <strong>${choice.name}</strong>
                ${choice.emoji}
                <span class="text-slate-400">(${choice.label})</span>
              </span>
            `;
          })
          .join("");

        const winnerText =
          entry.winnerNames.length > 0
            ? entry.winnerNames.join(", ")
            : "Empate geral";

        return `
          <article class="history-card">
            <div class="flex items-start justify-between gap-4">
              <div>
                <strong class="block text-base font-bold text-white">
                  Rodada ${entry.roundNumber}
                </strong>
                <p class="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                  ${formatDate(entry.createdAt)}
                </p>
              </div>

              <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                ${winnerText}
              </span>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              ${choicesMarkup}
            </div>
          </article>
        `;
      })
      .join("");
  }

  if (els.roundCounter) {
    els.roundCounter.textContent = `${state.history.length} rodadas`;
  }
}

function renderStats() {
  const sorted = getSortedPlayers();
  const leader = sorted[0];

  if (els.statsRounds) {
    els.statsRounds.textContent = String(state.history.length);
  }

  if (els.statsLeader) {
    els.statsLeader.textContent = leader ? leader.name : "—";
  }

  if (els.statsBestScore) {
    els.statsBestScore.textContent = leader ? String(leader.score) : "0";
  }
}

function buildChartData() {
  const labels = ["Início"];
  const sortedPlayers = getSortedPlayers();

  const datasets = sortedPlayers.map((player) => ({
    label: player.name,
    data: [0],
    borderColor: player.color,
    backgroundColor: hexToRGBA(player.color, 0.18),
    pointBackgroundColor: player.color,
    pointBorderColor: player.color,
    borderWidth: 3,
    pointRadius: 3,
    pointHoverRadius: 5,
    fill: false,
    tension: 0.35,
  }));

  if (!state.history.length) {
    return { labels, datasets };
  }

  state.history.forEach((entry) => {
    labels.push(`R${entry.roundNumber}`);

    sortedPlayers.forEach((player, index) => {
      const snapshot = entry.scoreSnapshot.find(
        (item) => item.playerId === player.id
      );

      const previousValue = datasets[index].data[datasets[index].data.length - 1] || 0;
      datasets[index].data.push(snapshot ? snapshot.score : previousValue);
    });
  });

  return { labels, datasets };
}

function renderPerformanceChart() {
  if (!els.performanceChart || typeof Chart === "undefined") return;

  const context = els.performanceChart.getContext("2d");
  const { labels, datasets } = buildChartData();

  if (performanceChartInstance) {
    performanceChartInstance.destroy();
  }

  performanceChartInstance = new Chart(context, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: "#e2e8f0",
            usePointStyle: true,
            padding: 18,
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#fff",
          bodyColor: "#e2e8f0",
          borderColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
          },
          grid: {
            color: "rgba(255,255,255,0.05)",
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#94a3b8",
            precision: 0,
          },
          grid: {
            color: "rgba(255,255,255,0.05)",
          },
        },
      },
    },
  });
}

function renderAll() {
  renderHeader();
  renderCurrentRoundChoices();
  renderMoveButtons();
  renderPlayersList();
  renderRanking();
  renderHistory();
  renderStats();
  renderPerformanceChart();
}

function assignBotChoices() {
  getBotPlayers().forEach((bot) => {
    if (!state.roundChoices[bot.id]) {
      state.roundChoices[bot.id] = getRandomMoveKey();
    }
  });
}

function handleHumanMove(moveKey) {
  const currentHuman = getCurrentHumanTurn();
  if (!currentHuman) return;

  state.roundChoices[currentHuman.id] = moveKey;

  const nextHuman = getCurrentHumanTurn();

  if (nextHuman) {
    updateLastResult(
      `Jogada registrada para ${currentHuman.name}`,
      `Agora é a vez de ${nextHuman.name}. As escolhas continuam ocultas até o fim da rodada.`,
      "Aguardando próximas jogadas"
    );
    saveState();
    renderAll();
    return;
  }

  assignBotChoices();

  updateLastResult(
    "Processando rodada...",
    "Comparando as escolhas de todos os jogadores e calculando o resultado final.",
    "Analisando resultado"
  );

  saveState();
  renderAll();

  setTimeout(() => {
    resolveCurrentRound();
  }, 700);
}

function resolveCurrentRound() {
  const choices = state.players.map((player) => {
    const moveKey = state.roundChoices[player.id] || getRandomMoveKey();
    const move = getMoveByKey(moveKey);

    return {
      playerId: player.id,
      name: player.name,
      move: moveKey,
      label: move.label,
      emoji: move.emoji,
    };
  });

  const { roundScores, winnerIds } = resolveRoundResults(choices);

  state.players = state.players.map((player) => {
    if (winnerIds.includes(player.id)) {
      return {
        ...player,
        score: player.score + 1,
        roundWins: player.roundWins + 1,
      };
    }
    return player;
  });

  state.roundNumber += 1;

  const winnerNames = state.players
    .filter((player) => winnerIds.includes(player.id))
    .map((player) => player.name);

  const historyEntry = {
    id: uid(),
    roundNumber: state.roundNumber,
    createdAt: new Date().toISOString(),
    choices,
    winnerIds,
    winnerNames,
    roundScores,
    scoreSnapshot: state.players.map((player) => ({
      playerId: player.id,
      name: player.name,
      score: player.score,
      roundWins: player.roundWins,
    })),
  };

  state.history.push(historyEntry);

  if (winnerNames.length === 0) {
    updateLastResult(
      "Empate geral na rodada",
      "Nenhum jogador conseguiu vantagem suficiente nesta rodada.",
      "Rodada finalizada"
    );
    showToast("A rodada terminou empatada.", "warning");
  } else if (winnerNames.length === 1) {
    updateLastResult(
      `${winnerNames[0]} venceu a rodada!`,
      `A rodada ${state.roundNumber} foi salva no histórico e o ranking já foi atualizado.`,
      "Rodada finalizada"
    );
    showToast(`${winnerNames[0]} marcou ponto no ranking.`, "success");
  } else {
    updateLastResult(
      `Empate técnico entre ${winnerNames.join(", ")}`,
      "Os líderes da rodada marcaram ponto juntos e o histórico foi salvo.",
      "Rodada finalizada"
    );
    showToast(`Empate técnico: ${winnerNames.join(", ")} pontuaram.`, "info");
  }

  state.roundChoices = {};

  const leadersAtGoal = state.players.filter(
    (player) => player.score >= state.settings.targetScore
  );

  if (leadersAtGoal.length > 0) {
    const goalNames = leadersAtGoal.map((player) => player.name).join(", ");
    showToast(
      `${goalNames} atingiu/atingiram a meta de ${state.settings.targetScore} pontos!`,
      "success"
    );
  }

  saveState();
  renderAll();
}

function resetRound(showFeedback = true) {
  state.roundChoices = {};
  updateLastResult(
    "Escolha uma jogada",
    "Comece uma nova rodada escolhendo pedra, papel ou tesoura.",
    "Aguardando jogadas"
  );

  saveState();
  renderAll();

  if (showFeedback) {
    showToast("Nova rodada iniciada.", "info");
  }
}

function resetScores() {
  state.players = state.players.map((player) => ({
    ...player,
    score: 0,
    roundWins: 0,
  }));

  state.roundChoices = {};
  state.roundNumber = 0;
  state.history = [];

  updateLastResult(
    "Placar reiniciado",
    "Todo o histórico foi limpo e uma nova partida pode começar agora.",
    "Aguardando jogadas"
  );

  saveState();
  renderAll();
  showToast("Placar, histórico e gráfico foram resetados.", "danger");
}

function addPlayer(name, type = "human") {
  if (!name.trim()) {
    showToast("Digite um nome para adicionar o jogador.", "warning");
    return;
  }

  if (state.players.length >= MAX_PLAYERS) {
    showToast(`Limite máximo de ${MAX_PLAYERS} jogadores atingido.`, "warning");
    return;
  }

  const player = createPlayer(name, type, state.players.length);
  state.players.push(player);

  if (getCurrentRoundCount() > 0) {
    state.roundChoices = {};
    updateLastResult(
      "Rodada reiniciada",
      "Um novo jogador foi adicionado. Por segurança, a rodada atual foi reiniciada.",
      "Aguardando jogadas"
    );
  }

  saveState();
  renderAll();
  showToast(`${player.name} foi adicionado ao jogo.`, "success");
}

function removePlayer(playerId) {
  if (state.players.length <= 2) {
    showToast("O jogo precisa ter pelo menos 2 jogadores.", "warning");
    return;
  }

  const player = state.players.find((item) => item.id === playerId);
  if (!player) return;

  state.players = state.players.filter((item) => item.id !== playerId);

  if (state.roundChoices[playerId]) {
    delete state.roundChoices[playerId];
  }

  updateLastResult(
    "Jogador removido",
    `${player.name} saiu da partida. Ranking e gráfico foram atualizados.`,
    "Aguardando jogadas"
  );

  saveState();
  renderAll();
  showToast(`${player.name} foi removido da partida.`, "danger");
}

function getNextHumanName() {
  const count = state.players.filter((player) => player.type === "human").length + 1;
  return `Jogador ${count}`;
}

function getNextBotName() {
  const count = state.players.filter((player) => player.type === "bot").length + 1;
  return `CPU ${count}`;
}

function bindEvents() {
  if (els.resetRoundBtn) {
    els.resetRoundBtn.addEventListener("click", () => resetRound());
  }

  if (els.resetScoresBtn) {
    els.resetScoresBtn.addEventListener("click", () => resetScores());
  }

  if (els.addPlayerForm) {
    els.addPlayerForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = els.playerName.value.trim();
      const type = els.playerType.value;

      addPlayer(name, type);
      els.addPlayerForm.reset();
      els.playerType.value = "human";
    });
  }

  if (els.quickAddHuman) {
    els.quickAddHuman.addEventListener("click", () => {
      addPlayer(getNextHumanName(), "human");
    });
  }

  if (els.quickAddBot) {
    els.quickAddBot.addEventListener("click", () => {
      addPlayer(getNextBotName(), "bot");
    });
  }

  if (els.targetScore) {
    els.targetScore.value = String(state.settings.targetScore);

    els.targetScore.addEventListener("change", (event) => {
      state.settings.targetScore = Number(event.target.value) || 5;
      saveState();
      renderAll();
      showToast(
        `Meta de vitória atualizada para ${state.settings.targetScore} pontos.`,
        "info"
      );
    });
  }
}

function resumePendingRoundIfNeeded() {
  const currentRoundCount = getCurrentRoundCount();

  if (currentRoundCount === 0) return;

  const pendingHumans = getPendingHumanPlayers();

  if (pendingHumans.length === 0 && currentRoundCount < state.players.length) {
    assignBotChoices();
    saveState();
    renderAll();

    setTimeout(() => {
      resolveCurrentRound();
    }, 500);
  }
}

bindEvents();
renderAll();
resumePendingRoundIfNeeded();