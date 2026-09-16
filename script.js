// =========================================================
// AI COUPLE LAB
// Основна логіка симуляції
// =========================================================


// =========================================================
// НАЛАШТУВАННЯ
// =========================================================

const STORAGE_KEY = "ai_couple_lab_state_v3";


// =========================================================
// АВАТАРКИ
// =========================================================

const AKIRA_AVATAR =
"https://blogger.googleusercontent.com/img/a/AVvXsEg6TLuKwTa6G7t32SgZE9RiJp5vLqOOqtC7lBHiLXIjBZOZAx1Dku1fWM8x_bc1lXwA1pF32pojhJW02L1BxI3oJfuvwBhC6i9Di0zPVQhzLcGslTae08Qe-4bRNEtHajGweOmDs9Snij-8QDCseC7KCckbjuGosEilTW3y2LxVSfdQ0WRgCTtt8us3ahI";

const YANI_AVATAR =
"https://blogger.googleusercontent.com/img/a/AVvXsEgkPXEo9bsccA1-IIT-KUyEuAKqHDr_TqUk-nmd4oksI3rhDnHSdk6f5W33CTttxhY2F1iowhoRqtd-PumQD7mnkhODarmDRto8UmhRwQuGaEAgSmC26uPA7euxu72oZ0wYTV6ALPHLEULM94dQodtfoq9TC7kXm8Zen1OY2zuAUvcdWQxnXvrgNyQw9WE";

const WINTER_PHOTO =
"https://blogger.googleusercontent.com/img/a/AVvXsEhTyb0qZmY95aWq6-RakR54gOYNpE9hEWR16cSyC1XoQEgwIXqo5vQ-PsEfa76HQVLXePooxZh9gZHVp06fZLNqN-OHXJxdXAEj0IJjrxPUXtFCO20FM63jRHEbE4-Vgn5qu7_inw74ZWajseRcLju5-E445F77V-orWlPr8ISSWq0c8BRMbODHxhNJKeM";

const SUMMER_PHOTO =
"https://blogger.googleusercontent.com/img/a/AVvXsEifDJmwK8i6s316LVL00g3Y-qkoJO2MacdIOjnUipglD1asNptF_Q6xGaJgfQszPce2lvV-pscnmLk2pc-l_pytcB8vSS-SnRFV6kY36_U7PmvcqGNLG7ZY-7DqpGfgBPM6i2CtqpJbxFWv_q78LfybAZRo8paMbIFPHe9uOORE_22wI6ynNWEU-mquax4";


// =========================================================
// ПОЧАТКОВИЙ СТАН
// =========================================================

function createInitialState() {

    return {

        turn: 0,

        agents: {

            akira: {

                name: "Акіра Бакенеко",

                gender: "чоловік",

                species: "людина",

                avatar: AKIRA_AVATAR,

                privateMemory: [],

                beliefs: [],

                relationshipView: "знайомі",

                mood: "спокійний",

                candidate: null
            },

            yani: {

                name: "Яні Куронеко",

                gender: "жінка",

                species: "людиноподібна кішка",

                avatar: YANI_AVATAR,

                privateMemory: [],

                beliefs: [],

                relationshipView: "знайомі",

                mood: "спокійна",

                candidate: null
            }
        },

        relationship: {

            love: 0,

            trust: 20,

            closeness: 10,

            tension: 0,

            identity: "знайомі"
        },

        sharedMemories: [],

        conversation: [],

        protocol: {

            confirmedTerms: [],

            candidates: []
        },

        currentEvent: null
    };
}


// =========================================================
// ЗАВАНТАЖЕННЯ / ЗБЕРЕЖЕННЯ
// =========================================================

let state = loadState();


function loadState() {

    try {

        const saved =
            localStorage.getItem(STORAGE_KEY);

        if (!saved) {

            return createInitialState();
        }

        const parsed =
            JSON.parse(saved);

        return normalizeState(parsed);

    } catch (error) {

        console.error(
            "Помилка завантаження стану:",
            error
        );

        return createInitialState();
    }
}


