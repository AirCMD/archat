/*
============================================================
 AI LANGUAGE LAB
 Простий експеримент з emergent communication
============================================================

 Alice -> надсилає символ
 Bob   -> намагається зрозуміти символ

 Агенти НЕ використовують справжню нейромережу.
 Тут використовується Q-learning-подібна таблиця.

 Усі дані працюють локально в браузері.
============================================================
*/


// ============================================================
// ПОЧАТКОВИЙ СЛОВНИК
// ============================================================

const vocabulary = {

    "яблуко": "ya",

    "м'яч": "ba",

    "книга": "ku",

    "капелюх": "ha",

    "квітка": "li",

    "кіт": "mi",

    "сонце": "so",

    "вода": "vo"

};


// ============================================================
// СИМВОЛИ, ЯКІ МОЖУТЬ ВИКОРИСТОВУВАТИСЯ
// ============================================================

const tokens = [

    "ya",
    "ba",
    "ku",
    "ha",
    "li",
    "mi",
    "so",
    "vo",

    "za",
    "ko",
    "ti",
    "nu",
    "ra",
    "po",
    "me",
    "su"

];


// ============================================================
// СТАН ЕКСПЕРИМЕНТУ
// ============================================================

let round = 0;

let successful = 0;

let total = 0;


// ============================================================
// ПАРАМЕТРИ
// ============================================================

let learningRate = 0.20;

let exploration = 0.25;


// ============================================================
// Q-ТАБЛИЦІ
// ============================================================
//
// Alice:
//
// слово -> token -> значення
//
// Bob:
//
// слово -> token -> значення
//
// Значення показує, наскільки корисною була асоціація.
// ============================================================

let aliceQ = {};

let bobQ = {};


// ============================================================
// СТВОРЕННЯ ПОЧАТКОВИХ ТАБЛИЦЬ
// ============================================================

function createTables() {

    aliceQ = {};

    bobQ = {};

    for (const word of Object.keys(vocabulary)) {

        aliceQ[word] = {};

        bobQ[word] = {};

        for (const token of tokens) {

            /*
            Початкові українські звуки отримують
            невелику перевагу.

            Це означає, що агенти стартують не
            з повного нуля.
            */

            const initialToken = vocabulary[word];

            if (token === initialToken) {

                aliceQ[word][token] = 0.3;
                bobQ[word][token] = 0.3;

            } else {

                aliceQ[word][token] = 0;
                bobQ[word][token] = 0;

            }

        }

    }

}


// ============================================================
// ВИПАДКОВЕ СЛОВО
// ============================================================

function randomWord() {

    const words = Object.keys(vocabulary);

    return words[
        Math.floor(Math.random() * words.length)
    ];

}


// ============================================================
// ВИБІР СИМВОЛУ ALICE
// ============================================================

function chooseAliceToken(word) {

    /*
    Exploration:
    Alice іноді пробує новий символ.

    Це важливо.

    Без exploration вона могла б назавжди
    застрягнути на першому знайденому варіанті.
    */

    if (Math.random() < exploration) {

        return tokens[
            Math.floor(Math.random() * tokens.length)
        ];

    }


    let bestValue = -Infinity;

    let bestTokens = [];


    for (const token of tokens) {

        const value = aliceQ[word][token];


        if (value > bestValue) {

            bestValue = value;

            bestTokens = [token];

        } else if (value === bestValue) {

            bestTokens.push(token);

        }

    }


    return bestTokens[
        Math.floor(Math.random() * bestTokens.length)
    ];

}


// ============================================================
// BOB НАМАГАЄТЬСЯ РОЗПІЗНАТИ СИМВОЛ
// ============================================================

function bobGuess(token) {

    let bestWord = null;

    let bestValue = -Infinity;


    for (const word of Object.keys(vocabulary)) {

        const value = bobQ[word][token];


        if (value > bestValue) {

            bestValue = value;

            bestWord = word;

        }

    }


    return bestWord;

}


// ============================================================
// ОНОВЛЕННЯ Q
// ============================================================

function updateQ(table, word, token, reward) {

    const oldValue = table[word][token];

    table[word][token] =
        oldValue +
        learningRate *
        (reward - oldValue);

}


// ============================================================
// ОДИН НАВЧАЛЬНИЙ РАУНД
// ============================================================

