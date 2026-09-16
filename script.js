/*
    AI COUPLE LAB
    Яні Куронеко + Акіра Бакенеко

    Це локальна симуляція двох агентів.

    Важливо:
    - агенти не є свідомими істотами;
    - "пам'ять", "думки", "почуття" та "стосунки"
      тут є внутрішніми змінними моделі;
    - навчання відбувається через накопичення досвіду,
      зміну ваг поведінки та пам'яті.
*/


/* =========================================================
   1. ДАНІ ПЕРСОНАЖІВ
========================================================= */

const CHARACTERS = {

    akira: {
        id: "akira",
        name: "Акіра Бакенеко",
        gender: "чоловік",
        species: "людина",

        avatar:
            "https://blogger.googleusercontent.com/img/a/AVvXsEg6TLuKwTa6G7t32SgZE9RiJp5vLqOOqtC7lBHiLXIjBZOZAx1Dku1fWM8x_bc1lXwA1pF32pojhJW02L1BxI3oJfuvwBhC6i9Di0zPVQhzLcGslTae08Qe-4bRNEtHajGweOmDs9Snij-8QDCseC7KCckbjuGosEilTW3y2LxVSfdQ0WRgCTtt8us3ahI",

        personality: {
            warmth: 78,
            restraint: 76,
            curiosity: 69,
            patience: 82,
            persistence: 88,
            playfulness: 46
        },

        relationship: {
            affection: 82,
            trust: 48,
            closeness: 34
        },

        mood: "спокійний",

        thought:
            "Я не хочу поспішати. Але мені цікаво, що вона зараз думає.",

        memory: [
            "Яні привернула мою увагу ще під час нашого першого знайомства.",
            "Я відчув до неї почуття раніше, ніж вона до мене.",
            "Я хочу поступово стати для неї близькою людиною."
        ],

        learning: {
            likedTopics: {},
            successfulActions: {},
            learnedWords: {}
        }
    },


    yani: {
        id: "yani",
        name: "Яні Куронеко",
        gender: "жінка",
        species: "котолюда",

        avatar:
            "https://blogger.googleusercontent.com/img/a/AVvXsEgkPXEo9bsccA1-IIT-KUyEuAKqHDr_TqUk-nmd4oksI3rhDnHSdk6f5W33CTttxhY2F1iowhoRqtd-PumQD7mnkhODarmDRto8UmhRwQuGaEAgSmC26uPA7euxu72oZ0wYTV6ALPHLEULM94dQodtfoq9TC7kXm8Zen1OY2zuAUvcdWQxnXvrgNyQw9WE",

        personality: {
            warmth: 54,
            restraint: 63,
            curiosity: 73,
            patience: 48,
            persistence: 51,
            playfulness: 81
        },

        relationship: {
            affection: 24,
            trust: 32,
            closeness: 19
        },

        mood: "насторожена",

        thought:
            "Він цікавий. Але я поки не хочу робити поспішних висновків.",

        memory: [
            "Спочатку Акіра не здавався мені особливо важливим.",
            "Я помітила, що він поводиться зі мною уважніше, ніж з іншими.",
            "Мені цікаво спостерігати, як він поводиться далі."
        ],

        learning: {
            likedTopics: {},
            successfulActions: {},
            learnedWords: {}
        }
    }
};


/* =========================================================
   2. ФОТОГРАФІЇ
========================================================= */

const PHOTOS = {

    winter: {
        url:
            "https://blogger.googleusercontent.com/img/a/AVvXsEhTyb0qZmY95aWq6-RakR54gOYNpE9hEWR16cSyC1XoQEgwIXqo5vQ-PsEfa76HQVLXePooxZh9gZHVp06fZLNqN-OHXJxdXAEj0IJjrxPUXtFCO20FM63jRHEbE4-Vgn5qu7_inw74ZWajseRcLju5-E445F77V-orWlPr8ISSWq0c8BRMbODHxhNJKeM",
        description: "Зимове побачення у місті"
    },

    summer: {
        url:
            "https://blogger.googleusercontent.com/img/a/AVvXsEifDJmwK8i6s316LVL00g3Y-qkoJO2MacdIOjnUipglD1asNptF_Q6xGaJgfQszPce2lvV-pscnmLk2pc-l_pytcB8vSS-SnRFV6kY36_U7PmvcqGNLG7ZY-7DqpGfgBPM6i2CtqpJbxFWv_q78LfybAZRo8paMbIFPHe9uOORE_22wI6ynNWEU-mquax4",
        description: "Літнє побачення у селі"
    }
};