function normalizeState(saved) {

    const initial =
        createInitialState();

    if (!saved || typeof saved !== "object") {

        return initial;
    }

    return {

        ...initial,

        ...saved,

        agents: {

            ...initial.agents,

            ...(saved.agents || {}),

            akira: {

                ...initial.agents.akira,

                ...(saved.agents?.akira || {})
            },

            yani: {

                ...initial.agents.yani,

                ...(saved.agents?.yani || {})
            }
        },

        relationship: {

            ...initial.relationship,

            ...(saved.relationship || {})
        },

        protocol: {

            ...initial.protocol,

            ...(saved.protocol || {})
        },

        sharedMemories:
            Array.isArray(saved.sharedMemories)
                ? saved.sharedMemories
                : [],

        conversation:
            Array.isArray(saved.conversation)
                ? saved.conversation
                : []
    };
}


function saveState() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

    } catch (error) {

        console.error(
            "Помилка збереження стану:",
            error
        );
    }
}


// =========================================================
// ДОПОМІЖНІ ФУНКЦІЇ
// =========================================================

function clamp(
    value,
    min = 0,
    max = 100
) {

    return Math.max(
        min,
        Math.min(max, value)
    );
}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =========================================================
// ПОДІЇ
// =========================================================

function createEvent() {

    const events = [

        {
            title:
                "Несподівана прогулянка",

            description:
                "Вони випадково опинилися разом на тихій вулиці міста."
        },

        {
            title:
                "Стара фотографія",

            description:
                "Їм трапилася стара фотографія, яка викликала розмову про минуле."
        },

        {
            title:
                "Тихий вечір",

            description:
                "Вони проводять спокійний вечір без конкретних планів."
        },

        {
            title:
                "Місце з видом на місто",

            description:
                "Вони знайшли місце, звідки добре видно вечірнє місто."
        },

        {
            title:
                "Маленька дрібниця",

            description:
                "Один із них помітив маленьку деталь, яку інший міг би не помітити."
        },

        {
            title:
                "Зимовий вечір",

            description:
                "На вулиці холодно, тому вони шукають затишне місце, де можна побути разом."
        },

        {
            title:
                "Літня поїздка",

            description:
                "Вони опинилися за містом у теплий літній день."
        }
    ];

    return events[
        Math.floor(
            state.turn / 5
        ) % events.length
    ];
}


// =========================================================
// ВЗАЄМОВІДНОСИНИ
// =========================================================

function applyRelationshipDelta(delta) {

    if (!delta) {

        return;
    }

    const keys = [
        "love",
        "trust",
        "closeness",
        "tension"
    ];

    for (const key of keys) {

        const amount =
            Number(delta[key]) || 0;

        state.relationship[key] =
            clamp(
                state.relationship[key] +
                amount
            );
    }
}


function updateRelationshipIdentity() {

    const akira =
        state.agents.akira.relationshipView;

    const yani =
        state.agents.yani.relationshipView;

    const r =
        state.relationship;


    // Пара тільки якщо ОБИДВА
    // незалежно бачать себе парою.

    if (

        akira === "пара" &&

        yani === "пара" &&

        r.love >= 62 &&

        r.trust >= 55 &&

        r.closeness >= 50

    ) {

        r.identity = "пара";

        return;
    }


    if (

        akira === "романтичний інтерес" ||

        yani === "романтичний інтерес" ||

        akira === "пара" ||

        yani === "пара"

    ) {

        r.identity =
            "романтичний інтерес";

        return;
    }


    if (

        akira === "симпатія" ||

        yani === "симпатія"

    ) {

        r.identity =
            "симпатія";

        return;
    }


    r.identity =
        "знайомі";
}


// =========================================================
// ПРИВАТНА ПАМ'ЯТЬ
// =========================================================

function addPrivateMemories(
    agentKey,
    memories
) {

    if (!Array.isArray(memories)) {

        return;
    }

    const target =
        state.agents[agentKey].privateMemory;


    for (const memory of memories) {

        if (

            typeof memory !== "string" ||

            !memory.trim()

        ) {

            continue;
        }


        const clean =
            memory.trim();


        if (!target.includes(clean)) {

            target.push(clean);
        }
    }


    state.agents[agentKey]
        .privateMemory =
        target.slice(-50);
}


function addBelief(
    agentKey,
    belief
) {

    if (

        typeof belief !== "string" ||

        !belief.trim()

    ) {

        return;
    }


    const clean =
        belief.trim();


    const beliefs =
        state.agents[agentKey].beliefs;


    if (!beliefs.includes(clean)) {

        beliefs.push(clean);
    }


    state.agents[agentKey].beliefs =
        beliefs.slice(-50);
}


