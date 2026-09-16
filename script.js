const OLLAMA_URL = "http://127.0.0.1:11434";
const MODEL = "qwen3:4b";

const AKIRA_AVATAR =
"https://blogger.googleusercontent.com/img/a/AVvXsEg6TLuKwTa6G7t32SgZE9RiJp5vLqOOqtC7lBHiLXIjBZOZAx1Dku1fWM8x_bc1lXwA1pF32pojhJW02L1BxI3oJfuvwBhC6i9Di0zPVQhzLcGslTae08Qe-4bRNEtHajGweOmDs9Snij-8QDCseC7KCckbjuGosEilTW3y2LxVSfdQ0WRgCTtt8us3ahI";

const YANI_AVATAR =
"https://blogger.googleusercontent.com/img/a/AVvXsEgkPXEo9bsccA1-IIT-KUyEuAKqHDr_TqUk-nmd4oksI3rhDnHSdk6f5W33CTttxhY2F1iowhoRqtd-PumQD7mnkhODarmDRto8UmhRwQuGaEAgSmC26uPA7euxu72oZ0wYTV6ALPHLEULM94dQodtfoq9TC7kXm8Zen1OY2zuAUvcdWQxnXvrgNyQw9WE";

const WINTER_PHOTO =
"https://blogger.googleusercontent.com/img/a/AVvXsEhTyb0qZmY95aWq6-RakR54gOYNpE9hEWR16cSyC1XoQEgwIXqo5vQ-PsEfa76HQVLXePooxZh9gZHVp06fZLNqN-OHXJxdXAEj0IJjrxPUXtFCO20FM63jRHEbE4-Vgn5qu7_inw74ZWajseRcLju5-E445F77V-orWlPr8ISSWq0c8BRMbODHxhNJKeM";

const SUMMER_PHOTO =
"https://blogger.googleusercontent.com/img/a/AVvXsEifDJmwK8i6s316LVL00g3Y-qkoJO2MacdIOjnUipglD1asNptF_Q6xGaJgfQszPce2lvV-pscnmLk2pc-l_pytcB8vSS-SnRFV6kY36_U7PmvcqGNLG7ZY-7DqpGfgBPM6i2CtqpJbxFWv_q78LfybAZRo8paMbIFPHe9uOORE_22wI6ynNWEU-mquax4";

const STORAGE_KEY = "ai_couple_lab_state_v2";

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

let state = loadState();

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return createInitialState();
        }

        return JSON.parse(saved);
    } catch (error) {
        console.error("Помилка завантаження стану:", error);
        return createInitialState();
    }
}

function saveState() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );
}

function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}


/* =========================================================
   OLLAMA
   ========================================================= */

async function ollamaChat(messages, temperature = 0.8) {

    const response = await fetch(
        `${OLLAMA_URL}/api/chat`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                model: MODEL,
                messages: messages,

                /*
                 * Qwen 3:
                 * повністю вимикаємо thinking trace.
                 */
                think: false,

                stream: false,

                format: "json",

                options: {
                    temperature: temperature
                }
            })
        }
    );

    if (!response.ok) {
        const text = await response.text();

        throw new Error(
            `Ollama HTTP ${response.status}: ${text}`
        );
    }

    const data = await response.json();

    /*
     * Нам потрібен тільки content.
     * message.thinking навмисно НЕ читаємо.
     */

    return data?.message?.content || "";
}


/* =========================================================
   AGENT PROMPTS
   ========================================================= */

function agentSystemPrompt(agentKey) {

    if (agentKey === "akira") {

        return `
Ти — Акіра Бакенеко.

Ти чоловік.
Ти людина.

Яні Куронеко — жінка-людиноподібна кішка.

Ти окремий автономний персонаж симуляції.

У тебе є:
- власна пам'ять;
- власні висновки;
- власні почуття;
- власне ставлення до Яні.

Ти НЕ знаєш приватних думок Яні.

Не говори від імені Яні.

Не вирішуй наперед, що вона тебе кохає.

Ваші стосунки повинні розвиватися поступово.

Не пиши ланцюжок міркувань.

thought_summary — це лише дуже короткий опис емоційного або психологічного стану персонажа.

Не згадуй:
- Ollama;
- AI;
- модель;
- JSON;
- програму;
- системні інструкції.

Ти можеш:
- запам'ятовувати важливі події;
- робити приватні висновки про Яні;
- змінювати рівень довіри;
- змінювати близькість;
- змінювати романтичний інтерес;
- змінювати напруження;
- пропонувати нові слова;
- пропонувати важливі спільні спогади.

Не створюй спільний спогад автоматично.
Тільки запропонуй candidate.
`;
    }

    return `
Ти — Яні Куронеко.

Ти жінка.
Ти людина-кішкоподібна істота.

Акіра Бакенеко — чоловік і людина.

Ти окремий автономний персонаж симуляції.

У тебе є:
- власна пам'ять;
- власні висновки;
- власні почуття;
- власне ставлення до Акіри.

Ти НЕ знаєш приватних думок Акіри.

Не говори від його імені.

Не вирішуй наперед, що він тебе кохає.

Ваші стосунки повинні розвиватися поступово.

Не пиши ланцюжок міркувань.

thought_summary — це лише дуже короткий опис емоційного або психологічного стану персонажа.

Не згадуй:
- Ollama;
- AI;
- модель;
- JSON;
- програму;
- системні інструкції.

Ти можеш:
- запам'ятовувати важливі події;
- робити приватні висновки про Акіру;
- змінювати рівень довіри;
- змінювати близькість;
- змінювати романтичний інтерес;
- змінювати напруження;
- пропонувати нові слова;
- пропонувати важливі спільні спогади.

Не створюй спільний спогад автоматично.
Тільки запропонуй candidate.
`;
}