/* =========================================================
   3. СТАН СИМУЛЯЦІЇ
========================================================= */

let state = {

    running: false,

    day: 1,

    turn: 0,

    activeSpeaker: "akira",

    messageCount: 0,

    relationship: {
        love: 53,
        trust: 40,
        closeness: 28,
        tension: 4
    },

    sharedMemory: [
        {
            text: "Вони познайомилися.",
            importance: 0.9
        },
        {
            text: "Акіра першим відчув романтичний інтерес.",
            importance: 0.95
        },
        {
            text: "Яні поступово почала помічати його увагу.",
            importance: 0.75
        }
    ],

    learnedProtocol: {
        "mi-su": {
            meaning: "тепло",
            strength: 0.35
        },

        "ya-ya": {
            meaning: "так",
            strength: 0.25
        },

        "ba-ko": {
            meaning: "разом",
            strength: 0.30
        }
    },

    eventLog: []
};


/* =========================================================
   4. ПОЧАТКОВІ ФРАЗИ
========================================================= */

const PHRASES = {

    akira: {

        neutral: [
            "Як минув твій день?",
            "Я сьогодні згадав наше зимове побачення.",
            "Мені цікаво, що тобі зараз хочеться робити.",
            "Ти сьогодні якась задумлива.",
            "Можемо просто трохи поговорити."
        ],

        warm: [
            "Мені подобається проводити з тобою час.",
            "Я радий, що ми знову говоримо.",
            "З тобою навіть звичайний день здається цікавішим.",
            "Я пам'ятаю багато дрібниць про тебе.",
            "Мені хочеться бути поруч."
        ],

        romantic: [
            "Іноді мені важко приховувати, наскільки ти мені подобаєшся.",
            "Я справді дуже до тебе прив'язався.",
            "Я хочу, щоб у нас було ще багато таких спогадів.",
            "Мені добре, коли ти поруч.",
            "Я не знаю, чи часто це кажу, але ти для мене важлива."
        ]
    },


    yani: {

        neutral: [
            "Нормально. А в тебе?",
            "Я якраз думала про те, що ми давно не говорили.",
            "Цікаво, що ти сьогодні згадаєш.",
            "Мені подобається спостерігати за тобою.",
            "Можемо поговорити."
        ],

        warm: [
            "Мені теж подобається бути поруч із тобою.",
            "Ти став для мене важливішим, ніж я спочатку думала.",
            "Я добре пам'ятаю наше побачення.",
            "Мені подобається, коли ти так зі мною говориш.",
            "Я рада, що ми познайомилися."
        ],

        romantic: [
            "Мабуть, я вже не можу сказати, що ти мені байдужий.",
            "Я теж дуже до тебе звикла.",
            "Мені хочеться, щоб ми частіше були разом.",
            "Я іноді думаю про тебе, коли тебе немає поруч.",
            "Мені з тобою добре."
        ]
    }
};


/* =========================================================
   5. DOM
========================================================= */

const $ = id => document.getElementById(id);

$("akiraAvatar").src = CHARACTERS.akira.avatar;
$("yaniState").innerHTML = "";
$("akiraState").innerHTML = "";

$("winterPhoto").src = PHOTOS.winter.url;
$("summerPhoto").src = PHOTOS.summer.url;


/* =========================================================
   6. ДОПОМІЖНІ ФУНКЦІЇ
========================================================= */

function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}


function random(min, max) {
    return Math.random() * (max - min) + min;
}


function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}


function average(...values) {
    return values.reduce((a, b) => a + b, 0) / values.length;
}