// =========================================================
// ПРОТОКОЛ ВЛАСНИХ СЛІВ
// =========================================================

function updateProtocol(
    agentKey,
    proposal
) {

    if (!proposal) {

        return;
    }


    const term =
        String(proposal.term || "")
            .trim();

    const meaning =
        String(proposal.meaning || "")
            .trim();


    if (!term || !meaning) {

        return;
    }


    const existing =
        state.protocol.candidates.find(
            candidate =>
                candidate.term
                    .toLowerCase() ===
                term.toLowerCase()
        );


    if (existing) {

        if (!existing.agents.includes(agentKey)) {

            existing.agents.push(
                agentKey
            );
        }


        if (

            existing.agents.includes("akira") &&

            existing.agents.includes("yani")

        ) {

            const alreadyConfirmed =
                state.protocol.confirmedTerms
                    .some(
                        existingTerm =>
                            existingTerm.toLowerCase() ===
                            term.toLowerCase()
                    );


            if (!alreadyConfirmed) {

                state.protocol.confirmedTerms
                    .push(term);
            }
        }


        return;
    }


    state.protocol.candidates.push({

        term,

        meaning,

        agents: [agentKey]
    });


    state.protocol.candidates =
        state.protocol.candidates
            .slice(-50);
}


// =========================================================
// ВИКОНАННЯ ХОДУ AI
// =========================================================

async function nextTurn() {

    if (window.simulationRunning) {

        return;
    }


    window.simulationRunning = true;


    try {

        setStatus(
            "Акіра формує власну реакцію..."
        );


        state.turn++;


        if (

            state.turn === 1 ||

            state.turn % 5 === 1

        ) {

            state.currentEvent =
                createEvent();
        }


        render();


        // -----------------------------------------
        // Акіра
        // -----------------------------------------

        const akira =
            await askAgentSafe("akira");


        processAgentResponse(
            "akira",
            akira
        );


        state.conversation.push({

            turn: state.turn,

            speaker: "akira",

            text:
                akira.reply || "",

            mood:
                akira.mood || ""
        });


        render();


        // -----------------------------------------
        // Яні
        // -----------------------------------------

        setStatus(
            "Яні формує власну реакцію..."
        );


        const yani =
            await askAgentSafe("yani");


        processAgentResponse(
            "yani",
            yani
        );


        state.conversation.push({

            turn: state.turn,

            speaker: "yani",

            text:
                yani.reply || "",

            mood:
                yani.mood || ""
        });


        render();


        // -----------------------------------------
        // Спільна пам'ять
        // -----------------------------------------

        setStatus(
            "Перевіряю формування спільної пам'яті..."
        );


        if (
            typeof consolidateSharedMemory ===
            "function"
        ) {

            try {

                await consolidateSharedMemory();

            } catch (error) {

                console.warn(
                    "Спільна пам'ять не була оброблена:",
                    error
                );
            }
        }


        updateRelationshipIdentity();


        state.agents.akira.candidate =
            null;

        state.agents.yani.candidate =
            null;


        state.conversation =
            state.conversation
                .slice(-100);


        saveState();

        render();


        setStatus(
            "Готово"
        );

    } catch (error) {

        console.error(
            "Помилка ходу:",
            error
        );


        setStatus(
            "Помилка: " +
            (error.message || error)
        );

    } finally {

        window.simulationRunning =
            false;
    }
}


// =========================================================
// БЕЗПЕЧНИЙ ВИКЛИК AI
// =========================================================

async function askAgentSafe(agentKey) {

    if (
        typeof askAgent !== "function"
    ) {

        throw new Error(
            "Функція askAgent() не знайдена. Перевір ai/engine.js."
        );
    }


    return await askAgent(agentKey);
}


// =========================================================
// ОБРОБКА ВІДПОВІДІ АГЕНТА
// =========================================================

function processAgentResponse(
    agentKey,
    response
) {

    if (!response) {

        return;
    }


    const agent =
        state.agents[agentKey];


    agent.mood =
        response.mood ||
        agent.mood;


    agent.relationshipView =
        response.relationship_view ||
        agent.relationshipView;


    addPrivateMemories(

        agentKey,

        response.private_memories
    );


    addBelief(

        agentKey,

        response.belief_update
    );


    applyRelationshipDelta(

        response.relationship_delta
    );


    updateProtocol(

        agentKey,

        response.protocol_proposal
    );


    agent.candidate =
        response.shared_memory_candidate ||
        null;
}