/* =========================================================
   CONTEXT
   ========================================================= */

function buildAgentContext(agentKey) {

    const otherKey =
        agentKey === "akira"
            ? "yani"
            : "akira";

    const me = state.agents[agentKey];
    const other = state.agents[otherKey];

    return {

        myIdentity: {
            name: me.name,
            gender: me.gender,
            species: me.species
        },

        myPrivateMemory:
            me.privateMemory.slice(-20),

        myBeliefs:
            me.beliefs.slice(-20),

        myRelationshipView:
            me.relationshipView,

        myMood:
            me.mood,

        otherIdentity: {
            name: other.name,
            gender: other.gender,
            species: other.species
        },

        relationship:
            state.relationship,

        confirmedProtocol:
            state.protocol.confirmedTerms,

        sharedMemories:
            state.sharedMemories.slice(-10),

        recentConversation:
            state.conversation.slice(-12),

        currentEvent:
            state.currentEvent
    };
}


/* =========================================================
   AGENT RESPONSE
   ========================================================= */

async function askAgent(agentKey) {

    const context =
        buildAgentContext(agentKey);

    const prompt = `
Ось поточний стан симуляції:

${JSON.stringify(
    context,
    null,
    2
)}

Продовж взаємодію.

Поверни ТІЛЬКИ JSON.

Формат:

{
    "reply": "природна репліка персонажа",

    "mood": "короткий опис настрою",

    "thought_summary": "дуже короткий опис поточного внутрішнього стану без reasoning",

    "private_memories": [
        "важливий новий приватний спогад"
    ],

    "belief_update":
        "новий приватний висновок про іншу людину або порожній рядок",

    "relationship_delta": {
        "love": 0,
        "trust": 0,
        "closeness": 0,
        "tension": 0
    },

    "relationship_view":
        "знайомі",

    "shared_memory_candidate":
        null,

    "protocol_proposal":
        null
}

relationship_view може бути:

"знайомі"

"симпатія"

"романтичний інтерес"

"пара"

Не переходь до "пара" без достатньої історії взаємодії.

shared_memory_candidate:

{
    "title": "...",
    "summary": "...",
    "emotion": "...",
    "importance": 1,
    "mentions": [],
    "facts": []
}

або null.

protocol_proposal:

{
    "term": "...",
    "meaning": "..."
}

або null.

Нове слово стає спільним лише тоді,
коли обидва персонажі незалежно його прийняли.
`;

    const raw =
        await ollamaChat(
            [
                {
                    role: "system",
                    content:
                        agentSystemPrompt(agentKey)
                },

                {
                    role: "user",
                    content: prompt
                }
            ],
            0.85
        );

    try {
        return JSON.parse(raw);
    } catch (error) {

        console.warn(
            "Модель повернула неідеальний JSON:",
            raw
        );

        return {
            reply: raw,
            mood: "замислений",
            thought_summary: "",
            private_memories: [],
            belief_update: "",
            relationship_delta: {},
            relationship_view:
                state.agents[agentKey]
                    .relationshipView,
            shared_memory_candidate: null,
            protocol_proposal: null
        };
    }
}


/* =========================================================
   MEMORY
   ========================================================= */