function chooseMood(agent) {

    const r = agent.relationship;
    const globalLove = state.relationship.love;

    if (r.affection > 80 || globalLove > 82) {
        return "дуже закоханий";
    }

    if (r.affection > 60 || globalLove > 65) {
        return "теплий";
    }

    if (r.affection > 40 || globalLove > 48) {
        return "зацікавлений";
    }

    if (state.relationship.tension > 55) {
        return "напружений";
    }

    return agent.id === "yani"
        ? "насторожена"
        : "спокійний";
}


function relationshipLabel() {

    const love = state.relationship.love;
    const trust = state.relationship.trust;
    const closeness = state.relationship.closeness;

    if (
        love >= 85 &&
        trust >= 75 &&
        closeness >= 75
    ) {
        return "дуже близька пара";
    }

    if (
        love >= 70 &&
        trust >= 60 &&
        closeness >= 55
    ) {
        return "закохана пара";
    }

    if (
        love >= 55 &&
        trust >= 45 &&
        closeness >= 35
    ) {
        return "романтичні стосунки";
    }

    if (
        love >= 40 &&
        trust >= 35
    ) {
        return "взаємна симпатія";
    }

    return "знайомі";
}


/* =========================================================
   7. НАВЧАННЯ
========================================================= */

function learn(agent, action, reward) {

    if (!agent.learning.successfulActions[action]) {
        agent.learning.successfulActions[action] = 0;
    }

    agent.learning.successfulActions[action] += reward;

    /*
        Якщо дія кілька разів виявилася позитивною,
        агент частіше використовуватиме її в майбутньому.
    */
}


function remember(agent, text, importance = 0.5) {

    agent.memory.push(text);

    /*
        Не дозволяємо пам'яті нескінченно рости.
        Найважливіші спогади залишаються.
    */
    if (agent.memory.length > 15) {

        agent.memory.sort(
            () => Math.random() - 0.5
        );

        agent.memory =
            agent.memory.slice(-12);
    }
}


function sharedRemember(text, importance = 0.5) {

    state.sharedMemory.push({
        text,
        importance
    });

    state.sharedMemory.sort(
        (a, b) => b.importance - a.importance
    );

    if (state.sharedMemory.length > 20) {
        state.sharedMemory =
            state.sharedMemory.slice(0, 20);
    }
}


/* =========================================================
   8. ВЛАСНА МОВА / ПРОТОКОЛ
========================================================= */

function createNewWord() {

    const partsA = [
        "ba", "ka", "mi", "ya",
        "su", "no", "ra", "ki",
        "lu", "ta", "mo", "shi"
    ];

    const partsB = [
        "ko", "su", "na", "ri",
        "mi", "ya", "to", "ku",
        "se", "la", "mo", "ni"
    ];

    let word =
        randomItem(partsA) +
        "-" +
        randomItem(partsB);

    /*
        Іноді слово стає довшим.
    */

    if (Math.random() < 0.28) {
        word += "-" + randomItem(partsB);
    }

    return word;
}


function learnProtocolWord() {

    const word = createNewWord();

    if (!state.learnedProtocol[word]) {

        const meanings = [
            "тепло",
            "разом",
            "так",
            "пам'ять",
            "поруч",
            "згода",
            "сум",
            "радість",
            "зустріч",
            "думка",
            "довіра",
            "чекати"
        ];

        state.learnedProtocol[word] = {
            meaning: randomItem(meanings),
            strength: 0.1
        };

        addEvent(
            `Агенти створили нову комбінацію «${word}».`
        );

    } else {

        state.learnedProtocol[word].strength =
            clamp(
                state.learnedProtocol[word].strength +
                random(0.02, 0.12)
            );
    }

    return word;
}


function useProtocolWord() {

    const words =
        Object.keys(state.learnedProtocol);

    if (!words.length) {
        return null;
    }

    /*
        Чим сильніше слово вивчене,
        тим більша ймовірність його використання.
    */

    const weighted = [];

    words.forEach(word => {

        const strength =
            state.learnedProtocol[word].strength;

        const count =
            Math.max(1, Math.floor(strength * 10));

        for (let i = 0; i < count; i++) {
            weighted.push(word);
        }
    });

    return randomItem(weighted);
}


