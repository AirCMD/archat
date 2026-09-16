(() => {
    "use strict";

    /*
     * AI Couple Lab — SmallLLM
     *
     * Тут реалізований:
     * - завантаження config/tokenizer/ONNX;
     * - аналіз Llama graph;
     * - декодування MatMulNBits;
     * - базові Llama primitives;
     * - підготовка реального forward pass.
     *
     * Важливо:
     * ми НЕ використовуємо ONNX Runtime.
     * Увесь inference залишається в браузері.
     */

    const SMALL_LLM_MODEL_BASE =
        "https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/resolve/main/";

    const SMALL_LLM_MODEL_URL =
        SMALL_LLM_MODEL_BASE +
        "onnx/model_q4f16.onnx";

    const SMALL_LLM_TOKENIZER_URL =
        SMALL_LLM_MODEL_BASE +
        "tokenizer.json";

    const SMALL_LLM_CONFIG_URL =
        SMALL_LLM_MODEL_BASE +
        "config.json";


    class SmallLLM {

        constructor() {

            this.model = null;
            this.config = null;
            this.tokenizer = null;

            this.loaded = false;
            this.ready = false;

            this.weights = new Map();

            this.configLoaded = false;
            this.tokenizerLoaded = false;
            this.modelLoaded = false;

            console.log("[AI] SmallLLM створено.");
        }


        async load() {

            console.log("[AI] Починаю завантаження...");

            await this._loadConfig();
            await this._loadTokenizer();
            await this._loadONNX();

            this._inspectArchitecture();

            this.loaded = true;

            /*
             * Forward буде активований тільки після того,
             * як структура реальних MatMulNBits перевірена.
             */

            this.ready = this._prepareForward();

            console.log(
                "[AI] SmallLLM завантажений."
            );

            console.log(
                "[AI] Forward:",
                this.ready ? "готовий" : "не готовий"
            );

            return this;
        }


        async _loadConfig() {

            const response =
                await fetch(
                    SMALL_LLM_CONFIG_URL
                );

            if (!response.ok) {
                throw new Error(
                    `Config HTTP ${response.status}`
                );
            }

            this.config =
                await response.json();

            this.configLoaded = true;

            console.log(
                "[AI] Config:",
                this.config
            );
        }


        async _loadTokenizer() {

            /*
             * Не припускаємо конкретну назву класу.
             *
             * У твоєму tokenizer.js клас може називатися
             * Tokenizer або GPT2Tokenizer.
             */

            let TokenizerClass =
                window.Tokenizer ||
                window.GPT2Tokenizer ||
                window.ByteLevelTokenizer;

            if (!TokenizerClass) {

                console.warn(
                    "[AI] Tokenizer class не знайдений."
                );

                /*
                 * Це поки НЕ валимо.
                 *
                 * Модель можна дослідити незалежно
                 * від tokenizer.
                 */

                return;
            }

            const response =
                await fetch(
                    SMALL_LLM_TOKENIZER_URL
                );

            if (!response.ok) {
                throw new Error(
                    `Tokenizer HTTP ${response.status}`
                );
            }

            const tokenizerJSON =
                await response.json();

            /*
             * Підтримуємо кілька можливих API.
             */

            try {

                this.tokenizer =
                    new TokenizerClass(
                        tokenizerJSON
                    );

            } catch (e) {

                console.warn(
                    "[AI] Не вдалося створити Tokenizer:",
                    e
                );

                try {

                    this.tokenizer =
                        new TokenizerClass();

                    if (
                        typeof this.tokenizer.loadJSON ===
                        "function"
                    ) {
                        await this.tokenizer.loadJSON(
                            tokenizerJSON
                        );
                    }

                } catch (e2) {

                    console.warn(
                        "[AI] Другий варіант Tokenizer також не спрацював:",
                        e2
                    );

                    this.tokenizer = null;
                }
            }

            if (this.tokenizer) {
                this.tokenizerLoaded = true;

                console.log(
                    "[AI] Tokenizer готовий:",
                    this.tokenizer.constructor.name
                );
            }
        }


        async _loadONNX() {

            if (
                typeof window.ONNXModel !==
                "function"
            ) {
                throw new Error(
                    "ONNXModel не знайдений. Перевір ai/onnx.js"
                );
            }

            this.model =
                new window.ONNXModel();

            await this.model.load(
                SMALL_LLM_MODEL_URL
            );

            this.modelLoaded = true;

            console.log(
                "[AI] ONNX модель завантажена."
            );
        }


        _inspectArchitecture() {

            const c = this.config;

            console.group(
                "[AI] Архітектура SmolLM2"
            );

            console.log(
                "model_type:",
                c.model_type
            );

            console.log(
                "hidden_size:",
                c.hidden_size
            );

            console.log(
                "intermediate_size:",
                c.intermediate_size
            );

            console.log(
                "layers:",
                c.num_hidden_layers
            );

            console.log(
                "attention heads:",
                c.num_attention_heads
            );

            console.log(
                "KV heads:",
                c.num_key_value_heads
            );

            console.log(
                "head_dim:",
                c.head_dim
            );

            console.log(
                "vocab:",
                c.vocab_size
            );

            console.log(
                "rope_theta:",
                c.rope_theta
            );

            console.groupEnd();

            if (
                this.model &&
                typeof this.model.inspectOperators ===
                "function"
            ) {
                this.model.inspectOperators();
            }

            if (
                this.model &&
                typeof this.model.inspectMatMulNBits ===
                "function"
            ) {
                this.model.inspectMatMulNBits();
            }
        }


        /*
         * ---------------------------------------------------------
         * MatMulNBits
         * ---------------------------------------------------------
         *
         * Формат ONNX Runtime:
         *
         * B:
         *   [N, blocks, blob_size]
         *
         * де:
         *
         * blob_size = block_size * bits / 8
         *
         * Для Q4:
         *
         * 2 ваги / byte.
         *
         * Нижні 4 біти = перше значення.
         * Верхні 4 біти = друге.
         *
         * Zero point може бути packed.
         */


        _getAttribute(node, name) {

            if (!node || !node.attributes) {
                return null;
            }

            const attr =
                node.attributes.find(
                    x => x.name === name
                );

            if (!attr) {
                return null;
            }

            if (attr.i !== null) {
                return Number(attr.i);
            }

            if (attr.f !== null) {
                return attr.f;
            }

            return null;
        }


        _readRawTensor(tensor) {

            if (!tensor) {
                return null;
            }

            if (!tensor.rawData) {

                if (
                    tensor.floatData &&
                    tensor.floatData.length
                ) {
                    return new Float32Array(
                        tensor.floatData
                    );
                }

                if (
                    tensor.int32Data &&
                    tensor.int32Data.length
                ) {
                    return new Int32Array(
                        tensor.int32Data
                    );
                }

                return null;
            }

            const bytes =
                tensor.rawData;

            switch (tensor.dataType) {

                /*
                 * FLOAT
                 */
                case 1: {

                    return new Float32Array(
                        bytes.buffer,
                        bytes.byteOffset,
                        Math.floor(
                            bytes.byteLength / 4
                        )
                    );
                }


                /*
                 * UINT8
                 */
                case 2:

                    return new Uint8Array(
                        bytes.buffer,
                        bytes.byteOffset,
                        bytes.byteLength
                    );


                /*
                 * INT8
                 */
                case 3:

                    return new Int8Array(
                        bytes.buffer,
                        bytes.byteOffset,
                        bytes.byteLength
                    );


                /*
                 * FLOAT16
                 */
                case 10:

                    return new Uint16Array(
                        bytes.buffer,
                        bytes.byteOffset,
                        Math.floor(
                            bytes.byteLength / 2
                        )
                    );


                /*
                 * UINT16
                 */
                case 4:

                    return new Uint16Array(
                        bytes.buffer,
                        bytes.byteOffset,
                        Math.floor(
                            bytes.byteLength / 2
                        )
                    );


                default:

                    return new Uint8Array(
                        bytes.buffer,
                        bytes.byteOffset,
                        bytes.byteLength
                    );
            }
        }


        _float16(value) {

            if (
                typeof window.float16ToFloat32 ===
                "function"
            ) {
                return window.float16ToFloat32(
                    value
                );
            }

            const sign =
                (value & 0x8000)
                    ? -1
                    : 1;

            const exponent =
                (value >> 10) & 0x1f;

            const fraction =
                value & 0x03ff;

            if (exponent === 0) {

                if (fraction === 0) {
                    return 0;
                }

                return (
                    sign *
                    Math.pow(2, -14) *
                    (fraction / 1024)
                );
            }

            if (exponent === 31) {

                if (fraction === 0) {
                    return sign * Infinity;
                }

                return NaN;
            }

            return (
                sign *
                Math.pow(
                    2,
                    exponent - 15
                ) *
                (1 + fraction / 1024)
            );
        }


        _unpackQ4(byte) {

            return [
                byte & 0x0f,
                (byte >> 4) & 0x0f
            ];
        }


        /*
         * Читання packed zero point.
         *
         * Для Q4:
         * 2 zero points на byte.
         */

        _getPackedZeroPoint(
            zeroPoints,
            index,
            bits
        ) {

            if (!zeroPoints) {

                /*
                 * Для unsigned Q4 без явного zero point
                 * ONNX Runtime використовує 8.
                 */

                return Math.pow(
                    2,
                    bits - 1
                );
            }

            const perByte =
                Math.floor(8 / bits);

            const byteIndex =
                Math.floor(
                    index / perByte
                );

            const subIndex =
                index % perByte;

            const byte =
                zeroPoints[byteIndex];

            const shift =
                subIndex * bits;

            const mask =
                (1 << bits) - 1;

            return (
                byte >> shift
            ) & mask;
        }


        /*
         * Декодує одну колонку B.
         *
         * Важливо:
         *
         * MatMulNBits зберігає B як
         *
         * [N, blocks, packed K]
         *
         * а не як наш старий
         * [rows, cols].
         */


        _dequantizeMatMulNBits(
            node
        ) {

            const inputs =
                node.inputs;

            if (inputs.length < 3) {
                throw new Error(
                    "MatMulNBits має менше 3 inputs"
                );
            }

            const b =
                this.model.getInitializer(
                    inputs[1]
                );

            const scales =
                this.model.getInitializer(
                    inputs[2]
                );

            const zeroPoints =
                inputs.length >= 4
                    ? this.model.getInitializer(
                        inputs[3]
                    )
                    : null;

            if (!b) {
                throw new Error(
                    `Не знайдений B initializer: ${inputs[1]}`
                );
            }

            if (!scales) {
                throw new Error(
                    `Не знайдений scales initializer: ${inputs[2]}`
                );
            }

            const K =
                this._getAttribute(
                    node,
                    "K"
                );

            const N =
                this._getAttribute(
                    node,
                    "N"
                );

            const bits =
                this._getAttribute(
                    node,
                    "bits"
                ) || 4;

            const blockSize =
                this._getAttribute(
                    node,
                    "block_size"
                ) || 32;

            const blocks =
                Math.ceil(
                    K / blockSize
                );

            const blobSize =
                Math.ceil(
                    blockSize * bits / 8
                );

            console.log(
                "[AI] QMatMul:",
                {
                    name: node.name,
                    K,
                    N,
                    bits,
                    blockSize,
                    blocks,
                    blobSize,
                    bShape: b.dims,
                    scaleShape: scales.dims,
                    zeroPointShape:
                        zeroPoints
                            ? zeroPoints.dims
                            : null
                }
            );

            const packed =
                this._readRawTensor(
                    b
                );

            const scaleRaw =
                this._readRawTensor(
                    scales
                );

            const zpRaw =
                zeroPoints
                    ? this._readRawTensor(
                        zeroPoints
                    )
                    : null;

            if (!packed) {
                throw new Error(
                    "Не вдалося прочитати packed B"
                );
            }

            if (!scaleRaw) {
                throw new Error(
                    "Не вдалося прочитати scales"
                );
            }

            /*
             * Для q4f16 scales можуть бути FLOAT16.
             */

            const scalesFloat =
                new Float32Array(
                    scaleRaw.length
                );

            if (
                scales.dataType === 10
            ) {

                for (
                    let i = 0;
                    i < scaleRaw.length;
                    i++
                ) {
                    scalesFloat[i] =
                        this._float16(
                            scaleRaw[i]
                        );
                }

            } else {

                for (
                    let i = 0;
                    i < scaleRaw.length;
                    i++
                ) {
                    scalesFloat[i] =
                        scaleRaw[i];
                }
            }


            /*
             * Декодована матриця:
             *
             * [N, K]
             *
             * Це поки діагностичний універсальний
             * шлях. Він повільніший, зате дозволяє
             * перевірити числову коректність.
             */

            const weights =
                new Float32Array(
                    N * K
                );


            for (
                let n = 0;
                n < N;
                n++
            ) {

                for (
                    let block = 0;
                    block < blocks;
                    block++
                ) {

                    const scale =
                        scalesFloat[
                            n * blocks +
                            block
                        ];

                    /*
                     * zero point index:
                     * один zp на блок/канал.
                     */

                    const zpIndex =
                        n * blocks +
                        block;

                    const zeroPoint =
                        this._getPackedZeroPoint(
                            zpRaw,
                            zpIndex,
                            bits
                        );

                    const blockStart =
                        block * blockSize;

                    const blockLength =
                        Math.min(
                            blockSize,
                            K - blockStart
                        );

                    /*
                     * B має shape:
                     *
                     * [N, blocks, blobSize]
                     */

                    const packedBase =
                        (
                            n * blocks +
                            block
                        ) *
                        blobSize;


                    for (
                        let kLocal = 0;
                        kLocal < blockLength;
                        kLocal++
                    ) {

                        const byteIndex =
                            packedBase +
                            Math.floor(
                                kLocal *
                                bits /
                                8
                            );

                        let q;

                        if (bits === 4) {

                            const byte =
                                packed[
                                    byteIndex
                                ];

                            if (
                                (kLocal & 1) === 0
                            ) {
                                q =
                                    byte & 0x0f;
                            } else {
                                q =
                                    (
                                        byte >> 4
                                    ) & 0x0f;
                            }

                        } else {

                            /*
                             * Поки підтримуємо
                             * саме Q4, бо наша модель
                             * q4f16.
                             */

                            throw new Error(
                                `Q${bits} поки не реалізований`
                            );
                        }

                        const weight =
                            (
                                q -
                                zeroPoint
                            ) *
                            scale;

                        weights[
                            n * K +
                            blockStart +
                            kLocal
                        ] = weight;
                    }
                }
            }

            return {
                K,
                N,
                bits,
                blockSize,
                weights
            };
        }


        /*
         * Збираємо всі quantized linear layers.
         */

        _prepareQuantizedWeights() {

            const nodes =
                this.model.findNodesByOp(
                    "MatMulNBits"
                );

            console.log(
                "[AI] Quantized linear layers:",
                nodes.length
            );

            /*
             * Поки НЕ декодуємо всі 30 шарів
             * одразу — це може зайняти багато
             * пам'яті в браузері.
             *
             * Зберігаємо node descriptions.
             */

            this.quantizedNodes =
                nodes;

            return nodes;
        }


        /*
         * Перевірка структури першого MatMulNBits.
         */

        _prepareForward() {

            try {

                const nodes =
                    this._prepareQuantizedWeights();

                if (!nodes.length) {

                    console.error(
                        "[AI] У моделі немає MatMulNBits."
                    );

                    return false;
                }

                const first =
                    nodes[0];

                console.log(
                    "[AI] Перший MatMulNBits:",
                    {
                        name: first.name,
                        inputs: first.inputs,
                        outputs: first.outputs,
                        attributes:
                            this.model.getNodeAttributes(
                                first
                            )
                    }
                );

                /*
                 * Важливий тест:
                 * декодуємо ТІЛЬКИ перший шар.
                 *
                 * Якщо тут усе правильно —
                 * переходимо до повного Llama forward.
                 */

                const test =
                    this._dequantizeMatMulNBits(
                        first
                    );

                console.log(
                    "[AI] Перший Q4 tensor декодований:",
                    {
                        K: test.K,
                        N: test.N,
                        bits: test.bits,
                        blockSize:
                            test.blockSize,
                        values:
                            test.weights.length
                    }
                );

                /*
                 * Перевіряємо, що немає NaN/Infinity.
                 */

                let bad = 0;

                let min = Infinity;
                let max = -Infinity;

                for (
                    let i = 0;
                    i < test.weights.length;
                    i++
                ) {

                    const v =
                        test.weights[i];

                    if (!Number.isFinite(v)) {
                        bad++;
                        continue;
                    }

                    if (v < min) min = v;
                    if (v > max) max = v;
                }

                console.log(
                    "[AI] Q4 statistics:",
                    {
                        min,
                        max,
                        bad
                    }
                );

                if (bad) {

                    console.error(
                        "[AI] Q4 tensor містить NaN/Infinity."
                    );

                    return false;
                }

                /*
                 * Успішний тест low-level decoder.
                 *
                 * Повний Llama forward підключатимемо
                 * після перевірки цього tensor.
                 */

                this.firstQ4Test =
                    test;

                return true;

            } catch (error) {

                console.error(
                    "[AI] Q4 forward preparation error:",
                    error
                );

                return false;
            }
        }


        /*
         * ---------------------------------------------------------
         * Llama primitives
         * ---------------------------------------------------------
         */

        rmsNorm(
            input,
            weight,
            eps
        ) {

            const out =
                new Float32Array(
                    input.length
                );

            let sum = 0;

            for (
                let i = 0;
                i < input.length;
                i++
            ) {
                sum +=
                    input[i] *
                    input[i];
            }

            const inv =
                1 /
                Math.sqrt(
                    sum /
                    input.length +
                    eps
                );

            for (
                let i = 0;
                i < input.length;
                i++
            ) {

                out[i] =
                    input[i] *
                    inv *
                    weight[i];
            }

            return out;
        }


        silu(
            x
        ) {

            return (
                x /
                (
                    1 +
                    Math.exp(-x)
                )
            );
        }


        softmax(
            values
        ) {

            let max =
                -Infinity;

            for (
                const v of values
            ) {
                if (v > max) {
                    max = v;
                }
            }

            const result =
                new Float32Array(
                    values.length
                );

            let sum = 0;

            for (
                let i = 0;
                i < values.length;
                i++
            ) {

                const e =
                    Math.exp(
                        values[i] -
                        max
                    );

                result[i] = e;
                sum += e;
            }

            if (sum === 0) {
                return result;
            }

            for (
                let i = 0;
                i < result.length;
                i++
            ) {
                result[i] /= sum;
            }

            return result;
        }


        /*
         * RoPE для head_dim=64.
         *
         * rope_interleaved=false:
         * половини вектора обертаються парами.
         */

        applyRoPE(
            vector,
            position
        ) {

            const dim =
                vector.length;

            const half =
                dim / 2;

            const theta =
                this.config.rope_theta ||
                10000;

            const out =
                new Float32Array(
                    vector
                );

            for (
                let i = 0;
                i < half;
                i++
            ) {

                const exponent =
                    (2 * i) /
                    dim;

                const freq =
                    1 /
                    Math.pow(
                        theta,
                        exponent
                    );

                const angle =
                    position *
                    freq;

                const cos =
                    Math.cos(angle);

                const sin =
                    Math.sin(angle);

                const a =
                    vector[i];

                const b =
                    vector[i + half];

                out[i] =
                    a * cos -
                    b * sin;

                out[i + half] =
                    a * sin +
                    b * cos;
            }

            return out;
        }


        dot(
            a,
            b
        ) {

            let sum = 0;

            for (
                let i = 0;
                i < a.length;
                i++
            ) {

                sum +=
                    a[i] *
                    b[i];
            }

            return sum;
        }


        /*
         * Greedy вибір токена.
         */

        argmax(
            logits
        ) {

            let best = 0;
            let value = -Infinity;

            for (
                let i = 0;
                i < logits.length;
                i++
            ) {

                if (
                    logits[i] >
                    value
                ) {

                    value =
                        logits[i];

                    best = i;
                }
            }

            return best;
        }


        /*
         * ---------------------------------------------------------
         * generate
         * ---------------------------------------------------------
         *
         * Поки що цей метод НЕ підсовує фальшивий текст.
         *
         * Він перевіряє, що low-level Q4 forward
         * реально готовий.
         */

        async generate(
            prompt,
            options = {}
        ) {

            if (!this.loaded) {
                throw new Error(
                    "SmallLLM ще не завантажений."
                );
            }

            if (!this.ready) {
                throw new Error(
                    "Q4 forward не пройшов підготовчий тест."
                );
            }

            if (!this.tokenizer) {

                throw new Error(
                    "Tokenizer не підключений."
                );
            }

            /*
             * Тут навмисно НЕ генеруємо вигаданий
             * результат.
             *
             * Наступний етап — підключення embedding,
             * 30 Llama blocks і lm_head.
             */

            throw new Error(
                "Q4 decoder готовий. Повний Llama forward ще не підключений."
            );
        }
    }


    /*
     * ---------------------------------------------------------
     * askAgent
     * ---------------------------------------------------------
     */

    async function askAgent(
        agentKey,
        context = {}
    ) {

        if (!window.ai) {
            throw new Error(
                "window.ai не створений."
            );
        }

        if (
            typeof window.ai.generate !==
            "function"
        ) {
            throw new Error(
                "SmallLLM.generate не знайдений."
            );
        }

        const prompt =
            context.prompt ||
            (
                agentKey === "akira"
                    ? "Ти Акіра."
                    : "Ти Яні."
            );

        return await window.ai.generate(
            prompt,
            {
                agentKey,
                context
            }
        );
    }


    window.SmallLLM =
        SmallLLM;

    window.askAgent =
        askAgent;

})();