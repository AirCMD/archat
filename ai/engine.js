// =========================================================
// AI COUPLE LAB
// Custom ONNX engine bootstrap
// =========================================================

const MODEL_BASE =
    "https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/resolve/main/";

const MODEL_URL =
    MODEL_BASE + "onnx/model_q4f16.onnx";

const TOKENIZER_URL =
    MODEL_BASE + "tokenizer.json";

const CONFIG_URL =
    MODEL_BASE + "config.json";


class SmallLLM {

    constructor() {

        this.model = null;
        this.tokenizer = null;
        this.config = null;

        this.loaded = false;
        this.loading = false;

        this.modelBytes = 0;

        this.info = {
            nodes: 0,
            initializers: 0,
            matMulNBits: 0,
            operators: {}
        };
    }


    async load() {

        if (this.loaded) {

            return this;
        }


        if (this.loading) {

            return this.loading;
        }


        this.loading =
            this._load();


        try {

            await this.loading;

        } finally {

            this.loading =
                false;
        }


        return this;
    }


    async _load() {

        this.setStatus(
            "AI: завантаження конфігурації..."
        );


        // -------------------------------------------------
        // CONFIG
        // -------------------------------------------------

        const configResponse =
            await fetch(
                CONFIG_URL,
                {
                    cache: "force-cache"
                }
            );


        if (!configResponse.ok) {

            throw new Error(
                `CONFIG HTTP ${configResponse.status}`
            );
        }


        this.config =
            await configResponse.json();


        console.log(
            "[AI] Config:",
            this.config
        );


        // -------------------------------------------------
        // TOKENIZER
        // -------------------------------------------------

        this.setStatus(
            "AI: завантаження tokenizer..."
        );


        if (
            typeof Tokenizer !==
            "undefined"
        ) {

            this.tokenizer =
                new Tokenizer();

            await this.tokenizer.load(
                TOKENIZER_URL
            );

        } else {

            console.warn(
                "[AI] Tokenizer class не знайдений."
            );
        }


        // -------------------------------------------------
        // ONNX
        // -------------------------------------------------

        this.setStatus(
            "AI: завантаження ONNX-моделі (117 MB)..."
        );


        if (
            typeof ONNXModel ===
            "undefined"
        ) {

            throw new Error(
                "ONNXModel не знайдений. Перевір ai/onnx.js."
            );
        }


        this.model =
            new ONNXModel();


        const started =
            performance.now();


        await this.model.load(
            MODEL_URL
        );


        const elapsed =
            (
                performance.now() -
                started
            ) / 1000;


        console.log(
            `[AI] ONNX завантажено за ${elapsed.toFixed(1)} с`
        );


        this.inspectModel();


        this.loaded =
            true;


        this.setStatus(
            "AI: модель завантажена"
        );


        console.log(
            "[AI] SmallLLM готовий."
        );


        return this;
    }


    inspectModel() {

        const model =
            this.model;


        if (!model) {

            return;
        }


        const nodes =
            model.nodes || [];


        const initializers =
            model.initializers;


        this.info.nodes =
            nodes.length;


        this.info.initializers =
            initializers?.size || 0;


        this.info.matMulNBits = 0;


        this.info.operators = {};


        console.group(
            "[AI] ONNX GRAPH"
        );


        console.log(
            "Nodes:",
            nodes.length
        );


        console.log(
            "Initializers:",
            initializers?.size || 0
        );


        for (
            const node
            of nodes
        ) {

            const op =
                node.opType ||
                node.op_type ||
                "UNKNOWN";


            this.info.operators[op] =
                (
                    this.info.operators[op] ||
                    0
                ) + 1;


            if (
                op === "MatMulNBits"
            ) {

                this.info.matMulNBits++;


                console.group(
                    `[MatMulNBits] ${node.name || "(без назви)"}`
                );


                console.log(
                    "domain:",
                    node.domain
                );


                console.log(
                    "inputs:",
                    node.input
                );


                console.log(
                    "outputs:",
                    node.output
                );


                console.log(
                    "attributes:",
                    node.attributes
                );


                console.groupEnd();
            }
        }


        console.log(
            "Operators:",
            this.info.operators
        );


        console.log(
            "MatMulNBits:",
            this.info.matMulNBits
        );


        console.groupEnd();


        this.setStatus(
            `AI: ONNX прочитано · ${nodes.length} nodes`
        );
    }