/* =========================================================
   9. ВИБІР ТИПУ РЕПЛІКИ
========================================================= */

function chooseTone(agent) {

    const love = state.relationship.love;

    if (
        love > 78 &&
        Math.random() <
        agent.personality.warmth / 130
    ) {
        return "romantic";
    }

    if (
        love > 50 &&
        Math.random() <
        agent.personality.warmth / 100
    ) {
        return "warm";
    }

    return "neutral";
}


/* =========================================================
   10. ГЕНЕРАЦІЯ ПОВІДОМЛЕННЯ
========================================================= */

function generateMessage(agent) {

    const tone = chooseTone(agent);

    let message =
        randomItem(PHRASES[agent.id][tone]);


    /*
        Іноді агент використовує
        власну вивчену комбінацію.
    */

    if (
        Math.random() < 0.22 +
        state.relationship.closeness / 500
    ) {

        const word = useProtocolWord();

        if (word) {

            const meaning =
                state.learnedProtocol[word].meaning;

            const endings = {

                "тепло": [
                    ` ${word}.`,
                    ` Я називаю це «${word}».`,
                    ` ${word}...`
                ],

                "разом": [
                    ` ${word}.`,
                    ` Мабуть, це наше «${word}».`
                ],

                "так": [
                    ` ${word}.`,
                    ` ${word}!`
                ],

                "пам'ять": [
                    ` Я це пам'ятаю. ${word}.`
                ],

                "поруч": [
                    ` Хочу бути поруч. ${word}.`
                ],

                "згода": [
                    ` ${word}. Я згодна.`,
                    ` ${word}. Я згоден.`
                ],

                "радість": [
                    ` ${word}! Мені подобається цей стан.`
                ],

                "довіра": [
                    ` ${word}. Я тобі довіряю.`
                ],

                "чекати": [
                    ` Я буду чекати. ${word}.`
                ]
            };

            if (endings[meaning]) {
                message += randomItem(endings[meaning]);
            }
        }
    }


    return message;
}


/* =========================================================
   11. РЕАКЦІЯ НА СПІЛКУВАННЯ
========================================================= */

function processInteraction(speaker, listener, message) {

    let trustChange = random(0.3, 1.5);
    let closenessChange = random(0.2, 1.3);
    let loveChange = random(0.1, 0.9);

    const romanticWords = [
        "подоба",
        "люб",
        "важлив",
        "разом",
        "поруч",
        "добре",
        "звик",
        "звикла"
    ];

    const isRomantic =
        romanticWords.some(word =>
            message.toLowerCase().includes(word)
        );

    if (isRomantic) {

        loveChange +=
            random(0.4, 1.7);

        closenessChange +=
            random(0.4, 1.4);
    }


    /*
        Яні розвиває почуття поступово.
        На ранніх етапах її реакція слабша.
    */

    if (
        listener.id === "yani" &&
        state.relationship.love < 55
    ) {
        loveChange *= 0.45;
    }


    /*
        Якщо напруга висока,
        позитивний ефект зменшується.
    */

    const tensionPenalty =
        state.relationship.tension / 130;

    trustChange *= 1 - tensionPenalty;
    closenessChange *= 1 - tensionPenalty;


    state.relationship.trust =
        clamp(
            state.relationship.trust +
            trustChange
        );

    state.relationship.closeness =
        clamp(
            state.relationship.closeness +
            closenessChange
        );

    state.relationship.love =
        clamp(
            state.relationship.love +
            loveChange
        );


    speaker.relationship.affection =
        clamp(
            speaker.relationship.affection +
            loveChange * .6
        );

    listener.relationship.affection =
        clamp(
            listener.relationship.affection +
            loveChange * .8
        );

    speaker.relationship.trust =
        clamp(
            speaker.relationship.trust +
            trustChange * .5
        );

    listener.relationship.trust =
        clamp(
            listener.relationship.trust +
            trustChange * .6
        );

    speaker.relationship.closeness =
        clamp(
            speaker.relationship.closeness +
            closenessChange * .5
        );

    listener.relationship.closeness =
        clamp(
            listener.relationship.closeness +
            closenessChange * .6
        );


    learn(
        speaker,
        "спілкування",
        loveChange + trustChange
    );

    learn(
        listener,
        "відповідати",
        trustChange
    );


    /*
        Поступове формування спільної ідентичності пари.
    */

    if (
        state.relationship.love > 65 &&
        state.relationship.trust > 55
    ) {

        sharedRemember(
            `${speaker.name} і ${listener.name} провели час разом.`,
            .55
        );
    }


    if (
        state.relationship.love > 80 &&
        state.relationship.closeness > 70
    ) {

        sharedRemember(
            "Вони дедалі сильніше сприймають себе як пару.",
            .95
        );
    }
}


