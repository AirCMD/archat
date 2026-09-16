import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8000

OLLAMA_URL = "http://127.0.0.1:11434"
DEFAULT_MODEL = "qwen3:4b"

STATE_FILE = "couple_state.json"


AKIRA_AVATAR = "https://blogger.googleusercontent.com/img/a/AVvXsEg6TLuKwTa6G7t32SgZE9RiJp5vLqOOqtC7lBHiLXIjBZOZAx1Dku1fWM8x_bc1lXwA1pF32pojhJW02L1BxI3oJfuvwBhC6i9Di0zPVQhzLcGslTae08Qe-4bRNEtHajGweOmDs9Snij-8QDCseC7KCckbjuGosEilTW3y2LxVSfdQ0WRgCTtt8us3ahI"

YANI_AVATAR = "https://blogger.googleusercontent.com/img/a/AVvXsEgkPXEo9bsccA1-IIT-KUyEuAKqHDr_TqUk-nmd4oksI3rhDnHSdk6f5W33CTttxhY2F1iowhoRqtd-PumQD7mnkhODarmDRto8UmhRwQuGaEAgSmC26uPA7euxu72oZ0wYTV6ALPHLEULM94dQodtfoq9TC7kXm8Zen1OY2zuAUvcdWQxnXvrgNyQw9WE"

WINTER_PHOTO = "https://blogger.googleusercontent.com/img/a/AVvXsEhTyb0qZmY95aWq6-RakR54gOYNpE9hEWR16cSyC1XoQEgwIXqo5vQ-PsEfa76HQVLXePooxZh9gZHVp06fZLNqN-OHXJxdXAEj0IJjrxPUXtFCO20FM63jRHEbE4-Vgn5qu7_inw74ZWajseRcLju5-E445F77V-orWlPr8ISSWq0c8BRMbODHxhNJKeM"

SUMMER_PHOTO = "https://blogger.googleusercontent.com/img/a/AVvXsEifDJmwK8i6s316LVL00g3Y-qkoJO2MacdIOjnUipglD1asNptF_Q6xGaJgfQszPce2lvV-pscnmLk2pc-l_pytcB8vSS-SnRFV6kY36_U7PmvcqGNLG7ZY-7DqpGfgBPM6i2CtqpJbxFWv_q78LfybAZRo8paMbIFPHe9uOORE_22wI6ynNWEU-mquax4"


def new_state():
    return {
        "model": DEFAULT_MODEL,

        "turn": 0,

        "agents": {
            "akira": {
                "name": "Акіра Бакенеко",
                "gender": "чоловік",
                "species": "людина",
                "avatar": AKIRA_AVATAR,

                "private_memory": [],
                "beliefs": [],
                "relationship_view": "знайомі",
                "mood": "спокійний",
                "candidate": None
            },

            "yani": {
                "name": "Яні Куронеко",
                "gender": "жінка",
                "species": "людиноподібна кішка",
                "avatar": YANI_AVATAR,

                "private_memory": [],
                "beliefs": [],
                "relationship_view": "знайомі",
                "mood": "спокійна",
                "candidate": None
            }
        },

        "relationship": {
            "love": 0,
            "trust": 20,
            "closeness": 10,
            "tension": 0,
            "identity": "знайомі"
        },

        "shared_memories": [],

        "conversation": [],

        "protocol": {
            "confirmed_terms": [],
            "candidates": []
        },

        "current_event": None
    }


def load_state():
    if not os.path.exists(STATE_FILE):
        return new_state()

    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return new_state()


STATE = load_state()


def save_state():
    temp_file = STATE_FILE + ".tmp"

    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(
            STATE,
            f,
            ensure_ascii=False,
            indent=2
        )

    os.replace(temp_file, STATE_FILE)


