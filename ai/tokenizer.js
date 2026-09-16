// ai/tokenizer.js
//
// Самостійна реалізація GPT-2 / Byte-Level BPE
// для SmolLM2-135M-Instruct.
//
// tokenizer.json завантажується напряму з Hugging Face.
// Додаткових бібліотек не потрібно.

const TOKENIZER_URL =
    "https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/resolve/main/tokenizer.json";


class SmolTokenizer {

    constructor() {
        this.data = null;

        this.vocab = null;
        this.idToToken = null;

        this.merges = null;
        this.mergeRanks = null;

        this.byteEncoder = null;
        this.byteDecoder = null;

        this.specialTokens = new Map();
        this.specialTokenIds = new Set();

        this.cache = new Map();

        this.loaded = false;
    }


    // ------------------------------------------------------------
    // LOAD
    // ------------------------------------------------------------

    async load() {

        if (this.loaded) {
            return;
        }

        console.log("[Tokenizer] Завантаження tokenizer.json...");

        const response = await fetch(TOKENIZER_URL);

        if (!response.ok) {
            throw new Error(
                `Tokenizer HTTP ${response.status}`
            );
        }

        this.data = await response.json();

        this.readVocabulary();
        this.readMerges();
        this.buildByteTables();
        this.readSpecialTokens();

        this.loaded = true;

        console.log(
            `[Tokenizer] Готово. Vocabulary: ${this.idToToken.length}`
        );

        console.log(
            `[Tokenizer] BPE merges: ${this.merges.length}`
        );

        console.log(
            `[Tokenizer] Special tokens: ${this.specialTokens.size}`
        );
    }


    // ------------------------------------------------------------
    // VOCABULARY
    // ------------------------------------------------------------

    readVocabulary() {

        const vocab = this.data?.model?.vocab;

        if (!vocab) {
            throw new Error(
                "У tokenizer.json не знайдено model.vocab."
            );
        }

        this.vocab = vocab;

        const maxId = Math.max(
            ...Object.values(vocab)
        );

        this.idToToken = new Array(maxId + 1);

        for (const [token, id] of Object.entries(vocab)) {
            this.idToToken[id] = token;
        }
    }


    // ------------------------------------------------------------
    // BPE MERGES
    // ------------------------------------------------------------

    readMerges() {

        const merges = this.data?.model?.merges;

        if (!Array.isArray(merges)) {
            throw new Error(
                "У tokenizer.json не знайдено model.merges."
            );
        }

        this.merges = merges;

        this.mergeRanks = new Map();

        for (let i = 0; i < merges.length; i++) {

            let left;
            let right;

            const merge = merges[i];

            if (Array.isArray(merge)) {
                [left, right] = merge;
            } else {
                const parts = merge.split(" ");

                left = parts[0];
                right = parts[1];
            }

            this.mergeRanks.set(
                `${left}\u0000${right}`,
                i
            );
        }
    }


    // ------------------------------------------------------------
    // GPT-2 BYTE ENCODER
    // ------------------------------------------------------------

    buildByteTables() {

        /*
         * GPT-2 використовує спеціальне відображення:
         *
         * UTF-8 bytes
         *      ↓
         * Unicode characters
         *
         * Наприклад пробіл перетворюється на "Ġ".
         */

        const bs = [];

        for (let i = 33; i <= 126; i++) {
            bs.push(i);
        }

        for (let i = 161; i <= 172; i++) {
            bs.push(i);
        }

        for (let i = 174; i <= 255; i++) {
            bs.push(i);
        }

        const cs = [...bs];

        let n = 0;

        for (let b = 0; b < 256; b++) {

            if (!bs.includes(b)) {

                bs.push(b);
                cs.push(256 + n);

                n++;
            }
        }

        this.byteEncoder = new Map();
        this.byteDecoder = new Map();

        for (let i = 0; i < bs.length; i++) {

            const byteValue = bs[i];
            const charValue = String.fromCharCode(cs[i]);

            this.byteEncoder.set(
                byteValue,
                charValue
            );

            this.byteDecoder.set(
                charValue,
                byteValue
            );
        }
    }