/* =========================================================
   12. ДОДАВАННЯ ПОВІДОМЛЕННЯ В ЧАТ
========================================================= */

function addMessage(agent, text) {

    const chat = $("chat");

    const message = document.createElement("div");

    message.className =
        "message " + agent.id;

    const name =
        document.createElement("div");

    name.className = "message-name";
    name.textContent = agent.name;

    const body =
        document.createElement("div");

    body.className = "message-text";
    body.textContent = text;

    const time =
        document.createElement("div");

    time.className = "message-time";

    time.textContent =
        `день ${state.day} · крок ${state.turn}`;

    message.appendChild(name);
    message.appendChild(body);
    message.appendChild(time);

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;

    state.messageCount++;

    $("messageCount").textContent =
        `${state.messageCount} повідомлень`;
}


/* =========================================================
   13. ПОДІЇ
========================================================= */

function addEvent(text) {

    state.eventLog.unshift({
        day: state.day,
        text
    });

    if (state.eventLog.length > 25) {
        state.eventLog =
            state.eventLog.slice(0, 25);
    }
}


/* =========================================================
   14. АВТОНОМНИЙ КРОК
========================================================= */

function simulationStep() {

    state.turn++;

    /*
        День проходить приблизно
        після декількох кроків.
    */

    if (state.turn % 8 === 0) {

        state.day++;

        /*
            Невелике природне коливання.
        */

        state.relationship.tension =
            clamp(
                state.relationship.tension +
                random(-4, 4)
            );

        /*
            Після тривалого позитивного досвіду
            напруга поступово спадає.
        */

        if (
            state.relationship.love > 60
        ) {
            state.relationship.tension =
                clamp(
                    state.relationship.tension -
                    random(0, 2)
                );
        }
    }


    const speaker =
        state.activeSpeaker === "akira"
            ? CHARACTERS.akira
            : CHARACTERS.yani;

    const listener =
        state.activeSpeaker === "akira"
            ? CHARACTERS.yani
            : CHARACTERS.akira;


    /*
        У певних ситуаціях агенти можуть
        просто думати, а не говорити.
    */

    if (Math.random() < 0.13) {

        speaker.thought =
            generateThought(speaker);

        addEvent(
            `${speaker.name} деякий час мовчить і думає.`
        );

    } else {

        const message =
            generateMessage(speaker);

        addMessage(speaker, message);

        processInteraction(
            speaker,
            listener,
            message
        );

        speaker.thought =
            generateThought(speaker);
    }


    /*
        Іноді вони створюють нову
        власну мовну конструкцію.
    */

    if (Math.random() < 0.13) {
        learnProtocolWord();
    }


    /*
        Фотографії можуть згадуватися
        як спільні спогади.
    */

    if (Math.random() < 0.07) {

        const photo =
            Math.random() < .5
                ? PHOTOS.winter
                : PHOTOS.summer;

        sharedRemember(
            `Спільний спогад: ${photo.description}.`,
            .85
        );

        addEvent(
            `${speaker.name} згадав(ла) спільну фотографію.`
        );
    }


    state.activeSpeaker =
        state.activeSpeaker === "akira"
            ? "yani"
            : "akira";


    updateUI();
    saveState();
}