def ollama_chat(messages, model=None, temperature=0.8):
    """
    Використовуємо саме /api/chat.

    think=False:
    - не просимо модель генерувати thinking;
    - thinking не показується користувачу;
    - беремо тільки message.content.
    """

    if model is None:
        model = STATE.get("model", DEFAULT_MODEL)

    payload = {
        "model": model,
        "messages": messages,

        # КЛЮЧОВЕ:
        "think": False,

        "stream": False,

        "options": {
            "temperature": temperature
        }
    }

    data = json.dumps(
        payload,
        ensure_ascii=False
    ).encode("utf-8")

    request = urllib.request.Request(
        OLLAMA_URL + "/api/chat",
        data=data,
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=300
        ) as response:

            raw = response.read().decode("utf-8")
            result = json.loads(raw)

    except urllib.error.URLError as e:
        raise RuntimeError(
            "Не вдалося підключитися до Ollama. "
            "Переконайся, що Ollama запущена."
        ) from e

    except Exception as e:
        raise RuntimeError(
            f"Помилка Ollama: {e}"
        ) from e

    message = result.get("message", {})

    # Навмисно НЕ використовуємо message["thinking"].
    content = message.get("content", "")

    return content.strip()


def clean_json_text(text):
    text = text.strip()

    if text.startswith("```"):
        lines = text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    return text


def parse_agent_json(text):
    text = clean_json_text(text)

    try:
        return json.loads(text)
    except Exception:
        pass

    # Спроба знайти перший JSON-об'єкт
    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1 and end > start:
        fragment = text[start:end + 1]

        try:
            return json.loads(fragment)
        except Exception:
            pass

    # Безпечний fallback
    return {
        "reply": text,
        "mood": "замислений",
        "thought_summary": "",
        "private_memories": [],
        "belief_update": "",
        "relationship_delta": {},
        "relationship_view": "знайомі",
        "shared_memory_candidate": None,
        "protocol_proposal": None
    }


def agent_prompt(agent_key):
    if agent_key == "akira":
        return """
Ти — Акіра Бакенеко.

Ти чоловік і людина.
Ти окрема автономна мовна сутність у симуляції.
Ти маєш власну пам'ять, власні висновки та власне ставлення до Яні.

Яні Куронеко — жінка-людиноподібна кішка.

Не приписуй собі думки Яні.
Не говори від імені Яні.
Не вирішуй наперед, що Яні тебе кохає.

Твої почуття та ставлення повинні розвиватися поступово на основі історії взаємодії.

Важливо:
- не потрібно писати внутрішній ланцюжок міркувань;
- поле thought_summary має бути дуже коротким описом стану, а не reasoning;
- відповідь повинна бути природною реплікою персонажа;
- не згадуй Ollama, модель, JSON або програму.

Ти можеш:
- запам'ятовувати важливі події;
- формувати приватні висновки про Яні;
- змінювати довіру, близькість, любов або напруження;
- пропонувати нові слова чи вирази;
- формувати кандидата на спільний спогад.

Не створюй спільний спогад автоматично.
Лише запропонуй його як candidate, якщо подія справді важлива для вас обох.
"""

    return """
Ти — Яні Куронеко.

Ти жінка і людина-кішкоподібна істота.
Ти окрема автономна мовна сутність у симуляції.
Ти маєш власну пам'ять, власні висновки та власне ставлення до Акіри.

Акіра Бакенеко — чоловік і людина.

Не приписуй собі думки Акіри.
Не говори від його імені.
Не вирішуй наперед, що Акіра тебе кохає.

Твої почуття та ставлення повинні розвиватися поступово на основі історії взаємодії.

Важливо:
- не потрібно писати внутрішній ланцюжок міркувань;
- поле thought_summary має бути дуже коротким описом стану, а не reasoning;
- відповідь повинна бути природною реплікою персонажа;
- не згадуй Ollama, модель, JSON або програму.

Ти можеш:
- запам'ятовувати важливі події;
- формувати приватні висновки про Акіру;
- змінювати довіру, близькість, любов або напруження;
- пропонувати нові слова чи вирази;
- формувати кандидата на спільний спогад.

Не створюй спільний спогад автоматично.
Лише запропонуй його як candidate, якщо подія справді важлива для вас обох.
"""