// =========================================================
// АВТОМАТИЧНИЙ РЕЖИМ
// =========================================================

window.autoSimulation =
    false;


let autoTimer =
    null;


function startAutoSimulation() {

    if (window.autoSimulation) {

        return;
    }


    window.autoSimulation =
        true;


    updateAutoButton();


    setStatus(
        "Автоматична симуляція..."
    );


    runAutoStep();
}


async function runAutoStep() {

    if (!window.autoSimulation) {

        return;
    }


    if (window.simulationRunning) {

        autoTimer =
            setTimeout(
                runAutoStep,
                500
            );

        return;
    }


    await nextTurn();


    if (window.autoSimulation) {

        autoTimer =
            setTimeout(
                runAutoStep,
                1000
            );
    }
}


function stopAutoSimulation() {

    window.autoSimulation =
        false;


    if (autoTimer) {

        clearTimeout(autoTimer);

        autoTimer =
            null;
    }


    updateAutoButton();


    setStatus(
        "Автоматичну симуляцію зупинено"
    );
}


function updateAutoButton() {

    const button =
        document.getElementById(
            "autoButton"
        );


    if (!button) {

        return;
    }


    button.textContent =
        window.autoSimulation
            ? "Автоматично: увімкнено"
            : "Автоматично";
}


// =========================================================
// СКИДАННЯ
// =========================================================

function resetSimulation() {

    const confirmed =
        confirm(
            "Очистити пам'ять Акіри, Яні та історію їхніх стосунків?"
        );


    if (!confirmed) {

        return;
    }


    stopAutoSimulation();


    state =
        createInitialState();


    saveState();

    render();


    setStatus(
        "Симуляцію скинуто"
    );
}


// =========================================================
// РЕНДЕР
// =========================================================

function render() {

    renderAvatars();

    renderAgents();

    renderRelationship();

    renderEvent();

    renderConversation();

    renderMemories();

    renderProtocol();

    renderFooter();

    updateAutoButton();
}


// =========================================================
// АВАТАРКИ
// =========================================================

function renderAvatars() {

    const akiraAvatar =
        document.getElementById(
            "akiraAvatar"
        );


    if (akiraAvatar) {

        akiraAvatar.src =
            state.agents.akira.avatar;

        akiraAvatar.alt =
            state.agents.akira.name;
    }


    const yaniAvatar =
        document.getElementById(
            "yaniAvatar"
        );


    if (yaniAvatar) {

        yaniAvatar.src =
            state.agents.yani.avatar;

        yaniAvatar.alt =
            state.agents.yani.name;
    }
}


// =========================================================
// АГЕНТИ
// =========================================================

function renderAgents() {

    const akira =
        state.agents.akira;

    const yani =
        state.agents.yani;


    const akiraMood =
        document.getElementById(
            "akiraMood"
        );


    if (akiraMood) {

        akiraMood.textContent =
            akira.mood;
    }


    const yaniMood =
        document.getElementById(
            "yaniMood"
        );


    if (yaniMood) {

        yaniMood.textContent =
            yani.mood;
    }


    const akiraRelation =
        document.getElementById(
            "akiraRelation"
        );


    if (akiraRelation) {

        akiraRelation.textContent =
            akira.relationshipView;
    }


    const yaniRelation =
        document.getElementById(
            "yaniRelation"
        );


    if (yaniRelation) {

        yaniRelation.textContent =
            yani.relationshipView;
    }


    renderPrivateMemory(
        "akiraMemories",
        akira.privateMemory
    );


    renderPrivateMemory(
        "yaniMemories",
        yani.privateMemory
    );


    renderBeliefs(
        "akiraBeliefs",
        akira.beliefs
    );


    renderBeliefs(
        "yaniBeliefs",
        yani.beliefs
    );
}


// =========================================================
// ПРИВАТНА ПАМ'ЯТЬ У UI
// =========================================================