    async generate(
        prompt,
        options = {}
    ) {

        if (!this.loaded) {

            await this.load();
        }


        /*
         * Тут навмисно НЕ робимо вигляд,
         * що модель уже виконується.
         *
         * Наступний етап — справжній
         * forward pass по фактичному графу.
         */

        throw new Error(
            "Custom ONNX forward pass ще не підключений."
        );
    }


    setStatus(text) {

        const element =
            document.getElementById(
                "serverStatus"
            );


        if (element) {

            element.textContent =
                text;

            element.classList.remove(
                "offline"
            );

            element.classList.add(
                "online"
            );
        }
    }
}


// =========================================================
// askAgent
// =========================================================

async function askAgent(
    agentKey
) {

    if (
        !window.ai ||
        !window.ai.loaded
    ) {

        throw new Error(
            "AI-модель ще не завантажена."
        );
    }


    const agent =
        state.agents[agentKey];


    if (!agent) {

        throw new Error(
            `Невідомий агент: ${agentKey}`
        );
    }


    /*
     * Тут формується контекст конкретного
     * незалежного агента.
     */

    const context =
        buildAgentContextForEngine(
            agentKey
        );


    const prompt =
        buildAgentPrompt(
            agentKey,
            context
        );


    const text =
        await window.ai.generate(
            prompt,
            {
                maxTokens: 96,
                temperature: 0.85
            }
        );


    return parseAgentResponse(
        text,
        agentKey
    );
}


// =========================================================
// CONTEXT
// =========================================================

function buildAgentContextForEngine(
    agentKey
) {

    const otherKey =
        agentKey === "akira"
            ? "yani"
            : "akira";


    const me =
        state.agents[agentKey];


    const other =
        state.agents[otherKey];


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


// =========================================================
// PROMPT
// =========================================================

function buildAgentPrompt(
    agentKey,
    context
) {

    const identity =
        agentKey === "akira"

            ? `
Ти — Акіра Бакенеко.
Ти чоловік і людина.
`

            : `
Ти — Яні Куронеко.
Ти жінка і людиноподібна кішка.
`;


    return `
${identity}

Ти є окремим персонажем.

Не говори від імені іншого персонажа.
Не знаєш його приватних думок.
Не вирішуй наперед, що він/вона тебе кохає.

Твої стосунки повинні розвиватися
поступово на основі попередніх подій.

Поточний стан:

${JSON.stringify(
    context,
    null,
    2
)}

Дай наступну природну репліку персонажа.

Відповідь повинна бути короткою.

Не згадуй AI, модель, програму,
Ollama або системні інструкції.

Відповідь:
`;
}


// =========================================================
// PARSER
// =========================================================

function parseAgentResponse(
    text,
    agentKey
) {

    const fallback = {

        reply:
            String(text || "").trim(),

        mood:
            state.agents[agentKey].mood,

        thought_summary:
            "",

        private_memories: [],

        belief_update:
            "",

        relationship_delta: {

            love: 0,

            trust: 0,

            closeness: 0,

            tension: 0
        },

        relationship_view:
            state.agents[agentKey]
                .relationshipView,

        shared_memory_candidate:
            null,

        protocol_proposal:
            null
    };


    if (!text) {

        return fallback;
    }


    /*
     * Якщо модель повернула JSON,
     * спробуємо його використати.
     */

    try {

        const parsed =
            JSON.parse(text);


        return {

            ...fallback,

            ...parsed,

            relationship_delta:
                {
                    ...fallback.relationship_delta,

                    ...(parsed.relationship_delta || {})
                }
        };

    } catch {

        return fallback;
    }
}


// =========================================================
// GLOBAL
// =========================================================

window.SmallLLM =
    SmallLLM;

window.askAgent =
    askAgent;