    // ------------------------------------------------------------
    // SPECIAL TOKENS
    // ------------------------------------------------------------

    readSpecialTokens() {

        const addedTokens =
            this.data?.added_tokens || [];

        for (const item of addedTokens) {

            if (
                typeof item.id !== "number" ||
                typeof item.content !== "string"
            ) {
                continue;
            }

            this.specialTokens.set(
                item.content,
                item.id
            );

            this.specialTokenIds.add(
                item.id
            );
        }

        // Додаткова страховка для основних SmolLM2 tokens.

        const knownSpecials = [
            "<|endoftext|>",
            "<|im_start|>",
            "<|im_end|>"
        ];

        for (const token of knownSpecials) {

            const id = this.vocab[token];

            if (id !== undefined) {

                this.specialTokens.set(
                    token,
                    id
                );

                this.specialTokenIds.add(id);
            }
        }
    }


    // ------------------------------------------------------------
    // UTF-8 → GPT-2 BYTE REPRESENTATION
    // ------------------------------------------------------------

    bytesToUnicodeString(bytes) {

        let result = "";

        for (const byte of bytes) {

            const char =
                this.byteEncoder.get(byte);

            if (char === undefined) {
                throw new Error(
                    `Невідомий byte: ${byte}`
                );
            }

            result += char;
        }

        return result;
    }


    // ------------------------------------------------------------
    // GPT-2 PRETOKENIZATION
    // ------------------------------------------------------------

    splitText(text) {

        /*
         * Це regex, який використовується GPT-2-подібними
         * Byte-Level BPE tokenizer'ами.
         *
         * Він окремо обробляє:
         * - скорочення
         * - слова
         * - числа
         * - пунктуацію
         * - пробіли
         */

        const regex =
            /'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

        return text.match(regex) || [];
    }


    // ------------------------------------------------------------
    // BPE
    // ------------------------------------------------------------

    bpe(token) {

        if (this.cache.has(token)) {
            return this.cache.get(token);
        }

        if (token.length === 0) {
            return [];
        }

        let symbols = [...token];

        if (symbols.length === 1) {

            this.cache.set(
                token,
                symbols
            );

            return symbols;
        }

        while (symbols.length > 1) {

            let bestPair = null;
            let bestRank = Infinity;

            for (let i = 0; i < symbols.length - 1; i++) {

                const left = symbols[i];
                const right = symbols[i + 1];

                const rank =
                    this.mergeRanks.get(
                        `${left}\u0000${right}`
                    );

                if (
                    rank !== undefined &&
                    rank < bestRank
                ) {
                    bestRank = rank;

                    bestPair = [
                        left,
                        right
                    ];
                }
            }

            if (bestPair === null) {
                break;
            }

            const merged = [];

            let i = 0;

            while (i < symbols.length) {

                if (
                    i < symbols.length - 1 &&
                    symbols[i] === bestPair[0] &&
                    symbols[i + 1] === bestPair[1]
                ) {

                    merged.push(
                        symbols[i] + symbols[i + 1]
                    );

                    i += 2;

                } else {

                    merged.push(
                        symbols[i]
                    );

                    i++;
                }
            }

            symbols = merged;
        }

        this.cache.set(
            token,
            symbols
        );

        return symbols;
    }


    // ------------------------------------------------------------
    // STRING → BYTES
    // ------------------------------------------------------------

    utf8Bytes(text) {

        return Array.from(
            new TextEncoder().encode(text)
        );
    }


    // ------------------------------------------------------------
    // ENCODE
    // ------------------------------------------------------------