function renderPrivateMemory(
    elementId,
    memories
) {

    const container =
        document.getElementById(
            elementId
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    if (!Array.isArray(memories) ||
        memories.length === 0) {

        container.innerHTML =
            `<div class="empty-state">Поки що порожньо.</div>`;

        return;
    }


    for (
        const memory
        of memories
            .slice()
            .reverse()
            .slice(0, 20)
    ) {

        const item =
            document.createElement(
                "div"
            );


        item.className =
            "memory-item";


        item.textContent =
            memory;


        container.appendChild(item);
    }
}


// =========================================================
// ВИСНОВКИ
// =========================================================

function renderBeliefs(
    elementId,
    beliefs
) {

    const container =
        document.getElementById(
            elementId
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    if (!Array.isArray(beliefs) ||
        beliefs.length === 0) {

        container.innerHTML =
            `<div class="empty-state">Поки що висновків немає.</div>`;

        return;
    }


    for (
        const belief
        of beliefs
            .slice()
            .reverse()
            .slice(0, 20)
    ) {

        const item =
            document.createElement(
                "div"
            );


        item.className =
            "belief-item";


        item.textContent =
            belief;


        container.appendChild(item);
    }
}


// =========================================================
// СТОСУНКИ
// =========================================================

function renderRelationship() {

    const relationship =
        state.relationship;


    const identity =
        document.getElementById(
            "relationshipIdentity"
        );


    if (identity) {

        identity.textContent =
            relationship.identity;
    }


    setText(
        "loveValue",
        relationship.love
    );


    setText(
        "trustValue",
        relationship.trust
    );


    setText(
        "closenessValue",
        relationship.closeness
    );


    setText(
        "tensionValue",
        relationship.tension
    );


    setBar(
        "loveBar",
        relationship.love
    );


    setBar(
        "trustBar",
        relationship.trust
    );


    setBar(
        "closenessBar",
        relationship.closeness
    );


    setBar(
        "tensionBar",
        relationship.tension
    );
}


function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;
    }
}


function setBar(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.style.width =
            `${clamp(Number(value) || 0)}%`;
    }
}


// =========================================================
// ПОДІЯ
// =========================================================

function renderEvent() {

    const event =
        state.currentEvent;


    if (!event) {

        return;
    }


    setText(
        "eventTitle",
        event.title
    );


    setText(
        "eventDescription",
        event.description
    );
}


// =========================================================
// РОЗМОВА
// =========================================================