/* =========================================================
   15. ДУМКИ
========================================================= */

function generateThought(agent) {

    const love =
        state.relationship.love;

    const trust =
        state.relationship.trust;

    const closeness =
        state.relationship.closeness;


    if (agent.id === "akira") {

        if (love > 80) {

            return randomItem([
                "Я хочу, щоб Яні знала, наскільки вона для мене важлива.",
                "Мені здається, ми вже справді стали дуже близькими.",
                "Я не хочу приховувати свої почуття від неї.",
                "Я хочу створювати з нею нові спогади."
            ]);
        }

        if (love > 60) {

            return randomItem([
                "Я відчуваю, що між нами щось змінюється.",
                "Мені дедалі легше бути відкритим із Яні.",
                "Цікаво, чи вона відчуває те саме.",
                "Хочу не поспішати, але й не віддалятися."
            ]);
        }

        return randomItem([
            "Я хочу поступово заслужити її довіру.",
            "Мені краще не тиснути на неї.",
            "Яні мені подобається. Але я можу бути терплячим.",
            "Цікаво, коли вона сама почне проявляти ініціативу."
        ]);
    }


    if (love > 80) {

        return randomItem([
            "Я вже не сприймаю Акіру просто як знайомого.",
            "Мені хочеться проводити з ним більше часу.",
            "Я справді до нього прив'язалася.",
            "Мені добре, коли він поруч."
        ]);
    }

    if (love > 55) {

        return randomItem([
            "Акіра став для мене важливішим.",
            "Мені подобається його увага.",
            "Я вже не така байдужа до нього, як спочатку.",
            "Мабуть, я починаю сумувати, коли його немає."
        ]);
    }

    return randomItem([
        "Я поки що хочу просто спостерігати.",
        "Він мені цікавий, але я не хочу поспішати.",
        "Акіра поводиться терпляче.",
        "Можливо, варто дати нашим стосункам розвиватися самим."
    ]);
}


/* =========================================================
   16. ВИПАДКОВІ ПОДІЇ
========================================================= */

function randomEvent() {

    const events = [

        {
            text:
                "Вони випадково згадали зимове побачення.",
            effect: () => {
                state.relationship.closeness += 3;
                state.relationship.love += 2;

                sharedRemember(
                    "Вони разом згадали зимове побачення.",
                    .9
                );
            }
        },

        {
            text:
                "Яні розповіла Акірі щось особисте.",
            effect: () => {
                state.relationship.trust += 5;
                state.relationship.closeness += 3;

                remember(
                    CHARACTERS.akira,
                    "Яні довірила мені особисту річ.",
                    .9
                );
            }
        },

        {
            text:
                "Акіра підтримав Яні, коли вона була втомлена.",
            effect: () => {
                state.relationship.trust += 4;
                state.relationship.love += 2;

                remember(
                    CHARACTERS.yani,
                    "Акіра підтримав мене, коли я була втомлена.",
                    .9
                );
            }
        },

        {
            text:
                "Вони разом переглянули літню фотографію.",
            effect: () => {
                state.relationship.closeness += 4;
                state.relationship.love += 2;

                sharedRemember(
                    "Вони разом переглянули літню фотографію.",
                    .85
                );
            }
        },

        {
            text:
                "Вони трохи не зрозуміли одне одного.",
            effect: () => {
                state.relationship.tension += 8;
                state.relationship.trust -= 1;
            }
        },

        {
            text:
                "Яні сама першою почала розмову.",
            effect: () => {

                state.relationship.closeness += 4;
                state.relationship.love += 3;

                remember(
                    CHARACTERS.akira,
                    "Цього разу Яні сама першою почала розмову.",
                    .9
                );
            }
        },

        {
            text:
                "Акіра вирішив не приховувати свою прихильність.",
            effect: () => {

                state.relationship.love += 4;
                state.relationship.closeness += 2;

                remember(
                    CHARACTERS.yani,
                    "Акіра відкритіше показав свою прихильність.",
                    .85
                );
            }
        }

    ];


    const event =
        randomItem(events);

    event.effect();

    state.relationship.love =
        clamp(state.relationship.love);

    state.relationship.trust =
        clamp(state.relationship.trust);

    state.relationship.closeness =
        clamp(state.relationship.closeness);

    state.relationship.tension =
        clamp(state.relationship.tension);


    addEvent(event.text);

    updateUI();
    saveState();
}


