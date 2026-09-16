const $ = (id) => document.getElementById(id);

let state = null;
let autoTimer = null;
let busy = false;


const AGENTS = {
    akira: {
        name: "Акіра Бакенеко",
        avatar:
            "https://blogger.googleusercontent.com/img/a/AVvXsEg6TLuKwTa6G7t32SgZE9RiJp5vLqOOqtC7lBHiLXIjBZOZAx1Dku1fWM8x_bc1lXwA1pF32pojhJW02L1BxI3oJfuvwBhC6i9Di0zPVQhzLcGslTae08Qe-4bRNEtHajGweOmDs9Snij-8QDCseC7KCckbjuGosEilTW3y2LxVSfdQ0WRgCTtt8us3ahI"
    },

    yani: {
        name: "Яні Куронеко",
        avatar:
            "https://blogger.googleusercontent.com/img/a/AVvXsEgkPXEo9bsccA1-IIT-KUyEuAKqHDr_TqUk-nmd4oksI3rhDnHSdk6f5W33CTttxhY2F1iowhoRqtd-PumQD7mnkhODarmDRto8UmhRwQuGaEAgSmC26uPA7euxu72oZ0wYTV6ALPHLEULM94dQodtfoq9TC7kXm8Zen1OY2zuAUvcdWQxnXvrgNyQw9WE"
    }
};


function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}


function setBar(id, value) {
    const element = $(id);

    if (!element) {
        return;
    }

    element.style.width =
        `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
}


function renderRelationship() {
    const r = state.relationship;

    $("relationshipIdentity").textContent =
        r.identity;

    $("dayNumber").textContent =
        state.day;

    $("loveValue").textContent =
        Math.round(r.love);

    $("trustValue").textContent =
        Math.round(r.trust);

    $("closenessValue").textContent =
        Math.round(r.closeness);

    $("tensionValue").textContent =
        Math.round(r.tension);

    setBar("loveBar", r.love);
    setBar("trustBar", r.trust);
    setBar("closenessBar", r.closeness);
    setBar("tensionBar", r.tension);
}


function renderAgent(agentId) {
    const agent = state.agents[agentId];

    const prefix =
        agentId === "akira" ? "akira" : "yani";

    $(prefix + "Mood").textContent =
        agent.mood || "—";

    $(prefix + "Relation").textContent =
        agent.relationship_view || "—";


    const memories = [
        ...(agent.private_memory || [])
    ]
        .slice(-6)
        .reverse();


    $(prefix + "Memories").innerHTML =
        memories.length
            ? memories.map(memory => `
                <div class="memory-item">
                    ${escapeHTML(memory.text)}
                    <small>
                        важливість:
                        ${Math.round(
                            Number(memory.importance || 0) * 100
                        )}%
                    </small>
                </div>
            `).join("")
            : `
                <div class="memory-item">
                    Поки що пам'ять порожня.
                </div>
            `;


    const beliefs = [
        ...(agent.beliefs || [])
    ]
        .slice(-6)
        .reverse();


    $(prefix + "Beliefs").innerHTML =
        beliefs.length
            ? beliefs.map(belief => `
                <div class="belief-item">
                    ${escapeHTML(belief.text)}
                    <small>
                        впевненість:
                        ${Math.round(
                            Number(belief.confidence || 0) * 100
                        )}%
                    </small>
                </div>
            `).join("")
            : `
                <div class="belief-item">
                    Поки що висновків немає.
                </div>
            `;
}


function renderConversation() {
    const conversation =
        state.conversation || [];

    const container =
        $("conversation");

    if (!conversation.length) {
        container.innerHTML = `
            <div class="message">
                <div class="bubble">
                    Тут поки тихо. Першим говоритиме Акіра.
                </div>
            </div>
        `;

        return;
    }


    container.innerHTML =
        conversation
            .slice(-30)
            .map(message => {

                const agent =
                    AGENTS[message.speaker];

                return `
                    <div class="message ${message.speaker}">
                        <img
                            class="message-avatar"
                            src="${agent.avatar}"
                            alt=""
                        >

                        <div>
                            <div class="bubble">
                                ${escapeHTML(message.text)}
                            </div>

                            <div class="message-meta">
                                ${escapeHTML(message.name)}
                                · день ${message.day}
                            </div>
                        </div>
                    </div>
                `;
            })
            .join("");

    container.scrollTop =
        container.scrollHeight;
}


function renderEvent() {
    const event =
        state.current_event;

    if (!event) {
        $("eventTitle").textContent =
            "Поки нічого особливого не відбувається";

        $("eventDescription").textContent =
            "Агенти продовжують власну взаємодію.";

        return;
    }

    $("eventTitle").textContent =
        event.title || "Нова подія";

    $("eventDescription").textContent =
        event.description || "";
}


function renderSharedMemories() {
    const memories =
        [...(state.shared_memories || [])]
            .reverse();

    $("memoryCount").textContent =
        memories.length;


    if (!memories.length) {
        $("sharedMemories").innerHTML = `
            <div class="shared-memory">
                Їхня спільна історія ще тільки формується.
            </div>
        `;

        return;
    }


    $("sharedMemories").innerHTML =
        memories.slice(0, 12).map(memory => {

            const facts =
                (memory.facts || [])
                    .slice(0, 4)
                    .map(fact => `
                        <span class="memory-tag">
                            ${escapeHTML(fact)}
                        </span>
                    `)
                    .join("");


            return `
                <article class="shared-memory">

                    <h3>
                        ${escapeHTML(memory.title)}
                    </h3>

                    <p>
                        ${escapeHTML(memory.summary)}
                    </p>

                    <div class="memory-tags">
                        ${facts}
                        <span class="memory-tag">
                            ${escapeHTML(
                                memory.emotion || "емоція"
                            )}
                        </span>

                        <span class="memory-tag">
                            згадували ${memory.mentions || 1}×
                        </span>
                    </div>

                    <div class="recall">
                        <strong>Акіра:</strong>
                        ${escapeHTML(
                            memory.akira_recall || "—"
                        )}
                        <br><br>
                        <strong>Яні:</strong>
                        ${escapeHTML(
                            memory.yani_recall || "—"
                        )}
                    </div>

                </article>
            `;
        }).join("");
}


function renderProtocol() {
    const terms =
        state.protocol?.terms || [];

    if (!terms.length) {
        $("protocolList").innerHTML =
            `<span>Поки немає нових слів.</span>`;

        return;
    }


    $("protocolList").innerHTML =
        terms.map(item => `
            <div class="protocol-item">

                <span class="protocol-term">
                    ${escapeHTML(item.term)}
                </span>

                <span class="protocol-meaning">
                    ${escapeHTML(item.meaning)}
                </span>

            </div>
        `).join("");
}


function renderActiveSpeaker() {
    const id = state.active;

    $("activeSpeaker").textContent =
        `говорить: ${state.agents[id].name}`;
}


function renderAll() {
    if (!state) {
        return;
    }

    renderRelationship();

    renderAgent("akira");
    renderAgent("yani");

    renderConversation();
    renderEvent();
    renderSharedMemories();
    renderProtocol();
    renderActiveSpeaker();

    $("turnInfo").textContent =
        `Хід: ${state.turn}`;

    $("modelSelect").value =
        state.model || "";
}


async function getJSON(url) {
    const response =
        await fetch(url);

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}`
        );
    }

    return response.json();
}