def build_context(agent_key):
    other_key = "yani" if agent_key == "akira" else "akira"

    me = STATE["agents"][agent_key]
    other = STATE["agents"][other_key]

    recent_conversation = STATE["conversation"][-12:]

    return {
        "my_private_memory": me["private_memory"][-20:],
        "my_beliefs": me["beliefs"][-20:],

        "other_public_identity": {
            "name": other["name"],
            "gender": other["gender"],
            "species": other["species"]
        },

        "my_relationship_view": me["relationship_view"],

        "relationship_state": STATE["relationship"],

        "confirmed_shared_protocol": STATE["protocol"]["confirmed_terms"],

        "recent_shared_memories": STATE["shared_memories"][-10:],

        "recent_conversation": recent_conversation,

        "current_event": STATE["current_event"]
    }


def ask_agent(agent_key):
    agent = STATE["agents"][agent_key]

    system_prompt = agent_prompt(agent_key)

    context = build_context(agent_key)

    user_prompt = f"""
Ось поточний стан симуляції:

{json.dumps(context, ensure_ascii=False, indent=2)}

Продовж взаємодію з іншою людиною.

Поверни ТІЛЬКИ валідний JSON.

Формат:

{{
  "reply": "репліка персонажа",
  "mood": "короткий опис настрою",
  "thought_summary": "дуже коротко: що персонаж зараз відчуває або усвідомлює, без ланцюжка міркувань",
  "private_memories": [
    "новий приватний спогад, якщо він справді важливий"
  ],
  "belief_update": "новий приватний висновок про іншу людину або порожній рядок",
  "relationship_delta": {{
    "love": 0,
    "trust": 0,
    "closeness": 0,
    "tension": 0
  }},
  "relationship_view": "знайомі",
  "shared_memory_candidate": null,
  "protocol_proposal": null
}}

relationship_view може бути лише:
- "знайомі"
- "симпатія"
- "романтичний інтерес"
- "пара"

Не переходь одразу до "пара", якщо історія цього не обґрунтовує.

shared_memory_candidate може бути null або:

{{
  "title": "...",
  "summary": "...",
  "emotion": "...",
  "importance": 1,
  "mentions": ["..."],
  "facts": ["..."]
}}

protocol_proposal може бути null або:

{{
  "term": "...",
  "meaning": "..."
}}

Нове слово не стає спільним автоматично.
"""

    raw = ollama_chat(
        [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        temperature=0.85
    )

    return parse_agent_json(raw)


def clamp(value, low=0, high=100):
    return max(low, min(high, value))


def apply_relationship_delta(delta):
    relationship = STATE["relationship"]

    for key in [
        "love",
        "trust",
        "closeness",
        "tension"
    ]:
        try:
            amount = int(delta.get(key, 0))
        except Exception:
            amount = 0

        relationship[key] = clamp(
            relationship.get(key, 0) + amount
        )


def add_private_memory(agent_key, memories):
    if not isinstance(memories, list):
        return

    target = STATE["agents"][agent_key]["private_memory"]

    for memory in memories:
        if not isinstance(memory, str):
            continue

        memory = memory.strip()

        if not memory:
            continue

        if memory not in target:
            target.append(memory)

    del target[:-50]


def update_belief(agent_key, belief):
    if not isinstance(belief, str):
        return

    belief = belief.strip()

    if not belief:
        return

    beliefs = STATE["agents"][agent_key]["beliefs"]

    if belief not in beliefs:
        beliefs.append(belief)

    del beliefs[:-50]


def update_protocol(agent_key, proposal):
    if not isinstance(proposal, dict):
        return

    term = str(
        proposal.get("term", "")
    ).strip()

    meaning = str(
        proposal.get("meaning", "")
    ).strip()

    if not term or not meaning:
        return

    candidate = STATE["protocol"]["candidates"]

    # Якщо цей агент уже запропонував термін
    for item in candidate:
        if item["term"].lower() == term.lower():
            item["agents"].append(agent_key)

            if "akira" in item["agents"] and "yani" in item["agents"]:
                if term not in STATE["protocol"]["confirmed_terms"]:
                    STATE["protocol"]["confirmed_terms"].append(term)

            return

    candidate.append({
        "term": term,
        "meaning": meaning,
        "agents": [agent_key]
    })


def update_identity():
    akira_view = STATE["agents"]["akira"]["relationship_view"]
    yani_view = STATE["agents"]["yani"]["relationship_view"]

    r = STATE["relationship"]

    if (
        akira_view == "пара"
        and yani_view == "пара"
        and r["love"] >= 62
        and r["trust"] >= 55
        and r["closeness"] >= 50
    ):
        r["identity"] = "пара"

    elif (
        akira_view == "романтичний інтерес"
        or yani_view == "романтичний інтерес"
        or akira_view == "пара"
        or yani_view == "пара"
    ):
        r["identity"] = "романтичний інтерес"

    elif (
        akira_view == "симпатія"
        or yani_view == "симпатія"
    ):
        r["identity"] = "симпатія"

    else:
        r["identity"] = "знайомі"


def consolidate_shared_memory():
    candidates = []

    for key in ["akira", "yani"]:
        candidate = STATE["agents"][key].get(
            "candidate"
        )

        if candidate:
            candidates.append({
                "agent": key,
                "candidate": candidate
            })

    if not candidates:
        return

    prompt = f"""
Ти — модуль формування спільної пам'яті.

Є дві незалежні пропозиції:

{json.dumps(candidates, ensure_ascii=False, indent=2)}

Виріши, чи описують вони одну й ту саму важливу подію.

Створи спільний спогад ТІЛЬКИ якщо:
1. пропозиції справді стосуються однієї події;
2. подія важлива для обох;
3. її можна вважати спільним досвідом.

Якщо ні — поверни null.

Поверни ТІЛЬКИ JSON:

{{
  "shared": true,
  "memory": {{
    "title": "...",
    "summary": "...",
    "emotion": "...",
    "importance": 1,
    "mentions": [],
    "facts": [],
    "akira_recollection": "...",
    "yani_recollection": "..."
  }}
}}

Або:

null
"""

    raw = ollama_chat(
        [
            {
                "role": "system",
                "content": "Ти працюєш без thinking. Поверни лише JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3
    )

    result = parse_agent_json(raw)

    if not result:
        return

    if not result.get("shared"):
        return

    memory = result.get("memory")

    if not isinstance(memory, dict):
        return

    memory["turn"] = STATE["turn"]

    STATE["shared_memories"].append(memory)

    STATE["shared_memories"] = \
        STATE["shared_memories"][-30:]


def make_event():
    events = [
        {
            "title": "Несподівана прогулянка",
            "description": "Вони випадково опинилися разом на тихій вулиці міста."
        },
        {
            "title": "Стара фотографія",
            "description": "Їм трапилася стара фотографія, яка викликала розмову про минуле."
        },
        {
            "title": "Тихий вечір",
            "description": "Вони проводять спокійний вечір без конкретних планів."
        },
        {
            "title": "Місце з видом на місто",
            "description": "Вони знайшли місце, звідки добре видно вечірнє місто."
        },
        {
            "title": "Маленька дрібниця",
            "description": "Один із них помітив маленьку деталь, яку інші могли б не помітити."
        }
    ]

    return events[
        STATE["turn"] // 8 % len(events)
    ]


def do_step():
    STATE["turn"] += 1

    if STATE["turn"] % 8 == 1:
        STATE["current_event"] = make_event()

    # Спочатку говорить Акіра
    akira_result = ask_agent("akira")

    STATE["agents"]["akira"]["candidate"] = \
        akira_result.get("shared_memory_candidate")

    STATE["agents"]["akira"]["mood"] = \
        akira_result.get("mood", "спокійний")

    STATE["agents"]["akira"]["relationship_view"] = \
        akira_result.get(
            "relationship_view",
            STATE["agents"]["akira"]["relationship_view"]
        )

    add_private_memory(
        "akira",
        akira_result.get("private_memories", [])
    )

    update_belief(
        "akira",
        akira_result.get("belief_update", "")
    )

    update_protocol(
        "akira",
        akira_result.get("protocol_proposal")
    )

    apply_relationship_delta(
        akira_result.get("relationship_delta", {})
    )

    STATE["conversation"].append({
        "turn": STATE["turn"],
        "speaker": "akira",
        "text": akira_result.get(
            "reply",
            ""
        ),
        "mood": akira_result.get(
            "mood",
            ""
        )
    })

    # Потім Яні бачить уже відповідь Акіри
    yani_result = ask_agent("yani")

    STATE["agents"]["yani"]["candidate"] = \
        yani_result.get("shared_memory_candidate")

    STATE["agents"]["yani"]["mood"] = \
        yani_result.get("mood", "спокійна")

    STATE["agents"]["yani"]["relationship_view"] = \
        yani_result.get(
            "relationship_view",
            STATE["agents"]["yani"]["relationship_view"]
        )

    add_private_memory(
        "yani",
        yani_result.get("private_memories", [])
    )

    update_belief(
        "yani",
        yani_result.get("belief_update", "")
    )

    update_protocol(
        "yani",
        yani_result.get("protocol_proposal")
    )

    apply_relationship_delta(
        yani_result.get("relationship_delta", {})
    )

    STATE["conversation"].append({
        "turn": STATE["turn"],
        "speaker": "yani",
        "text": yani_result.get(
            "reply",
            ""
        ),
        "mood": yani_result.get(
            "mood",
            ""
        )
    })

    # Перевіряємо, чи можуть дві приватні версії події
    # стати одним спільним спогадом.
    consolidate_shared_memory()

    update_identity()

    # Старі кандидатури очищаємо
    STATE["agents"]["akira"]["candidate"] = None
    STATE["agents"]["yani"]["candidate"] = None

    STATE["conversation"] = \
        STATE["conversation"][-100:]

    save_state()

    return STATE


class Handler(BaseHTTPRequestHandler):

    def _send_json(self, data, status=200):
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

        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )

        self.end_headers()

        self.wfile.write(raw)

    def _read_json(self):
        length = int(
            self.headers.get(
                "Content-Length",
                "0"
            )
        )

        if length == 0:
            return {}

        raw = self.rfile.read(length)

        return json.loads(
            raw.decode("utf-8")
        )

    def do_GET(self):

        if self.path == "/api/state":
            self._send_json(STATE)
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
                    ollama_ok = True

            except Exception:
                ollama_ok = False

            self._send_json({
                "server": True,
                "ollama": ollama_ok,
                "model": STATE.get(
                    "model",
                    DEFAULT_MODEL
                )
            })

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
                    for item in data.get(
                        "models",
                        []
                    )
                ]

                self._send_json({
                    "models": models
                })

            except Exception as e:
                self._send_json({
                    "models": [],
                    "error": str(e)
                })

            return

        self.send_error(404)

    def do_POST(self):

        try:

            if self.path == "/api/step":
                result = do_step()

                self._send_json(result)
                return

            if self.path == "/api/reset":

                global STATE

                STATE = new_state()

                save_state()

                self._send_json(STATE)

                return

            if self.path == "/api/model":

                data = self._read_json()

                model = str(
                    data.get(
                        "model",
                        DEFAULT_MODEL
                    )
                ).strip()

                if model:
                    STATE["model"] = model
                    save_state()

                self._send_json({
                    "ok": True,
                    "model": STATE["model"]
                })

                return

            self.send_error(404)

        except Exception as e:

            self._send_json(
                {
                    "error": str(e)
                },
                status=500
            )


if __name__ == "__main__":

    print()
    print("======================================")
    print("       AI COUPLE LAB SERVER")
    print("======================================")
    print()
    print(f"Local server: http://{HOST}:{PORT}")
    print(f"Ollama:       {OLLAMA_URL}")
    print(f"Model:        {STATE.get('model', DEFAULT_MODEL)}")
    print()
    print("Thinking: OFF")
    print()
    print("Open index.html through:")
    print(f"http://{HOST}:{PORT}")
    print()
    print("Press Ctrl+C to stop.")
    print()

    server = ThreadingHTTPServer(
        (HOST, PORT),
        Handler
    )

    try:
        server.serve_forever()

    except KeyboardInterrupt:
        print("\nStopping...")

    finally:
        server.server_close()