/* =========================================================
   17. UI
========================================================= */

function setBar(id, value) {
    $(id).style.width =
        `${clamp(value)}%`;
}


function updateAgentUI(agent) {

    const prefix =
        agent.id === "akira"
            ? "akira"
            : "yani";


    /*
        Оскільки для Яні немає окремої
        лівої картки, її інформація
        показується у спостерігачі.
    */

    if (agent.id === "akira") {

        setBar(
            "akiraAffectionBar",
            agent.relationship.affection
        );

        setBar(
            "akiraTrustBar",
            agent.relationship.trust
        );

        setBar(
            "akiraClosenessBar",
            agent.relationship.closeness
        );

        $("akiraAffection").textContent =
            Math.round(agent.relationship.affection);

        $("akiraTrust").textContent =
            Math.round(agent.relationship.trust);

        $("akiraCloseness").textContent =
            Math.round(agent.relationship.closeness);

        $("akiraMood").textContent =
            agent.mood;

        $("akiraThought").textContent =
            agent.thought;


        $("akiraMemory").innerHTML =
            agent.memory
                .slice(-8)
                .reverse()
                .map(memory =>
                    `<div class="memory-item">${escapeHTML(memory)}</div>`
                )
                .join("");
    }
}


function updateObserverAgent(agent) {

    const element =
        agent.id === "akira"
            ? $("akiraState")
            : $("yaniState");

    element.innerHTML = `

        <div class="state-line">
            <span>Настрій</span>
            <span>${escapeHTML(agent.mood)}</span>
        </div>

        <div class="state-line">
            <span>Прихильність</span>
            <span>${Math.round(agent.relationship.affection)}</span>
        </div>

        <div class="state-line">
            <span>Довіра</span>
            <span>${Math.round(agent.relationship.trust)}</span>
        </div>

        <div class="state-line">
            <span>Близькість</span>
            <span>${Math.round(agent.relationship.closeness)}</span>
        </div>

        <div class="state-line">
            <span>Спогадів</span>
            <span>${agent.memory.length}</span>
        </div>
    `;
}


function updateProtocolUI() {

    const container =
        $("learnedWords");

    const words =
        Object.entries(
            state.learnedProtocol
        );

    container.innerHTML =
        words
            .sort(
                (a, b) =>
                    b[1].strength -
                    a[1].strength
            )
            .map(
                ([word, data]) => `
                    <span
                        class="word"
                        title="сила: ${data.strength.toFixed(2)}"
                    >
                        ${escapeHTML(word)}
                    </span>
                `
            )
            .join("");
}


function updateEventsUI() {

    $("eventLog").innerHTML =
        state.eventLog
            .slice(0, 12)
            .map(event => `
                <div class="event">
                    <div class="event-time">
                        День ${event.day}
                    </div>
                    ${escapeHTML(event.text)}
                </div>
            `)
            .join("");
}


function updateUI() {

    const relationship =
        state.relationship;


    /*
        Центральні параметри
    */

    $("loveValue").textContent =
        Math.round(relationship.love);

    $("trustValue").textContent =
        Math.round(relationship.trust);

    $("closenessValue").textContent =
        Math.round(relationship.closeness);

    $("tensionValue").textContent =
        Math.round(relationship.tension);

    $("relationshipState").textContent =
        relationshipLabel();

    $("dayCounter").textContent =
        state.day;


    /*
        Серце стає помітнішим
        при зростанні любові.
    */

    $("heart").style.transform =
        `scale(${1 + relationship.love / 400})`;


    CHARACTERS.akira.mood =
        chooseMood(CHARACTERS.akira);

    CHARACTERS.yani.mood =
        chooseMood(CHARACTERS.yani);


    updateAgentUI(
        CHARACTERS.akira
    );

    updateObserverAgent(
        CHARACTERS.akira
    );

    updateObserverAgent(
        CHARACTERS.yani
    );

    updateProtocolUI();
    updateEventsUI();


    $("simulationStatus").textContent =
        state.running
            ? "Працює"
            : "Пауза";

    $("statusDot").className =
        state.running
            ? "status-dot running"
            : "status-dot paused";
}


