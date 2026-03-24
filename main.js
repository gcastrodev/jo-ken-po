// Seleção dos elementos do DOM
const result = document.querySelector('.result');
const yourScore = document.querySelector('.your_score span');
const machineScore = document.querySelector('.machine_score span');
const machineChoiceText = document.querySelector('.machine_choice');

// Variáveis de controle do placar
let humanScoreNumber = 0;
let machineScoreNumber = 0;

// Carrega placar salvo (se existir)
const savedHumanScore = localStorage.getItem('humanScore');
const savedMachineScore = localStorage.getItem('machineScore');

if (savedHumanScore !== null && savedMachineScore !== null) {
    humanScoreNumber = Number(savedHumanScore);
    machineScoreNumber = Number(savedMachineScore);

    yourScore.textContent = humanScoreNumber;
    machineScore.textContent = machineScoreNumber;
}

// "Enum" de opções do jogo (simulação de enum em JavaScript)
// Centraliza os valores possíveis (rock, paper, scissors)
// Evita strings soltas no código e facilita manutenção/refatoração
// Exemplo: se mudar 'rock' para 'pedra', só altera aqui
const GAME_OPTIONS = {
    ROCK: 'rock',
    PAPER: 'paper',
    SCISSORS: 'scissors'
}

// =========================
// Jogada do jogador
// =========================
const playHuman = (humanChoice) => {

    // Feedback visual enquanto a máquina "pensa"
    result.textContent = 'Máquina pensando... 🤔';
    result.className = 'result';

    // Limpa escolha anterior da máquina
    machineChoiceText.textContent = '';

    // Delay para simular decisão da máquina
    setTimeout(() => {
        playTheGame(humanChoice, playMachine());
    }, 700);
}

// =========================
// Jogada da máquina (aleatória)
// =========================
const playMachine = () => {
    const choices = Object.values(GAME_OPTIONS);
    const randomNumber = Math.floor(Math.random() * choices.length);
    return choices[randomNumber];
}

// =========================
// Lógica principal do jogo
// =========================
const playTheGame = (human, machine) => {

    // Emojis para melhorar UX
    const emojis = {
        rock: '✊',
        paper: '🖐️',
        scissors: '✌️'
    };

    // Mostra escolha da máquina
    machineChoiceText.textContent = `Máquina: ${emojis[machine]} (${machine})`;

    // Verifica empate
    if (human === machine) {
        result.textContent = 'Deu empate!';
        result.className = 'result draw';

    // Verifica vitória do jogador
    } else if (
        (human === GAME_OPTIONS.ROCK && machine === GAME_OPTIONS.SCISSORS) ||
        (human === GAME_OPTIONS.SCISSORS && machine === GAME_OPTIONS.PAPER) ||
        (human === GAME_OPTIONS.PAPER && machine === GAME_OPTIONS.ROCK)
    ) {
        humanScoreNumber++;
        yourScore.textContent = humanScoreNumber;
        // salva
        localStorage.setItem('humanScore', humanScoreNumber);

        result.textContent = 'Você ganhou!';
        result.className = 'result win';

    // Caso contrário, máquina vence
    } else {
        machineScoreNumber++;
        machineScore.textContent = machineScoreNumber;
        // salva
        localStorage.setItem('machineScore', machineScoreNumber);

        result.textContent = 'Você perdeu 😢';
        result.className = 'result lose';
    }
}