    encode(text, options = {}) {

        if (!this.loaded) {
            throw new Error(
                "Tokenizer ще не завантажений."
            );
        }

        if (typeof text !== "string") {
            text = String(text);
        }

        const tokens = [];

        /*
         * Спочатку перевіряємо special tokens.
         *
         * Наприклад:
         *
         * <|im_start|>
         * <|im_end|>
         */

        const chunks =
            this.splitSpecialTokens(text);

        for (const chunk of chunks) {

            if (chunk.special) {

                const id =
                    this.specialTokens.get(
                        chunk.text
                    );

                if (id !== undefined) {
                    tokens.push(id);
                    continue;
                }
            }

            const pieces =
                this.splitText(chunk.text);

            for (const piece of pieces) {

                const bytes =
                    this.utf8Bytes(piece);

                const byteText =
                    this.bytesToUnicodeString(bytes);

                const bpeTokens =
                    this.bpe(byteText);

                for (const token of bpeTokens) {

                    const id =
                        this.vocab[token];

                    if (id === undefined) {

                        /*
                         * GPT-2/SmolLM2 має fallback через
                         * byte-level representation.
                         *
                         * Якщо такого токена немає,
                         * пробуємо розкласти його
                         * на окремі символи.
                         */

                        for (const ch of token) {

                            const chId =
                                this.vocab[ch];

                            if (chId !== undefined) {
                                tokens.push(chId);
                            } else {
                                throw new Error(
                                    `Невідомий BPE token: ${JSON.stringify(ch)}`
                                );
                            }
                        }

                    } else {

                        tokens.push(id);
                    }
                }
            }
        }

        return tokens;
    }


    // ------------------------------------------------------------
    // SPECIAL TOKEN SPLITTER
    // ------------------------------------------------------------

    splitSpecialTokens(text) {

        if (this.specialTokens.size === 0) {
            return [
                {
                    special: false,
                    text
                }
            ];
        }

        const specials =
            [...this.specialTokens.keys()]
                .sort(
                    (a, b) =>
                        b.length - a.length
                );

        const escaped =
            specials.map(
                token =>
                    token.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&"
                    )
            );

        const regex =
            new RegExp(
                `(${escaped.join("|")})`,
                "g"
            );

        const parts =
            text.split(regex);

        const result = [];

        for (const part of parts) {

            if (!part) {
                continue;
            }

            if (
                this.specialTokens.has(part)
            ) {

                result.push({
                    special: true,
                    text: part
                });

            } else {

                result.push({
                    special: false,
                    text: part
                });
            }
        }

        return result;
    }


    // ------------------------------------------------------------
    // ID → TOKEN
    // ------------------------------------------------------------

    tokenToId(token) {

        const id = this.vocab[token];

        return id === undefined
            ? null
            : id;
    }


    idToTokenString(id) {

        return this.idToToken[id] ?? null;
    }


    // ------------------------------------------------------------
    // DECODE GPT-2 BYTE REPRESENTATION
    // ------------------------------------------------------------

    decode(ids, options = {}) {

        if (!this.loaded) {
            throw new Error(
                "Tokenizer ще не завантажений."
            );
        }

        let byteValues = [];

        let output = "";

        for (const id of ids) {

            if (
                options.skipSpecialTokens &&
                this.specialTokenIds.has(id)
            ) {
                continue;
            }

            const token =
                this.idToTokenString(id);

            if (token === null) {
                continue;
            }

            /*
             * Special token не треба декодувати
             * через byte decoder.
             */

            if (this.specialTokenIds.has(id)) {

                output += token;

                continue;
            }

            for (const char of token) {

                const byte =
                    this.byteDecoder.get(char);

                if (byte !== undefined) {

                    byteValues.push(byte);

                } else {

                    /*
                     * Якщо символ не є GPT-2 byte символом,
                     * спочатку скидаємо накопичені bytes.
                     */

                    if (byteValues.length > 0) {

                        output +=
                            new TextDecoder().decode(
                                new Uint8Array(byteValues)
                            );

                        byteValues = [];
                    }

                    output += char;
                }
            }
        }

        if (byteValues.length > 0) {

            output +=
                new TextDecoder().decode(
                    new Uint8Array(byteValues)
                );
        }

        return output;
    }
}


window.SmolTokenizer = SmolTokenizer;