async function loadState() {
    state =
        await getJSON("/api/state");

    renderAll();
}


async function checkServer() {
    try {
        const result =
            await getJSON("/api/health");

        if (result.ok) {
            $("serverStatus").textContent =
                "Ollama онлайн";

            $("serverStatus").className =
                "status online";
        } else {
            throw new Error();
        }

    } catch (error) {

        $("serverStatus").textContent =
            "Ollama недоступна";

        $("serverStatus").className =
            "status offline";
    }
}


async function loadModels() {
    try {

        const result =
            await getJSON("/api/models");

        const select =
            $("modelSelect");

        select.innerHTML = "";

        if (!result.models?.length) {

            select.innerHTML = `
                <option value="">
                    Моделі не знайдені
                </option>
            `;

            return;
        }


        for (const model of result.models) {

            const option =
                document.createElement("option");

            option.value = model;
            option.textContent = model;

            select.appendChild(option);
        }


        if (state?.model) {
            select.value =
                state.model;
        }

    } catch (error) {

        $("modelSelect").innerHTML = `
            <option value="">
                Ollama недоступна
            </option>
        `;
    }
}


async function selectModel() {
    const model =
        $("modelSelect").value;

    if (!model) {
        return;
    }

    try {

        const response =
            await fetch("/api/model", {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    model
                })
            });


        const result =
            await response.json();

        if (!result.ok) {
            throw new Error(
                result.error || "Помилка"
            );
        }

        state.model = model;

    } catch (error) {

        alert(
            "Не вдалося змінити модель:\n" +
            error.message
        );
    }
}


async function nextTurn() {

    if (busy) {
        return;
    }

    busy = true;

    $("stepButton").disabled = true;

    $("stepButton").textContent =
        "⏳ Агент думає...";


    try {

        const response =
            await fetch("/api/step", {
                method: "POST"
            });


        const result =
            await response.json();


        if (!result.ok) {
            throw new Error(
                result.error ||
                "Невідома помилка."
            );
        }


        state =
            result.state;

        renderAll();

    } catch (error) {

        alert(
            "Помилка агента:\n\n" +
            error.message
        );

    } finally {

        busy = false;

        $("stepButton").disabled = false;

        $("stepButton").textContent =
            "▶ Наступний хід";
    }
}


function startAuto() {

    if (autoTimer) {
        return;
    }

    $("autoButton").textContent =
        "⏸ Автоматично";

    autoTimer =
        setInterval(async () => {

            if (!busy) {
                await nextTurn();
            }

        }, 4500);
}


function stopAuto() {

    if (!autoTimer) {
        return;
    }

    clearInterval(autoTimer);

    autoTimer = null;

    $("autoButton").textContent =
        "Автоматично";
}


async function resetSimulation() {

    stopAuto();

    const yes =
        confirm(
            "Справді стерти їхню історію, " +
            "пам'ять і розвиток стосунків?"
        );

    if (!yes) {
        return;
    }


    try {

        const response =
            await fetch("/api/reset", {
                method: "POST"
            });


        const result =
            await response.json();


        if (!result.ok) {
            throw new Error(
                result.error || "Помилка"
            );
        }


        state =
            result.state;

        renderAll();

    } catch (error) {

        alert(
            "Не вдалося скинути симуляцію:\n" +
            error.message
        );
    }
}


$("stepButton")
    .addEventListener(
        "click",
        nextTurn
    );


$("autoButton")
    .addEventListener(
        "click",
        () => {

            if (autoTimer) {
                stopAuto();
            } else {
                startAuto();
            }

        }
    );


$("stopButton")
    .addEventListener(
        "click",
        stopAuto
    );


$("resetButton")
    .addEventListener(
        "click",
        resetSimulation
    );


$("refreshModels")
    .addEventListener(
        "click",
        loadModels
    );


$("modelSelect")
    .addEventListener(
        "change",
        selectModel
    );


async function init() {

    try {
        await loadState();
        await checkServer();
        await loadModels();

    } catch (error) {

        $("serverStatus").textContent =
            "Сервер не запущений";

        $("serverStatus").className =
            "status offline";

        console.error(error);
    }
}


init();