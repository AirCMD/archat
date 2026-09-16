import json
import os
import random
import re
import threading
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HOST = "127.0.0.1"
PORT = 8000

OLLAMA_URL = "http://127.0.0.1:11434"
DEFAULT_MODEL = "qwen3:4b"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(BASE_DIR, "couple_state.json")

LOCK = threading.Lock()


AKIRA_AVATAR = (
    "https://blogger.googleusercontent.com/img/a/"
    "AVvXsEg6TLuKwTa6G7t32SgZE9RiJp5vLqOOqtC7lBHiLXIjBZOZAx1Dku1fWM8x_bc1lXwA1pF32pojhJW02L1BxI3oJfuvwBhC6i9Di0zPVQhzLcGslTae08Qe-4bRNEtHajGweOmDs9Snij-8QDCseC7KCckbjuGosEilTW3y2LxVSfdQ0WRgCTtt8us3ahI"
)

YANI_AVATAR = (
    "https://blogger.googleusercontent.com/img/a/"
    "AVvXsEgkPXEo9bsccA1-IIT-KUyEuAKqHDr_TqUk-nmd4oksI3rhDnHSdk6f5W33CTttxhY2F1iowhoRqtd-PumQD7mnkhODarmDRto8UmhRwQuGaEAgSmC26uPA7euxu72oZ0wYTV6ALPHLEULM94dQodtfoq9TC7kXm8Zen1OY2zuAUvcdWQxnXvrgNyQw9WE"
)

PHOTOS = [
    {
        "url": (
            "https://blogger.googleusercontent.com/img/a/"
            "AVvXsEhTyb0qZmY95aWq6-RakR54gOYNpE9hEWR16cSyC1XoQEgwIXqo5vQ-PsEfa76HQVLXePooxZh9gZHVp06fZLNqN-OHXJxdXAEj0IJjrxPUXtFCO20FM63jRHEbE4-Vgn5qu7_inw74ZWajseRcLju5-E445F77V-orWlPr8ISSWq0c8BRMbODHxhNJKeM"
        ),
        "title": "Зимове побачення",
        "description": "Місто взимку."
    },
    {
        "url": (
            "https://blogger.googleusercontent.com/img/a/"
            "AVvXsEifDJmwK8i6s316LVL00g3Y-qkoJO2MacdIOjnUipglD1asNptF_Q6xGaJgfQszPce2lvV-pscnmLk2pc-l_pytcB8vSS-SnRFV6kY36_U7PmvcqGNLG7ZY-7DqpGfgBPM6i2CtqpJbxFWv_q78LfybAZRo8paMbIFPHe9uOORE_22wI6ynNWEU-mquax4"
        ),
        "title": "Літнє побачення",
        "description": "Село влітку."
    }
]


def new_state():
    return {
        "version": 2,
        "day": 1,
        "turn": 0,
        "model": DEFAULT_MODEL,
        "active": "akira",

        "relationship": {
            "love": 28,
            "trust": 32,
            "closeness": 18,
            "tension": 3,
            "identity": "знайомі"
        },

        "agents": {
            "akira": {
                "id": "akira",
                "name": "Акіра Бакенеко",
                "gender": "чоловік",
                "species": "людина",
                "avatar": AKIRA_AVATAR,
                "mood": "спокійний",
                "relationship_view": "симпатія",
                "private_memory": [
                    {
                        "text": "Яні мене зацікавила, хоча спочатку я не знаю, як вона до мене ставиться.",
                        "importance": 0.7
                    }
                ],
                "beliefs": [
                    {
                        "text": "Яні поки що обережна зі мною.",
                        "confidence": 0.55
                    }
                ],
                "protocol": [],
                "candidate": None
            },

            "yani": {
                "id": "yani",
                "name": "Яні Куронеко",
                "gender": "жінка",
                "species": "людинаоподібна котовуха істота",
                "avatar": YANI_AVATAR,
                "mood": "стримана",
                "relationship_view": "цікавість",
                "private_memory": [
                    {
                        "text": "Акіра поводиться зі мною уважно і не тисне на мене.",
                        "importance": 0.5
                    }
                ],
                "beliefs": [
                    {
                        "text": "Акіра ставиться до мене серйозніше, ніж показує.",
                        "confidence": 0.6
                    }
                ],
                "protocol": [],
                "candidate": None
            }
        },

        "shared_memories": [
            {
                "id": "shared-1",
                "day": 0,
                "title": "Перше знайомство",
                "summary": "Вони зустрілися й почали поступово цікавитися одне одним.",
                "emotion": "цікавість",
                "importance": 0.75,
                "mentions": 1,
                "facts": [
                    "Акіра зацікавився Яні першим.",
                    "Яні спочатку не поспішала зближуватися."
                ],
                "akira_recall": "Я одразу звернув на неї увагу.",
                "yani_recall": "Спочатку я просто спостерігала за ним."
            }
        ],

        "conversation": [],

        "current_event": None,

        "protocol": {
            "terms": [
                {
                    "term": "mi-su",
                    "meaning": "теплий момент між нами",
                    "confirmed": True,
                    "uses": 0
                },
                {
                    "term": "ya-ya",
                    "meaning": "я поруч",
                    "confirmed": True,
                    "uses": 0
                },
                {
                    "term": "ba-ko",
                    "meaning": "спільний маленький секрет",
                    "confirmed": True,
                    "uses": 0
                }
            ]
        },

        "log": []
    }


