const SMALL_LLM_MODEL_BASE =
    "https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/resolve/main/";

const SMALL_LLM_MODEL_URL =
    SMALL_LLM_MODEL_BASE + "onnx/model_q4f16.onnx";

const SMALL_LLM_TOKENIZER_URL =
    SMALL_LLM_MODEL_BASE + "tokenizer.json";

const SMALL_LLM_CONFIG_URL =
    SMALL_LLM_MODEL_BASE + "config.json";


class SmallLLM {

    constructor() {

        this.model = null;
        this.tokenizer = null;
        this.config = null;

        this.ready = false;
        this.forwardReady = false;

        this.quantizedLayers = [];
        this.firstQMatMul = null;

        console.log("[AI] SmallLLM створено.");
    }


    async load() {

        console.log("[AI] Починаю завантаження...");

        try {

            await this._loadConfig();

            await this._loadTokenizer();

            await this._loadONNX();

            this._inspectArchitecture();

            this._prepareForward();

            this.ready = true;

            console.log("[AI] SmallLLM завантажений.");
            console.log(
                "[AI] Forward:",
                this.forwardReady ? "готовий" : "не готовий"
            );

            return true;

        } catch (error) {

            console.error(
                "[AI] Помилка завантаження:",
                error
            );

            this.ready = false;

            return false;
        }
    }


    async _loadConfig() {

        const response =
            await fetch(SMALL_LLM_CONFIG_URL);

        if (!response.ok) {

            throw new Error(
                `Config HTTP ${response.status}`
            );
        }

        this.config =
            await response.json();

        console.log(
            "[AI] Config:",
            this.config
        );
    }


    async _loadTokenizer() {

        const TokenizerClass =
            window.Tokenizer ||
            window.GPT2Tokenizer ||
            window.ByteLevelTokenizer;

        if (!TokenizerClass) {

            console.warn(
                "[AI] Tokenizer class не знайдений."
            );

            this.tokenizer = null;

            return;
        }

        try {

            const response =
                await fetch(SMALL_LLM_TOKENIZER_URL);

            if (!response.ok) {

                throw new Error(
                    `Tokenizer HTTP ${response.status}`
                );
            }

            const data =
                await response.json();

            this.tokenizer =
                new TokenizerClass(data);

            console.log(
                "[AI] Tokenizer завантажений."
            );

        } catch (error) {

            console.warn(
                "[AI] Tokenizer не завантажився:",
                error
            );

            this.tokenizer = null;
        }
    }


    async _loadONNX() {

        if (!window.ONNXModel) {

            throw new Error(
                "ONNXModel не знайдений."
            );
        }

        console.log(
            "[ONNX] Завантаження:",
            SMALL_LLM_MODEL_URL
        );

        this.model =
            new window.ONNXModel();

        await this.model.load(
            SMALL_LLM_MODEL_URL
        );

        console.log(
            "[AI] ONNX модель завантажена."
        );
    }