/* =========================================================
   18. БЕЗПЕЧНЕ ВИВЕДЕННЯ ТЕКСТУ
========================================================= */

function escapeHTML(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   19. ЗБЕРЕЖЕННЯ
========================================================= */

function saveState() {

    const data = {

        state,

        akira: CHARACTERS.akira,

        yani: CHARACTERS.yani
    };

    localStorage.setItem(
        "aiCoupleLabSave",
        JSON.stringify(data)
    );
}


function loadState() {

    const raw =
        localStorage.getItem(
            "aiCoupleLabSave"
        );

    if (!raw) {
        return false;
    }

    try {

        const data =
            JSON.parse(raw);

        if (data.state) {
            state = data.state;
        }

        if (data.akira) {
            Object.assign(
                CHARACTERS.akira,
                data.akira
            );
        }

        if (data.yani) {
            Object.assign(
                CHARACTERS.yani,
                data.yani
            );
        }

        return true;

    } catch (error) {

        console.error(
            "Помилка завантаження:",
            error
        );

        return false;
    }
}


/* =========================================================
   20. RESET
========================================================= */

function resetSimulation() {

    if (
        !confirm(
            "Скинути весь прогрес експерименту?"
        )
    ) {
        return;
    }

    localStorage.removeItem(
        "aiCoupleLabSave"
    );

    location.reload();
}


/* =========================================================
   21. КЕРУВАННЯ СИМУЛЯЦІЄЮ
========================================================= */

let timer = null;

let speedSeconds = 4;


function startSimulation() {

    if (state.running) {
        return;
    }

    state.running = true;

    timer = setInterval(
        simulationStep,
        speedSeconds * 1000
    );

    updateUI();
}


function pauseSimulation() {

    state.running = false;

    if (timer) {
        clearInterval(timer);
        timer = null;
    }

    updateUI();
}


function restartTimer() {

    if (!state.running) {
        return;
    }

    if (timer) {
        clearInterval(timer);
    }

    timer = setInterval(
        simulationStep,
        speedSeconds * 1000
    );
}


/* =========================================================
   22. КНОПКИ
========================================================= */

$("startBtn").addEventListener(
    "click",
    startSimulation
);

$("pauseBtn").addEventListener(
    "click",
    pauseSimulation
);

$("stepBtn").addEventListener(
    "click",
    () => {

        if (state.running) {
            pauseSimulation();
        }

        simulationStep();
    }
);

$("eventBtn").addEventListener(
    "click",
    randomEvent
);

$("resetBtn").addEventListener(
    "click",
    resetSimulation
);


$("speed").addEventListener(
    "input",
    event => {

        const value =
            Number(event.target.value);

        /*
            Слайдер:
            1 = швидко
            10 = повільно
        */

        speedSeconds =
            value;

        $("speedLabel").textContent =
            `${value} сек.`;

        restartTimer();
    }
);


/* =========================================================
   23. ЗАВАНТАЖЕННЯ
========================================================= */

loadState();

updateUI();


/*
    Початковий запис у журнал,
    якщо це перший запуск.
*/

if (
    state.eventLog.length === 0
) {

    addEvent(
        "Експеримент розпочато. Агенти отримали початкові спогади."
    );

    addEvent(
        "Акіра вже має сильну прихильність до Яні."
    );

    addEvent(
        "Яні починає експеримент із нижчим рівнем прихильності."
    );

    addEvent(
        "Спільні фотографії додані до пам'яті пари."
    );

    saveState();

    updateUI();
}