def load_state():
    if not os.path.exists(STATE_FILE):
        state = new_state()
        save_state(state)
        return state

    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            state = json.load(f)

        # М'яке відновлення відсутніх полів.
        fresh = new_state()

        for key, value in fresh.items():
            if key not in state:
                state[key] = value

        for agent_id in ("akira", "yani"):
            for key, value in fresh["agents"][agent_id].items():
                if key not in state["agents"][agent_id]:
                    state["agents"][agent_id][key] = value

        return state

    except Exception:
        broken = STATE_FILE + ".broken"
        try:
            os.replace(STATE_FILE, broken)
        except Exception:
            pass

        state = new_state()
        save_state(state)
        return state


def save_state(state):
    temp = STATE_FILE + ".tmp"

    with open(temp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

    os.replace(temp, STATE_FILE)


STATE = load_state()


def clamp(value, low=0, high=100):
    return max(low, min(high, value))


def clean_text(text, limit=1000):
    if not isinstance(text, str):
        return ""
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    return text[:limit]


def parse_json_response(text):
    if not text:
        raise ValueError("Модель повернула порожню відповідь.")

    text = text.strip()

    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))

    raise ValueError("Не вдалося розібрати JSON від моделі.")


def ollama_chat(model, messages, temperature=0.85):
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature
        }
    }

    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    request = urllib.request.Request(
        OLLAMA_URL + "/api/chat",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            raw = response.read().decode("utf-8")
            result = json.loads(raw)

        return result.get("message", {}).get("content", "")

    except urllib.error.URLError as e:
        raise RuntimeError(
            "Не вдалося підключитися до Ollama. "
            "Перевір, чи запущений Ollama."
        ) from e


def relevant_memories(state, agent_id):
    agent = state["agents"][agent_id]

    private = agent.get("private_memory", [])[-12:]
    beliefs = agent.get("beliefs", [])[-10:]

    shared = sorted(
        state.get("shared_memories", []),
        key=lambda x: (
            float(x.get("importance", 0)),
            int(x.get("mentions", 0))
        ),
        reverse=True
    )[:10]

    return {
        "private_memory": private,
        "beliefs": beliefs,
        "shared_memories": shared
    }


def recent_conversation(state, count=12):
    return state.get("conversation", [])[-count:]


def agent_system_prompt(state, agent_id):
    agent = state["agents"][agent_id]
    other_id = "yani" if agent_id == "akira" else "akira"
    other = state["agents"][other_id]

    if agent_id == "akira":
        lore = """
Ти — Акіра Бакенеко.
Ти чоловік і звичайна людина.
Ти зустрів Яні першим і закохався в неї раніше, ніж вона в тебе.
Ти не завжди прямо говориш про свої почуття. Коли емоції сильніші,
ти можеш ставати відвертішим.
Ти готовий докладати зусиль, щоб поступово будувати стосунки з Яні.
"""
    else:
        lore = """
Ти — Яні Куронеко.
Ти жінка, людино-подібна котовуха істота.
Спочатку Акіра не особливо тебе цікавив.
Згодом, спостерігаючи за ним та його ставленням до тебе,
ти поступово закохалася.
Ти можеш бути стриманою, іноді різкою або грайливою,
але твоє ставлення має розвиватися через досвід, а не бути незмінним.
"""

    return f"""
Ти є одним із двох незалежних персонажів у довготривалій симуляції
стосунків.

{lore}

Інший персонаж:
ім'я: {other["name"]}
стать: {other["gender"]}
вид: {other["species"]}

ВАЖЛИВО:
- Ти не є оповідачем.
- Не говори від імені іншого персонажа.
- Не вигадуй дії іншого персонажа, яких не було.
- Можеш робити припущення про його/її почуття, але позначай їх як власний висновок.
- Твої спогади можуть бути неповними або суб'єктивними.
- Якщо твоя попередня думка про іншого виявилася неправильною, ти можеш її змінити.
- Твої стосунки не мають миттєво переходити до "пара". Це має бути наслідком накопичення досвіду.
- Можна використовувати українську мову.
- Можна поступово використовувати власні скорочення/слова.
- Не створюй надмірно поетичні або неприродно ідеальні репліки.
- Не згадуй, що ти мовна модель, якщо це не стосується технічного інтерфейсу.
- Не показуй приховане міркування.
- Поле thought_summary має бути лише коротким поясненням результату, максимум 1-2 речення.

Поточний день симуляції: {state["day"]}
Поточний стан стосунків:
{json.dumps(state["relationship"], ensure_ascii=False)}

Твоє поточне ставлення до стосунків:
{agent.get("relationship_view", "невідомо")}

Твої пам'яті та висновки:
{json.dumps(relevant_memories(state, agent_id), ensure_ascii=False)}

Спільні слова/протокол:
{json.dumps(state.get("protocol", {}), ensure_ascii=False)}

Поточна подія:
{json.dumps(state.get("current_event"), ensure_ascii=False)}

Остання розмова:
{json.dumps(recent_conversation(state), ensure_ascii=False)}

Ти повинен повернути ЛИШЕ JSON такого типу:

{{
  "reply": "репліка персонажа",
  "mood": "короткий настрій",
  "thought_summary": "короткий підсумок того, що змінилося для персонажа",
  "private_memories": [
    {{
      "text": "короткий новий спогад",
      "importance": 0.0
    }}
  ],
  "belief_update": {{
    "text": "короткий новий висновок про іншого",
    "confidence": 0.0
  }},
  "relationship_delta": {{
    "love": 0,
    "trust": 0,
    "closeness": 0,
    "tension": 0
  }},
  "relationship_view": "знайомі | симпатія | романтичний інтерес | пара",
  "shared_memory_candidate": {{
    "should_propose": false,
    "title": "",
    "summary": "",
    "emotion": "",
    "importance": 0.0,
    "facts": []
  }},
  "protocol_proposal": {{
    "term": "",
    "meaning": "",
    "confidence": 0.0
  }}
}}

relationship_delta має бути невеликим:
зазвичай від -4 до +4.

Не створюй shared_memory_candidate лише тому, що була звичайна репліка.
Пропонуй спільний спогад, коли сталася помітна подія,
з'явився емоційно значущий момент або обоє персонажів явно
пов'язали подію зі своїми стосунками.
"""


def run_agent(state, agent_id):
    prompt = agent_system_prompt(state, agent_id)

    content = ollama_chat(
        state.get("model", DEFAULT_MODEL),
        [
            {
                "role": "system",
                "content": prompt
            },
            {
                "role": "user",
                "content": (
                    "Продовж взаємодію. Скажи одну природну репліку "
                    "іншому персонажу та онови власний стан пам'яті."
                )
            }
        ],
        temperature=0.9
    )

    data = parse_json_response(content)

    if not isinstance(data, dict):
        raise ValueError("Модель повернула неправильну структуру.")

    reply = clean_text(data.get("reply"), 700)

    if not reply:
        raise ValueError("Модель не повернула репліку.")

    return data


def add_private_memories(agent, items):
    if not isinstance(items, list):
        return

    for item in items[:3]:
        if not isinstance(item, dict):
            continue

        text = clean_text(item.get("text"), 500)

        if not text:
            continue

        try:
            importance = float(item.get("importance", 0.5))
        except Exception:
            importance = 0.5

        importance = max(0, min(1, importance))

        agent["private_memory"].append({
            "text": text,
            "importance": importance
        })

    agent["private_memory"] = agent["private_memory"][-40:]


def add_belief(agent, belief):
    if not isinstance(belief, dict):
        return

    text = clean_text(belief.get("text"), 500)

    if not text:
        return

    try:
        confidence = float(belief.get("confidence", 0.5))
    except Exception:
        confidence = 0.5

    confidence = max(0, min(1, confidence))

    agent["beliefs"].append({
        "text": text,
        "confidence": confidence
    })

    agent["beliefs"] = agent["beliefs"][-30:]


def update_relationship(state, delta):
    relationship = state["relationship"]

    for key in ("love", "trust", "closeness", "tension"):
        try:
            value = float(delta.get(key, 0))
        except Exception:
            value = 0

        relationship[key] = round(
            clamp(relationship[key] + value),
            2
        )

    # Трохи природніше: сильна довіра поступово зменшує напругу.
    if relationship["trust"] > 70:
        relationship["tension"] = clamp(
            relationship["tension"] - 0.5
        )


def relationship_rank(value):
    ranks = {
        "знайомі": 0,
        "симпатія": 1,
        "романтичний інтерес": 2,
        "пара": 3
    }

    return ranks.get(value, 0)


def update_relationship_identity(state):
    a = state["agents"]["akira"].get(
        "relationship_view", "знайомі"
    )
    y = state["agents"]["yani"].get(
        "relationship_view", "знайомі"
    )

    love = state["relationship"]["love"]
    trust = state["relationship"]["trust"]
    closeness = state["relationship"]["closeness"]

    # "Пара" з'являється тільки якщо обидва незалежно
    # почали бачити стосунки таким чином.
    if (
        a == "пара"
        and y == "пара"
        and love >= 62
        and trust >= 55
        and closeness >= 50
    ):
        state["relationship"]["identity"] = "пара"
        return

    if (
        relationship_rank(a) >= 2
        and relationship_rank(y) >= 2
    ):
        state["relationship"]["identity"] = "романтичний інтерес"
        return

    if (
        relationship_rank(a) >= 1
        or relationship_rank(y) >= 1
    ):
        state["relationship"]["identity"] = "симпатія"
        return

    state["relationship"]["identity"] = "знайомі"


def protocol_candidate(state, agent_id, proposal):
    if not isinstance(proposal, dict):
        return

    term = clean_text(proposal.get("term"), 40)
    meaning = clean_text(proposal.get("meaning"), 150)

    if not term or not meaning:
        return

    try:
        confidence = float(proposal.get("confidence", 0))
    except Exception:
        confidence = 0

    if confidence < 0.65:
        return

    agent = state["agents"][agent_id]

    agent["protocol"].append({
        "term": term,
        "meaning": meaning,
        "confidence": confidence
    })

    agent["protocol"] = agent["protocol"][-15:]


def maybe_confirm_protocol(state):
    proposals = {}

    for agent_id in ("akira", "yani"):
        for proposal in state["agents"][agent_id].get("protocol", []):
            term = proposal["term"].lower()
            proposals.setdefault(term, []).append(
                (agent_id, proposal)
            )

    for term, entries in proposals.items():
        ids = {entry[0] for entry in entries}

        if len(ids) < 2:
            continue

        meanings = [entry[1]["meaning"] for entry in entries]

        existing = next(
            (
                item for item in state["protocol"]["terms"]
                if item["term"].lower() == term
            ),
            None
        )

        if existing:
            existing["confirmed"] = True
            existing["uses"] += 1
            continue

        state["protocol"]["terms"].append({
            "term": term,
            "meaning": meanings[-1],
            "confirmed": True,
            "uses": 0
        })

        state["protocol"]["terms"] = state["protocol"]["terms"][-30:]


def build_shared_memory_prompt(state):
    akira_candidate = state["agents"]["akira"].get("candidate")
    yani_candidate = state["agents"]["yani"].get("candidate")

    return f"""
Ти — модуль консолідації пам'яті двох незалежних персонажів.

Твоє завдання — визначити, чи виник у них НОВИЙ СПІЛЬНИЙ СПОГАД.

Не вигадуй подію.
Використовуй тільки те, що реально є в поточній розмові,
поточній події та кандидатах пам'яті.

Акіра запропонував:
{json.dumps(akira_candidate, ensure_ascii=False)}

Яні запропонувала:
{json.dumps(yani_candidate, ensure_ascii=False)}

Поточна подія:
{json.dumps(state.get("current_event"), ensure_ascii=False)}

Останній обмін:
{json.dumps(state.get("conversation", [])[-6:], ensure_ascii=False)}

Існуючі спільні спогади:
{json.dumps(state.get("shared_memories", [])[-10:], ensure_ascii=False)}

Створи новий спільний спогад лише якщо:
1. подія достатньо конкретна;
2. вона справді стосується обох;
3. є емоційна або особиста значущість;
4. вона не є просто повтором уже існуючого спогаду.

Поверни ТІЛЬКИ JSON:

{{
  "create": false,
  "title": "",
  "summary": "",
  "emotion": "",
  "importance": 0.0,
  "facts": [],
  "akira_recall": "",
  "yani_recall": "",
  "reason": ""
}}
"""


def consolidate_shared_memory(state):
    a = state["agents"]["akira"].get("candidate")
    y = state["agents"]["yani"].get("candidate")

    if not a and not y:
        return None

    content = ollama_chat(
        state.get("model", DEFAULT_MODEL),
        [
            {
                "role": "system",
                "content": build_shared_memory_prompt(state)
            },
            {
                "role": "user",
                "content": "Перевір кандидати пам'яті та виконай консолідацію."
            }
        ],
        temperature=0.45
    )

    result = parse_json_response(content)

    if not result.get("create"):
        return None

    title = clean_text(result.get("title"), 120)
    summary = clean_text(result.get("summary"), 700)

    if not title or not summary:
        return None

    try:
        importance = float(result.get("importance", 0.5))
    except Exception:
        importance = 0.5

    importance = max(0, min(1, importance))

    memory = {
        "id": f"shared-{state['turn']}-{random.randint(1000, 9999)}",
        "day": state["day"],
        "title": title,
        "summary": summary,
        "emotion": clean_text(result.get("emotion"), 80),
        "importance": importance,
        "mentions": 1,
        "facts": [
            clean_text(x, 250)
            for x in result.get("facts", [])
            if clean_text(x, 250)
        ][:6],
        "akira_recall": clean_text(
            result.get("akira_recall"), 500
        ),
        "yani_recall": clean_text(
            result.get("yani_recall"), 500
        )
    }

    # Не дублюємо очевидно однаковий спогад.
    title_lower = title.lower()

    for old in state["shared_memories"]:
        old_title = old.get("title", "").lower()

        if title_lower == old_title:
            old["mentions"] += 1
            old["importance"] = max(
                old.get("importance", 0),
                importance
            )
            return old

    state["shared_memories"].append(memory)
    state["shared_memories"] = state["shared_memories"][-50:]

    return memory


def maybe_create_event(state):
    # Подія створюється не кожен хід.
    if state["turn"] == 0 or state["turn"] % 8 != 0:
        return None

    events = [
        {
            "type": "walk",
            "title": "Несподівана прогулянка",
            "description": (
                "Вони опинилися разом на вулиці після зміни погоди "
                "і вирішили трохи прогулятися замість того, щоб одразу "
                "розходитися."
            )
        },
        {
            "type": "photo",
            "title": "Стара фотографія",
            "description": (
                "Вони разом переглянули одну зі своїх фотографій "
                "і почали згадувати, що саме їм запам'яталося з того дня."
            )
        },
        {
            "type": "quiet",
            "title": "Тихий вечір",
            "description": (
                "Вони залишилися разом у спокійному місці без особливих "
                "планів і просто провели час поруч."
            )
        },
        {
            "type": "city",
            "title": "Місце з видом на місто",
            "description": (
                "Акіра та Яні знайшли місце, звідки добре видно місто, "
                "і затрималися там довше, ніж планували."
            )
        },
        {
            "type": "gift",
            "title": "Маленька дрібниця",
            "description": (
                "Один із них помітив маленьку річ, яка нагадала "
                "про іншого, і поділився нею."
            )
        }
    ]

    event = random.choice(events)

    # Додаємо фото до події інколи.
    if event["type"] == "photo":
        event["photo"] = random.choice(PHOTOS)

    state["current_event"] = event
    return event


def perform_turn(state):
    active = state["active"]

    # Нова подія іноді змінює контекст до відповіді.
    event = maybe_create_event(state)

    data = run_agent(state, active)

    agent = state["agents"][active]

    agent["mood"] = clean_text(
        data.get("mood", agent.get("mood", "спокійний")),
        80
    )

    agent["relationship_view"] = clean_text(
        data.get(
            "relationship_view",
            agent.get("relationship_view", "знайомі")
        ),
        60
    )

    add_private_memories(
        agent,
        data.get("private_memories", [])
    )

    add_belief(
        agent,
        data.get("belief_update")
    )

    update_relationship(
        state,
        data.get("relationship_delta", {})
    )

    protocol_candidate(
        state,
        active,
        data.get("protocol_proposal")
    )

    agent["candidate"] = data.get(
        "shared_memory_candidate"
    )

    state["conversation"].append({
        "speaker": active,
        "name": agent["name"],
        "text": clean_text(data.get("reply"), 700),
        "day": state["day"],
        "turn": state["turn"] + 1
    })

    state["turn"] += 1

    # Після другого учасника завершуємо обмін.
    if active == "yani":
        try:
            shared = consolidate_shared_memory(state)
        except Exception as e:
            shared = None
            state["log"].append({
                "type": "memory_error",
                "message": str(e)
            })

        if shared:
            state["log"].append({
                "type": "new_shared_memory",
                "memory": shared
            })

        maybe_confirm_protocol()

        state["agents"]["akira"]["candidate"] = None
        state["agents"]["yani"]["candidate"] = None

        state["day"] += 1

    state["active"] = "yani" if active == "akira" else "akira"

    update_relationship_identity(state)

    # Старі події поступово зникають з активного контексту.
    if state["turn"] % 4 == 0:
        state["current_event"] = None

    save_state(state)

    return {
        "state": state,
        "event": event,
        "speaker": active
    }


class Handler(SimpleHTTPRequestHandler):

    def send_json(self, data, status=200):
        raw = json.dumps(
            data,
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(status)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header(
            "Content-Length",
            str(len(raw))
        )
        self.end_headers()

        self.wfile.write(raw)

    def read_json(self):
        length = int(
            self.headers.get("Content-Length", "0")
        )

        raw = self.rfile.read(length)

        if not raw:
            return {}

        return json.loads(
            raw.decode("utf-8")
        )

    def do_GET(self):

        if self.path == "/api/state":
            with LOCK:
                self.send_json(STATE)
            return

        if self.path == "/api/models":
            try:
                request = urllib.request.Request(
                    OLLAMA_URL + "/api/tags"
                )

                with urllib.request.urlopen(
                    request,
                    timeout=10
                ) as response:
                    data = json.loads(
                        response.read().decode("utf-8")
                    )

                models = [
                    item.get("name")
                    for item in data.get("models", [])
                    if item.get("name")
                ]

                self.send_json({
                    "ok": True,
                    "models": models
                })

            except Exception as e:
                self.send_json({
                    "ok": False,
                    "models": [],
                    "error": str(e)
                }, 503)

            return

        if self.path == "/api/health":
            try:
                request = urllib.request.Request(
                    OLLAMA_URL + "/api/tags"
                )

                with urllib.request.urlopen(
                    request,
                    timeout=5
                ):
                    pass

                self.send_json({
                    "ok": True
                })

            except Exception as e:
                self.send_json({
                    "ok": False,
                    "error": str(e)
                }, 503)

            return

        return super().do_GET()

    def do_POST(self):

        global STATE

        if self.path == "/api/step":
            try:
                with LOCK:
                    result = perform_turn(STATE)

                self.send_json({
                    "ok": True,
                    **result
                })

            except Exception as e:
                self.send_json({
                    "ok": False,
                    "error": str(e)
                }, 500)

            return

        if self.path == "/api/reset":
            with LOCK:
                STATE = new_state()
                save_state(STATE)

            self.send_json({
                "ok": True,
                "state": STATE
            })

            return

        if self.path == "/api/model":
            try:
                body = self.read_json()
                model = clean_text(
                    body.get("model"),
                    120
                )

                if not model:
                    raise ValueError("Не вказано модель.")

                with LOCK:
                    STATE["model"] = model
                    save_state(STATE)

                self.send_json({
                    "ok": True,
                    "model": model
                })

            except Exception as e:
                self.send_json({
                    "ok": False,
                    "error": str(e)
                }, 400)

            return

        self.send_json({
            "ok": False,
            "error": "Unknown API endpoint"
        }, 404)


if __name__ == "__main__":
    print()
    print("========================================")
    print("       AI COUPLE LAB")
    print("========================================")
    print(f"Local server: http://{HOST}:{PORT}")
    print(f"Ollama:       {OLLAMA_URL}")
    print(f"Model:        {STATE.get('model', DEFAULT_MODEL)}")
    print()
    print("Відкрий у браузері:")
    print(f"http://{HOST}:{PORT}")
    print()
    print("Для зупинки натисни Ctrl+C.")
    print("========================================")
    print()

    server = ThreadingHTTPServer(
        (HOST, PORT),
        Handler
    )

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()