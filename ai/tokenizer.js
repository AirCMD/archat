// ai/tokenizer.js
//
// Tokenizer for SmolLM2-135M-Instruct.
// tokenizer.json береться безпосередньо з Hugging Face.
// Нічого вручну завантажувати не потрібно.

const TOKENIZER_URL =
    "https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/resolve/main/tokenizer.json";

class SmolTokenizer {
    constructor() {
        this.data = null;
        this.vocab = null;
        this.idToToken = null;
        this.loaded = false;
    }

    async load() {
        if (this.loaded) return;

        console.log("[Tokenizer] Завантаження tokenizer.json...");

        const response = await fetch(TOKENIZER_URL);

        if (!response.ok) {
            throw new Error(
                `Не вдалося завантажити tokenizer.json: HTTP ${response.status}`
            );
        }

        this.data = await response.json();

        if (!this.data.model) {
            throw new Error("У tokenizer.json не знайдено model.");
        }

        if (!this.data.model.vocab) {
            throw new Error("У tokenizer.json не знайдено vocab.");
        }

        this.vocab = this.data.model.vocab;

        this.idToToken = new Array(
            Object.keys(this.vocab).length
        );

        for (const [token, id] of Object.entries(this.vocab)) {
            this.idToToken[id] = token;
        }

        this.loaded = true;

        console.log(
            `[Tokenizer] Готово. Vocabulary: ${this.idToToken.length} токенів`
        );
    }

    encode(text) {
        if (!this.loaded) {
            throw new Error("Tokenizer ще не завантажений.");
        }

        /*
         * Поки що це навмисно окремий етап.
         *
         * SmolLM2 використовує GPT-2-подібний tokenizer/BPE.
         * Сам BPE-алгоритм ми реалізуємо далі на основі
         * merge-правил із tokenizer.json.
         */

        return this.basicEncode(text);
    }

    basicEncode(text) {
        /*
         * Тимчасовий базовий режим.
         *
         * Він НЕ є фінальним токенізатором моделі.
         * Потрібен лише для перевірки, що tokenizer.json
         * успішно завантажується та читається.
         */

        const result = [];

        for (const char of text) {
            const id = this.vocab[char];

            if (id !== undefined) {
                result.push(id);
            }
        }

        return result;
    }

    decode(ids) {
        if (!this.loaded) {
            throw new Error("Tokenizer ще не завантажений.");
        }

        return ids
            .map(id => this.idToToken[id] ?? "")
            .join("");
    }
}

window.SmolTokenizer = SmolTokenizer;