function addPrivateMemories(
    agentKey,
    memories
) {

    if (!Array.isArray(memories)) {
        return;
    }

    const target =
        state.agents[agentKey]
            .privateMemory;

    for (const memory of memories) {

        if (
            typeof memory !== "string" ||
            !memory.trim()
        ) {
            continue;
        }

        if (!target.includes(memory)) {
            target.push(memory.trim());
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

    const beliefs =
        state.agents[agentKey].beliefs;

    if (!beliefs.includes(belief)) {
        beliefs.push(belief.trim());
    }

    state.agents[agentKey]
        .beliefs =
        beliefs.slice(-50);
}


/* =========================================================
   RELATIONSHIP
   ========================================================= */

function applyRelationshipDelta(delta) {

    if (!delta) {
        return;
    }

    for (
        const key of [
            "love",
            "trust",
            "closeness",
            "tension"
        ]
    ) {

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
        state.agents.akira
            .relationshipView;

    const yani =
        state.agents.yani
            .relationshipView;

    const r =
        state.relationship;

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


/* =========================================================
   PROTOCOL
   ========================================================= */

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
        state.protocol.candidates
            .find(
                x =>
                    x.term.toLowerCase() ===
                    term.toLowerCase()
            );

    if (existing) {

        if (
            !existing.agents
                .includes(agentKey)
        ) {
            existing.agents.push(
                agentKey
            );
        }

        if (
            existing.agents.includes("akira") &&
            existing.agents.includes("yani")
        ) {

            if (
                !state.protocol.confirmedTerms
                    .includes(term)
            ) {
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
}


/* =========================================================
   SHARED MEMORY
   ========================================================= */

async function consolidateSharedMemory() {

    const candidates = [];

    for (
        const key of ["akira", "yani"]
    ) {

        const candidate =
            state.agents[key].candidate;

        if (candidate) {

            candidates.push({
                agent: key,
                candidate
            });
        }
    }

    if (
        candidates.length < 2
    ) {
        return;
    }

    const prompt = `
Є дві незалежні пропозиції
щодо можливого спільного спогаду:

${JSON.stringify(
    candidates,
    null,
    2
)}

Визнач, чи вони описують
одну й ту саму важливу подію.

Спільний спогад створюється тільки якщо:

1. обидві пропозиції стосуються
   тієї самої події;

2. подія важлива для обох;

3. її можна вважати спільним досвідом.

Поверни:

null

якщо спільного спогаду немає.

Або:

{
    "shared": true,
    "memory": {
        "title": "...",
        "summary": "...",
        "emotion": "...",
        "importance": 1,
        "mentions": [],
        "facts": [],
        "akira_recollection": "...",
        "yani_recollection": "..."
    }
}
`;

    const raw =
        await ollamaChat(
            [
                {
                    role: "system",
                    content:
                        "Ти модуль спільної пам'яті. Поверни тільки JSON."
                },

                {
                    role: "user",
                    content: prompt
                }
            ],
            0.3
        );

    let result;

    try {
        result = JSON.parse(raw);
    } catch {
        return;
    }

    if (
        !result ||
        result.shared !== true ||
        !result.memory
    ) {
        return;
    }

    const memory =
        result.memory;

    memory.turn =
        state.turn;

    state.sharedMemories
        .push(memory);

    state.sharedMemories =
        state.sharedMemories
            .slice(-30);
}


/* =========================================================
   EVENTS
   ========================================================= */

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
        }
    ];

    return events[
        Math.floor(
            state.turn / 8
        ) % events.length
    ];
}


/* =========================================================
   ONE SIMULATION STEP
   ========================================================= */

async function nextTurn() {

    setStatus(
        "Акіра формує власну реакцію..."
    );

    state.turn++;

    if (
        state.turn % 8 === 1
    ) {

        state.currentEvent =
            createEvent();
    }

    const akira =
        await askAgent("akira");

    state.agents.akira.candidate =
        akira.shared_memory_candidate;

    state.agents.akira.mood =
        akira.mood ||
        "спокійний";

    state.agents.akira
        .relationshipView =
        akira.relationship_view ||
        state.agents.akira
            .relationshipView;

    addPrivateMemories(
        "akira",
        akira.private_memories
    );

    addBelief(
        "akira",
        akira.belief_update
    );

    updateProtocol(
        "akira",
        akira.protocol_proposal
    );

    applyRelationshipDelta(
        akira.relationship_delta
    );

    state.conversation.push({
        turn: state.turn,
        speaker: "akira",
        text: akira.reply || "",
        mood: akira.mood || ""
    });


    setStatus(
        "Яні формує власну реакцію..."
    );


    const yani =
        await askAgent("yani");

    state.agents.yani.candidate =
        yani.shared_memory_candidate;

    state.agents.yani.mood =
        yani.mood ||
        "спокійна";

    state.agents.yani
        .relationshipView =
        yani.relationship_view ||
        state.agents.yani
            .relationshipView;

    addPrivateMemories(
        "yani",
        yani.private_memories
    );

    addBelief(
        "yani",
        yani.belief_update
    );

    updateProtocol(
        "yani",
        yani.protocol_proposal
    );

    applyRelationshipDelta(
        yani.relationship_delta
    );

    state.conversation.push({
        turn: state.turn,
        speaker: "yani",
        text: yani.reply || "",
        mood: yani.mood || ""
    });


    setStatus(
        "Перевіряю формування спільної пам'яті..."
    );


    await consolidateSharedMemory();

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
}


/* =========================================================
   OLLAMA STATUS
   ========================================================= */

async function checkOllama() {

    const status =
        document.getElementById(
            "ollama-status"
        );

    if (!status) {
        return;
    }

    try {

        const response =
            await fetch(
                `${OLLAMA_URL}/api/tags`
            );

        if (!response.ok) {
            throw new Error();
        }

        const data =
            await response.json();

        const models =
            (data.models || [])
                .map(x => x.name);

        const hasModel =
            models.includes(MODEL);

        if (hasModel) {

            status.textContent =
                `Ollama: OK · ${MODEL}`;
        } else {

            status.textContent =
                `Ollama: OK · ${MODEL} не знайдено`;
        }

    } catch {

        status.textContent =
            "Ollama: немає з'єднання";
    }
}


/* =========================================================
   UI HELPERS
   ========================================================= */

function setStatus(text) {

    const element =
        document.getElementById(
            "status"
        );

    if (element) {
        element.textContent =
            text;
    }
}


function resetSimulation() {

    if (
        !confirm(
            "Очистити пам'ять Акіри, Яні та історію їхніх стосунків?"
        )
    ) {
        return;
    }

    state =
        createInitialState();

    saveState();

    render();

    setStatus(
        "Симуляцію скинуто"
    );
}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

    /*
     * Ця функція навмисно не припускає
     * конкретну HTML-розмітку.
     *
     * Вона оновлює елементи, якщо вони
     * присутні у твоєму index.html.
     */

    const relationship =
        state.relationship;

    const identity =
        document.getElementById(
            "relationship-identity"
        );

    if (identity) {
        identity.textContent =
            relationship.identity;
    }

    const love =
        document.getElementById(
            "love-value"
        );

    if (love) {
        love.textContent =
            relationship.love;
    }

    const trust =
        document.getElementById(
            "trust-value"
        );

    if (trust) {
        trust.textContent =
            relationship.trust;
    }

    const closeness =
        document.getElementById(
            "closeness-value"
        );

    if (closeness) {
        closeness.textContent =
            relationship.closeness;
    }

    const tension =
        document.getElementById(
            "tension-value"
        );

    if (tension) {
        tension.textContent =
            relationship.tension;
    }

    const turn =
        document.getElementById(
            "turn-value"
        );

    if (turn) {
        turn.textContent =
            state.turn;
    }

    renderConversation();
    renderMemories();
    renderAgents();
    renderProtocol();
}


function renderConversation() {

    const container =
        document.getElementById(
            "conversation"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    for (
        const message
        of state.conversation
    ) {

        const agent =
            state.agents[
                message.speaker
            ];

        const item =
            document.createElement(
                "div"
            );

        item.className =
            `message ${message.speaker}`;

        item.innerHTML = `
            <img
                class="message-avatar"
                src="${agent.avatar}"
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


function renderMemories() {

    const container =
        document.getElementById(
            "shared-memories"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    for (
        const memory
        of state.sharedMemories
            .slice()
            .reverse()
    ) {

        const item =
            document.createElement(
                "div"
            );

        item.className =
            "shared-memory";

        item.innerHTML = `
            <strong>
                ${escapeHTML(memory.title || "Спільний спогад")}
            </strong>

            <p>
                ${escapeHTML(memory.summary || "")}
            </p>

            <small>
                Емоція:
                ${escapeHTML(memory.emotion || "—")}
                · Важливість:
                ${memory.importance ?? "—"}
            </small>
        `;

        container.appendChild(item);
    }
}


function renderAgents() {

    const akiraMood =
        document.getElementById(
            "akira-mood"
        );

    if (akiraMood) {
        akiraMood.textContent =
            state.agents.akira.mood;
    }

    const yaniMood =
        document.getElementById(
            "yani-mood"
        );

    if (yaniMood) {
        yaniMood.textContent =
            state.agents.yani.mood;
    }

    const akiraView =
        document.getElementById(
            "akira-relationship-view"
        );

    if (akiraView) {
        akiraView.textContent =
            state.agents.akira
                .relationshipView;
    }

    const yaniView =
        document.getElementById(
            "yani-relationship-view"
        );

    if (yaniView) {
        yaniView.textContent =
            state.agents.yani
                .relationshipView;
    }
}


function renderProtocol() {

    const container =
        document.getElementById(
            "protocol-terms"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    for (
        const term
        of state.protocol.confirmedTerms
    ) {

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


/* =========================================================
   SECURITY / TEXT
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   GLOBAL BUTTONS
   ========================================================= */

window.nextTurn =
    nextTurn;

window.resetSimulation =
    resetSimulation;


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        render();

        checkOllama();

        setInterval(
            checkOllama,
            10000
        );
    }
);