function trainingStep(showMessage = true) {

    round++;

    total++;


    // ------------------------------------------
    // 1. Alice отримує випадкове слово
    // ------------------------------------------

    const word = randomWord();


    // ------------------------------------------
    // 2. Alice створює повідомлення
    // ------------------------------------------

    const message = chooseAliceToken(word);


    // ------------------------------------------
    // 3. Bob намагається його зрозуміти
    // ------------------------------------------

    const guess = bobGuess(message);


    // ------------------------------------------
    // 4. Визначаємо винагороду
    // ------------------------------------------

    let reward;

    let correct = false;


    if (guess === word) {

        reward = 1;

        successful++;

        correct = true;

    } else {

        reward = -0.2;

    }


    // ------------------------------------------
    // 5. Навчаємо Alice
    // ------------------------------------------

    updateQ(
        aliceQ,
        word,
        message,
        reward
    );


    // ------------------------------------------
    // 6. Навчаємо Bob
    // ------------------------------------------

    /*
    Якщо відповідь правильна,
    Bob зміцнює зв'язок:

        слово <-> символ

    Якщо неправильна,
    неправильна асоціація послаблюється.
    */

    if (correct) {

        updateQ(
            bobQ,
            word,
            message,
            1
        );

    } else {

        updateQ(
            bobQ,
            guess,
            message,
            -0.2
        );

    }


    // ------------------------------------------
    // 7. Показуємо діалог
    // ------------------------------------------

    if (showMessage) {

        addMessage(
            word,
            message,
            guess,
            correct
        );

    }


    updateInterface();

}


// ============================================================
// ПОКАЗ ДІАЛОГУ
// ============================================================

function addMessage(
    word,
    message,
    guess,
    correct
) {

    const conversation =
        document.getElementById("conversation");


    // При першому повідомленні прибираємо placeholder

    const empty =
        conversation.querySelector(".empty-message");

    if (empty) {

        empty.remove();

    }


    // Alice

    const aliceMessage =
        document.createElement("div");

    aliceMessage.className =
        "message alice";


    aliceMessage.innerHTML = `

        <div class="message-header">

            <span>Alice</span>

            <span>слово: ${word}</span>

        </div>

        <div>

            <span class="token">${message}</span>

        </div>

        <div class="translation">

            Передано символ: ${message}

        </div>

    `;


    conversation.appendChild(aliceMessage);


    // Bob

    const bobMessage =
        document.createElement("div");

    bobMessage.className =
        "message bob";


    bobMessage.innerHTML = `

        <div class="message-header">

            <span>Bob</span>

            <span>${correct ? "✓ правильно" : "✗ помилка"}</span>

        </div>

        <div>

            Я думаю, що це:

            <b>${guess}</b>

        </div>

        <div class="translation">

            Символ "${message}" →

            ${guess}

        </div>

    `;


    conversation.appendChild(bobMessage);


    // Не даємо журналу нескінченно рости

    while (conversation.children.length > 120) {

        conversation.removeChild(
            conversation.firstElementChild
        );

    }


    conversation.scrollTop =
        conversation.scrollHeight;

}


// ============================================================
// СЛОВНИК ALICE
// ============================================================

function getAliceDictionary() {

    const result = [];


    for (const word of Object.keys(vocabulary)) {

        let bestToken = tokens[0];

        let bestValue = -Infinity;


        for (const token of tokens) {

            const value =
                aliceQ[word][token];


            if (value > bestValue) {

                bestValue = value;

                bestToken = token;

            }

        }


        result.push({
            word,
            token: bestToken,
            value: bestValue
        });

    }


    return result;

}


// ============================================================
// СЛОВНИК BOB
// ============================================================

function getBobDictionary() {

    const result = [];


    for (const word of Object.keys(vocabulary)) {

        let bestToken = tokens[0];

        let bestValue = -Infinity;


        for (const token of tokens) {

            const value =
                bobQ[word][token];


            if (value > bestValue) {

                bestValue = value;

                bestToken = token;

            }

        }


        result.push({
            word,
            token: bestToken,
            value: bestValue
        });

    }


    return result;

}


// ============================================================
// ОНОВЛЕННЯ ІНТЕРФЕЙСУ
// ============================================================

function updateInterface() {

    document.getElementById("roundCounter")
        .textContent = round.toLocaleString("uk-UA");


    document.getElementById("currentRound")
        .textContent = round.toLocaleString("uk-UA");


    const rate =
        total > 0
            ? Math.round(
                successful / total * 100
            )
            : 0;


    document.getElementById("successRate")
        .textContent = rate + "%";


    const roundsInput =
        document.getElementById("rounds");


    const maximum =
        Math.max(
            1,
            Number(roundsInput.value)
        );


    const percentage =
        Math.min(
            100,
            round / maximum * 100
        );


    document.getElementById("progressBar")
        .style.width = percentage + "%";


    renderDictionary(
        "aliceDictionary",
        getAliceDictionary()
    );


    renderDictionary(
        "bobDictionary",
        getBobDictionary()
    );

}