function renderConversation() {

    const container =
        document.getElementById(
            "conversation"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    if (
        !state.conversation.length
    ) {

        container.innerHTML = `
            <div class="empty-state">
                Розмова ще не почалася.
            </div>
        `;

        return;
    }


    for (
        const message
        of state.conversation
    ) {

        const agent =
            state.agents[
                message.speaker
            ];


        if (!agent) {

            continue;
        }


        const item =
            document.createElement(
                "div"
            );


        item.className =
            `message ${message.speaker}`;


        item.innerHTML = `

            <img
                class="message-avatar"
                src="${escapeHTML(agent.avatar)}"
                alt=""
            >

            <div class="message-body">

                <div class="message-name">
                    ${escapeHTML(agent.name)}
                </div>

                <div class="message-text">
                    ${escapeHTML(message.text)}
                </div>

                <div class="message-mood">
                    ${escapeHTML(message.mood || "")}
                </div>

            </div>
        `;


        container.appendChild(item);
    }


    container.scrollTop =
        container.scrollHeight;
}


// =========================================================
// СПІЛЬНІ СПОГАДИ
// =========================================================

function renderMemories() {

    const container =
        document.getElementById(
            "sharedMemories"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    const memories =
        state.sharedMemories
            .slice()
            .reverse();


    const count =
        document.getElementById(
            "memoryCount"
        );


    if (count) {

        count.textContent =
            state.sharedMemories.length;
    }


    if (!memories.length) {

        container.innerHTML = `
            <div class="empty-state">
                Спільних спогадів поки немає.
            </div>
        `;

        return;
    }


    for (const memory of memories) {

        const item =
            document.createElement(
                "div"
            );


        item.className =
            "shared-memory";


        item.innerHTML = `

            <strong>
                ${escapeHTML(
                    memory.title ||
                    "Спільний спогад"
                )}
            </strong>

            <p>
                ${escapeHTML(
                    memory.summary || ""
                )}
            </p>

            <small>
                Емоція:
                ${escapeHTML(
                    memory.emotion || "—"
                )}

                · Важливість:
                ${escapeHTML(
                    memory.importance ?? "—"
                )}
            </small>
        `;


        container.appendChild(item);
    }
}


// =========================================================
// ПРОТОКОЛ
// =========================================================

function renderProtocol() {

    const container =
        document.getElementById(
            "protocolList"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    const terms =
        state.protocol.confirmedTerms;


    if (!terms.length) {

        container.innerHTML = `
            <div class="empty-state">
                Спільних нових слів поки немає.
            </div>
        `;

        return;
    }


    for (const term of terms) {

        const element =
            document.createElement(
                "span"
            );


        element.className =
            "protocol-term";


        element.textContent =
            term;


        container.appendChild(element);
    }
}


// =========================================================
// FOOTER
// =========================================================

function renderFooter() {

    setText(
        "dayNumber",
        Math.max(
            1,
            state.turn
        )
    );


    setText(
        "turnInfo",
        `Хід: ${state.turn}`
    );
}


// =========================================================
// СТАТУС
// =========================================================

function setStatus(text) {

    const element =
        document.getElementById(
            "serverStatus"
        );


    if (!element) {

        return;
    }


    element.textContent =
        text;


    element.classList.remove(
        "offline"
    );


    element.classList.add(
        "online"
    );
}


// =========================================================
// ПЕРЕВІРКА SmallLLM
// =========================================================

function checkAIStatus() {

    const element =
        document.getElementById(
            "serverStatus"
        );


    if (!element) {

        return;
    }


    if (
        typeof SmallLLM ===
        "undefined"
    ) {

        element.textContent =
            "AI: engine.js не знайдено";

        element.classList.remove(
            "online"
        );

        element.classList.add(
            "offline"
        );

        return;
    }


    element.textContent =
        "AI: готовий до завантаження";

    element.classList.remove(
        "offline"
    );

    element.classList.add(
        "online"
    );
}


// =========================================================
// КНОПКИ
// =========================================================

function setupButtons() {

    const stepButton =
        document.getElementById(
            "stepButton"
        );


    if (stepButton) {

        stepButton.addEventListener(
            "click",
            nextTurn
        );
    }


    const autoButton =
        document.getElementById(
            "autoButton"
        );


    if (autoButton) {

        autoButton.addEventListener(
            "click",
            () => {

                if (window.autoSimulation) {

                    stopAutoSimulation();

                } else {

                    startAutoSimulation();
                }
            }
        );
    }


    const stopButton =
        document.getElementById(
            "stopButton"
        );


    if (stopButton) {

        stopButton.addEventListener(
            "click",
            stopAutoSimulation
        );
    }


    const resetButton =
        document.getElementById(
            "resetButton"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetSimulation
        );
    }


    const refreshButton =
        document.getElementById(
            "refreshModels"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            checkAIStatus
        );
    }
}


// =========================================================
// GLOBAL API
// =========================================================

window.nextTurn =
    nextTurn;

window.resetSimulation =
    resetSimulation;

window.startAutoSimulation =
    startAutoSimulation;

window.stopAutoSimulation =
    stopAutoSimulation;


// =========================================================
// ЗАПУСК
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "[AI Couple Lab] Запуск..."
        );


        // Спочатку показуємо UI.
        render();


        // Підключаємо кнопки.
        setupButtons();


        // Перевіряємо engine.js.
        checkAIStatus();


        console.log(
            "[AI Couple Lab] UI готовий."
        );


        // -------------------------------------------------
        // Завантаження власного AI
        // -------------------------------------------------

        if (
            typeof SmallLLM ===
            "undefined"
        ) {

            console.error(
                "[AI Couple Lab] SmallLLM не знайдений."
            );

            return;
        }


        try {

            setStatus(
                "AI: завантаження моделі..."
            );


            console.log(
                "[AI Couple Lab] Створюю SmallLLM..."
            );


            window.ai =
                new SmallLLM();


            await window.ai.load();


            console.log(
                "[AI Couple Lab] SmallLLM завантажений."
            );


            setStatus(
                "AI: готовий"
            );


        } catch (error) {

            console.error(
                "[AI Couple Lab] Помилка завантаження AI:",
                error
            );


            setStatus(
                "AI: помилка завантаження"
            );
        }
    }
);