    _inspectArchitecture() {

        const c = this.config || {};

        console.log(
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


        if (this.model.inspectOperators) {

            try {

                console.log(
                    "[AI] Operator counts:",
                    this.model.inspectOperators()
                );

            } catch (error) {

                console.warn(
                    "[AI] Не вдалося отримати operator counts:",
                    error
                );
            }
        }


        if (this.model.inspectMatMulNBits) {

            try {

                const q =
                    this.model.inspectMatMulNBits();

                console.log(
                    "[AI] MatMulNBits:",
                    q
                );

            } catch (error) {

                console.warn(
                    "[AI] MatMulNBits inspection error:",
                    error
                );
            }
        }
    }


    _getAttribute(node, name, fallback = null) {

        if (!node || !node.attributes) {
            return fallback;
        }

        const attr =
            node.attributes.find(
                a => a.name === name
            );

        if (!attr) {
            return fallback;
        }

        if (attr.i !== undefined) {
            return Number(attr.i);
        }

        if (attr.f !== undefined) {
            return Number(attr.f);
        }

        if (attr.s !== undefined) {
            return attr.s;
        }

        return fallback;
    }


    /*
     * ВАЖЛИВА ВИПРАВЛЕНА ФУНКЦІЯ
     *
     * ONNX rawData може бути Uint8Array
     * з byteOffset, який не кратний 2 або 4.
     *
     * Тому спочатку створюємо НОВИЙ
     * вирівняний Uint8Array, а вже потім
     * читаємо Float32 / Float16 / Uint16.
     */
    _readRawTensor(tensor) {

        if (!tensor) {
            return null;
        }


        if (tensor.rawData) {

            const source =
                tensor.rawData;


            const bytes =
                new Uint8Array(
                    source.byteLength
                );


            bytes.set(source);


            switch (tensor.dataType) {


                // FLOAT
                case 1: {

                    if (
                        bytes.byteLength % 4 !== 0
                    ) {

                        throw new Error(
                            `FLOAT tensor має неправильний розмір: ${bytes.byteLength}`
                        );
                    }

                    return new Float32Array(
                        bytes.buffer
                    );
                }


                // UINT8
                case 2:

                    return new Uint8Array(
                        bytes.buffer
                    );


                // INT8
                case 3:

                    return new Int8Array(
                        bytes.buffer
                    );


                // UINT16
                case 4: {

                    if (
                        bytes.byteLength % 2 !== 0
                    ) {

                        throw new Error(
                            `UINT16 tensor має непарний розмір: ${bytes.byteLength}`
                        );
                    }

                    return new Uint16Array(
                        bytes.buffer
                    );
                }


                // FLOAT16
                case 10: {

                    if (
                        bytes.byteLength % 2 !== 0
                    ) {

                        throw new Error(
                            `FLOAT16 tensor має непарний розмір: ${bytes.byteLength}`
                        );
                    }

                    return new Uint16Array(
                        bytes.buffer
                    );
                }


                default:

                    console.warn(
                        "[AI] Невідомий ONNX dataType:",
                        tensor.dataType
                    );

                    return bytes;
            }
        }


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


        if (
            tensor.int64Data &&
            tensor.int64Data.length
        ) {

            if (
                typeof BigInt64Array !==
                "undefined"
            ) {

                return new BigInt64Array(
                    tensor.int64Data
                );
            }

            return tensor.int64Data;
        }


        if (
            tensor.uint64Data &&
            tensor.uint64Data.length
        ) {

            if (
                typeof BigUint64Array !==
                "undefined"
            ) {

                return new BigUint64Array(
                    tensor.uint64Data
                );
            }

            return tensor.uint64Data;
        }


        return null;
    }


    _float16(value) {

        const h =
            Number(value) & 0xffff;

        const sign =
            (h & 0x8000)
                ? -1
                : 1;

        const exponent =
            (h >> 10) & 0x1f;

        const fraction =
            h & 0x03ff;


        if (exponent === 0) {

            if (fraction === 0) {
                return sign * 0;
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


    _unpackQ4(byte, high) {

        if (!high) {

            return byte & 0x0f;
        }

        return (
            (byte >> 4) & 0x0f
        );
    }


    _getPackedZeroPoint(
        zeroPoints,
        index
    ) {

        if (!zeroPoints) {
            return 8;
        }


        const byte =
            zeroPoints[
                Math.floor(index / 2)
            ];


        if (byte === undefined) {
            return 8;
        }


        const high =
            (index & 1) !== 0;


        return this._unpackQ4(
            byte,
            high
        );
    }


    _dequantizeMatMulNBits(node) {

        if (!node) {

            throw new Error(
                "MatMulNBits node не знайдений."
            );
        }


        const inputs =
            node.inputs || [];


        const weightName =
            inputs[1];

        const scaleName =
            inputs[2];

        const zeroPointName =
            inputs[3];


        const weightTensor =
            this.model.getInitializer(
                weightName
            );


        const scaleTensor =
            this.model.getInitializer(
                scaleName
            );


        const zeroPointTensor =
            zeroPointName
                ? this.model.getInitializer(
                    zeroPointName
                  )
                : null;


        if (!weightTensor) {

            throw new Error(
                `Q4 weight не знайдений: ${weightName}`
            );
        }


        if (!scaleTensor) {

            throw new Error(
                `Q4 scale не знайдений: ${scaleName}`
            );
        }


        const K =
            this._getAttribute(
                node,
                "K",
                null
            );


        const N =
            this._getAttribute(
                node,
                "N",
                null
            );


        const bits =
            this._getAttribute(
                node,
                "bits",
                4
            );


        const blockSize =
            this._getAttribute(
                node,
                "block_size",
                32
            );


        console.log(
            "[AI] QMatMul:",
            {
                node: node.name,
                K,
                N,
                bits,
                blockSize,
                weight: weightName,
                scale: scaleName,
                zeroPoint: zeroPointName
            }
        );


        const packedWeights =
            this._readRawTensor(
                weightTensor
            );


        const scales =
            this._readRawTensor(
                scaleTensor
            );


        const zeroPoints =
            zeroPointTensor
                ? this._readRawTensor(
                    zeroPointTensor
                  )
                : null;


        if (!packedWeights) {

            throw new Error(
                "Не вдалося прочитати Q4 weights."
            );
        }


        if (!scales) {

            throw new Error(
                "Не вдалося прочитати Q4 scales."
            );
        }


        const actualK =
            K ||
            (
                weightTensor.dims &&
                weightTensor.dims[1]
            );


        const actualN =
            N ||
            (
                weightTensor.dims &&
                weightTensor.dims[0]
            );


        const blocksPerRow =
            Math.ceil(
                actualK / blockSize
            );


        const valuesPerByte =
            8 / bits;


        const blobSize =
            Math.ceil(
                blockSize * bits / 8
            );


        console.log(
            "[AI] Q4 layout:",
            {
                actualK,
                actualN,
                blockSize,
                blocksPerRow,
                valuesPerByte,
                blobSize,

                weightDims:
                    weightTensor.dims,

                scaleDims:
                    scaleTensor.dims,

                weightBytes:
                    packedWeights.byteLength,

                scaleValues:
                    scales.length,

                zeroPointBytes:
                    zeroPoints
                        ? zeroPoints.byteLength
                        : 0
            }
        );


        /*
         * Декодуємо невеликий фрагмент,
         * а не всю матрицю.
         *
         * Це потрібно для перевірки формату
         * і не повинно споживати сотні MB RAM.
         */

        const sampleRows =
            Math.min(
                actualN,
                4
            );


        const sampleCols =
            Math.min(
                actualK,
                32
            );


        const sample =
            new Float32Array(
                sampleRows *
                sampleCols
            );


        let minimum =
            Infinity;

        let maximum =
            -Infinity;

        let bad =
            0;


        for (
            let row = 0;
            row < sampleRows;
            row++
        ) {

            for (
                let col = 0;
                col < sampleCols;
                col++
            ) {

                const block =
                    Math.floor(
                        col / blockSize
                    );


                const inside =
                    col % blockSize;


                const scaleIndex =
                    row *
                    blocksPerRow +
                    block;


                const scaleRaw =
                    scales[
                        scaleIndex
                    ];


                const scale =
                    this._float16(
                        scaleRaw
                    );


                const packedIndex =
                    row *
                    blocksPerRow *
                    blobSize +
                    block *
                    blobSize +
                    Math.floor(
                        inside /
                        valuesPerByte
                    );


                const packed =
                    packedWeights[
                        packedIndex
                    ];


                if (
                    packed === undefined
                ) {

                    bad++;

                    continue;
                }


                let q;


                if (bits === 4) {

                    q =
                        this._unpackQ4(
                            packed,
                            (
                                inside & 1
                            ) !== 0
                        );

                } else {

                    q = 0;
                }


                let zero =
                    8;


                if (
                    zeroPoints
                ) {

                    zero =
                        this._getPackedZeroPoint(
                            zeroPoints,
                            scaleIndex
                        );
                }


                const value =
                    (
                        q - zero
                    ) * scale;


                sample[
                    row *
                    sampleCols +
                    col
                ] = value;


                if (
                    !Number.isFinite(
                        value
                    )
                ) {

                    bad++;

                } else {

                    minimum =
                        Math.min(
                            minimum,
                            value
                        );

                    maximum =
                        Math.max(
                            maximum,
                            value
                        );
                }
            }
        }


        console.log(
            "[AI] Q4 statistics:",
            {
                minimum,
                maximum,
                bad,
                sampleRows,
                sampleCols
            }
        );


        return {
            node,
            K: actualK,
            N: actualN,
            bits,
            blockSize,
            blocksPerRow,
            blobSize,
            packedWeights,
            scales,
            zeroPoints,
            sample,
            minimum,
            maximum,
            bad
        };
    }


    _prepareQuantizedWeights() {

        if (
            !this.model ||
            !this.model.inspectMatMulNBits
        ) {

            throw new Error(
                "ONNX model не підтримує MatMulNBits inspection."
            );
        }


        const nodes =
            this.model.inspectMatMulNBits();


        if (
            !nodes ||
            !nodes.length
        ) {

            throw new Error(
                "У моделі не знайдено MatMulNBits."
            );
        }


        this.quantizedLayers =
            nodes;


        console.log(
            "[AI] Quantized linear layers:",
            nodes.length
        );


        this.firstQMatMul =
            nodes[0];


        console.log(
            "[AI] Перший MatMulNBits:",
            {
                name:
                    this.firstQMatMul.name,

                opType:
                    this.firstQMatMul.opType,

                inputs:
                    this.firstQMatMul.inputs,

                outputs:
                    this.firstQMatMul.outputs,

                attributes:
                    this.firstQMatMul.attributes
            }
        );
    }


    _prepareForward() {

        try {

            this._prepareQuantizedWeights();


            if (
                !this.firstQMatMul
            ) {

                throw new Error(
                    "Перший QMatMul відсутній."
                );
            }


            const decoded =
                this._dequantizeMatMulNBits(
                    this.firstQMatMul
                );


            if (
                decoded.bad > 0
            ) {

                console.warn(
                    "[AI] Q4 sample містить проблемні значення:",
                    decoded.bad
                );
            }


            if (
                !Number.isFinite(
                    decoded.minimum
                ) ||
                !Number.isFinite(
                    decoded.maximum
                )
            ) {

                throw new Error(
                    "Q4 sample не містить коректних чисел."
                );
            }


            this.forwardReady =
                true;


            console.log(
                "[AI] Q4 forward preparation OK."
            );


        } catch (error) {

            this.forwardReady =
                false;


            console.error(
                "[AI] Q4 forward preparation error:",
                error
            );
        }
    }


    /*
     * Базові математичні примітиви.
     * Вони потрібні для майбутнього Llama forward.
     */

    rmsNorm(
        input,
        weight,
        eps = 1e-5
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


    silu(input) {

        const out =
            new Float32Array(
                input.length
            );


        for (
            let i = 0;
            i < input.length;
            i++
        ) {

            const x =
                input[i];


            out[i] =
                x /
                (
                    1 +
                    Math.exp(-x)
                );
        }


        return out;
    }


    softmax(input) {

        const out =
            new Float32Array(
                input.length
            );


        let max =
            -Infinity;


        for (
            let i = 0;
            i < input.length;
            i++
        ) {

            if (
                input[i] > max
            ) {

                max =
                    input[i];
            }
        }


        let sum = 0;


        for (
            let i = 0;
            i < input.length;
            i++
        ) {

            out[i] =
                Math.exp(
                    input[i] -
                    max
                );

            sum +=
                out[i];
        }


        if (sum === 0) {
            return out;
        }


        for (
            let i = 0;
            i < input.length;
            i++
        ) {

            out[i] /=
                sum;
        }


        return out;
    }


    dot(a, b) {

        const length =
            Math.min(
                a.length,
                b.length
            );


        let result = 0;


        for (
            let i = 0;
            i < length;
            i++
        ) {

            result +=
                a[i] *
                b[i];
        }


        return result;
    }


    argmax(input) {

        let index = 0;
        let value = -Infinity;


        for (
            let i = 0;
            i < input.length;
            i++
        ) {

            if (
                input[i] > value
            ) {

                value =
                    input[i];

                index =
                    i;
            }
        }


        return index;
    }


    applyRoPE(
        vector,
        position,
        theta = 100000
    ) {

        const out =
            new Float32Array(
                vector
            );


        const half =
            Math.floor(
                vector.length / 2
            );


        for (
            let i = 0;
            i < half;
            i++
        ) {

            const exponent =
                (
                    2 * i
                ) /
                vector.length;


            const frequency =
                1 /
                Math.pow(
                    theta,
                    exponent
                );


            const angle =
                position *
                frequency;


            const cos =
                Math.cos(angle);


            const sin =
                Math.sin(angle);


            const a =
                vector[
                    2 * i
                ];


            const b =
                vector[
                    2 * i + 1
                ];


            out[
                2 * i
            ] =
                a * cos -
                b * sin;


            out[
                2 * i + 1
            ] =
                a * sin +
                b * cos;
        }


        return out;
    }


    async generate(
        prompt,
        options = {}
    ) {

        if (!this.ready) {

            throw new Error(
                "SmallLLM ще не готовий."
            );
        }


        if (!this.forwardReady) {

            throw new Error(
                "Q4 forward не пройшов підготовчий тест."
            );
        }


        if (!this.tokenizer) {

            throw new Error(
                "Tokenizer ще не підключений."
            );
        }


        /*
         * Тут поки НЕ робимо вигляд,
         * що повний Llama forward уже працює.
         *
         * Наступний етап:
         *
         * tokenizer
         * ↓
         * embedding
         * ↓
         * 30 transformer layers
         * ↓
         * attention
         * ↓
         * RoPE
         * ↓
         * GQA
         * ↓
         * SwiGLU
         * ↓
         * RMSNorm
         * ↓
         * lm_head
         * ↓
         * sampling
         */


        throw new Error(
            "Q4 decoder готовий. Повний Llama forward ще не підключений."
        );
    }
}


async function askAgent(
    agent,
    prompt,
    options = {}
) {

    if (
        !window.ai
    ) {

        throw new Error(
            "AI engine не створений."
        );
    }


    return await window.ai.generate(
        prompt,
        options
    );
}


window.SmallLLM =
    SmallLLM;

window.askAgent =
    askAgent;