// ============================================================
// ВИВЕДЕННЯ СЛОВНИКА
// ============================================================

function renderDictionary(
    elementId,
    dictionary
) {

    const container =
        document.getElementById(elementId);


    container.innerHTML = "";


    for (const entry of dictionary) {

        const row =
            document.createElement("div");

        row.className =
            "dictionary-row";


        row.innerHTML = `

            <span class="word">
                ${entry.word}
            </span>

            <span class="value">
                ${entry.token}
            </span>

        `;


        container.appendChild(row);

    }

}


// ============================================================
// ПОЧАТКОВИЙ СЛОВНИК НА СТОРІНЦІ
// ============================================================

function renderVocabulary() {

    const container =
        document.getElementById("vocabulary");


    container.innerHTML = "";


    for (const word of Object.keys(vocabulary)) {

        const row =
            document.createElement("div");

        row.className =
            "vocab-row";


        row.innerHTML = `

            <span class="ukrainian">
                ${word}
            </span>

            <span class="sound">
                ${vocabulary[word]}
            </span>

        `;


        container.appendChild(row);

    }

}


// ============================================================
// ЗВУК
// ============================================================

function playSound(frequency = 440) {

    const enabled =
        document.getElementById("soundEnabled")
            .checked;


    if (!enabled) {

        return;

    }


    /*
    Використовуємо Web Audio API.

    Ніяких зовнішніх mp3-файлів не потрібно.
    */

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        const context =
            new AudioContext();


        const oscillator =
            context.createOscillator();


        const gain =
            context.createGain();


        oscillator.frequency.value =
            frequency;


        oscillator.type = "sine";


        gain.gain.setValueAtTime(
            0.04,
            context.currentTime
        );


        gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + 0.12
        );


        oscillator.connect(gain);

        gain.connect(context.destination);


        oscillator.start();

        oscillator.stop(
            context.currentTime + 0.12
        );

    } catch (error) {

        // Якщо браузер не дозволяє звук,
        // експеримент все одно продовжується.

    }

}


// ============================================================
// НАВЧАННЯ ПАКЕТОМ
// ============================================================

let training = false;


async function train() {

    if (training) {

        return;

    }


    training = true;


    const trainButton =
        document.getElementById("trainBtn");


    trainButton.disabled = true;

    trainButton.textContent =
        "⏳ Навчання...";


    const amount =
        Math.max(
            1,
            Number(
                document.getElementById("rounds").value
            )
        );


    /*
    Не запускаємо мільйон раундів одним величезним
    циклом без паузи.

    Розбиваємо роботу на маленькі блоки,
    щоб браузер не зависав.
    */

    const batchSize = 100;


    for (
        let i = 0;
        i < amount;
        i++
    ) {

        trainingStep(
            i % 10 === 0
        );


        if (
            i % batchSize === 0
        ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        0
                    )
            );

        }

    }


    training = false;


    trainButton.disabled = false;

    trainButton.textContent =
        "▶ Навчати";


    updateInterface();


    playSound(660);

}


// ============================================================
// RESET
// ============================================================

function resetExperiment() {

    training = false;

    round = 0;

    successful = 0;

    total = 0;


    createTables();


    document.getElementById(
        "conversation"
    ).innerHTML = `

        <div class="empty-message">

            Натисни «Навчати», щоб запустити експеримент.

        </div>

    `;


    updateInterface();


    playSound(330);

}


// ============================================================
// RANGE CONTROLS
// ============================================================

document
    .getElementById("learningRate")
    .addEventListener(
        "input",
        function () {

            learningRate =
                Number(this.value);


            document.getElementById(
                "learningValue"
            ).textContent =
                learningRate.toFixed(2);

        }
    );


document
    .getElementById("exploration")
    .addEventListener(
        "input",
        function () {

            exploration =
                Number(this.value);


            document.getElementById(
                "explorationValue"
            ).textContent =
                exploration.toFixed(2);

        }
    );


// ============================================================
// BUTTONS
// ============================================================

document
    .getElementById("trainBtn")
    .addEventListener(
        "click",
        train
    );


document
    .getElementById("stepBtn")
    .addEventListener(
        "click",
        function () {

            if (!training) {

                trainingStep(true);

                playSound(520);

            }

        }
    );


document
    .getElementById("resetBtn")
    .addEventListener(
        "click",
        resetExperiment
    );


document
    .getElementById("clearLogBtn")
    .addEventListener(
        "click",
        function () {

            document.getElementById(
                "conversation"
            ).innerHTML = `

                <div class="empty-message">

                    Журнал очищено.
                    Навчання не скинуто.

                </div>

            `;

        }
    );


// ============================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================

createTables();

renderVocabulary();

updateInterface();
