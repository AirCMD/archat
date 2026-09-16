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
                this.forwardReady
                    ? "готовий"
                    : "не готовий"
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

        console.log(
            "[AI] Config:",
            this.config
        );
    }


    async _loadTokenizer() {

    const TokenizerClass =
        window.SmolTokenizer ||
        window.Tokenizer ||
        window.GPT2Tokenizer ||
        window.ByteLevelTokenizer;

    if (!TokenizerClass) {

        throw new Error(
            "Клас токенізатора не знайдений. Очікується window.SmolTokenizer."
        );
    }


    console.log(
        "[AI] Tokenizer class:",
        TokenizerClass.name
    );


    try {

        /*
         * SmolTokenizer сам завантажує tokenizer.json
         * через свій метод load().
         *
         * Тому не передаємо data у constructor.
         */

        this.tokenizer =
            new TokenizerClass();


        if (
            typeof this.tokenizer.load ===
            "function"
        ) {

            await this.tokenizer.load();

        } else {

            throw new Error(
                "У токенізатора немає методу load()."
            );
        }


        console.log(
            "[AI] Tokenizer завантажений."
        );

        console.log(
            "[AI] Tokenizer готовий:",
            this.tokenizer.loaded
        );


    } catch (error) {

        this.tokenizer = null;

        throw new Error(
            `Tokenizer не завантажився: ${error.message}`
        );
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

        const c =
            this.config || {};

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
                    "[AI] Operator counts error:",
                    error
                );
            }
        }


        if (this.model.inspectMatMulNBits) {

            try {

                const list =
                    this.model.inspectMatMulNBits();

                console.log(
                    "[AI] MatMulNBits:",
                    list
                );

            } catch (error) {

                console.warn(
                    "[AI] MatMulNBits inspection error:",
                    error
                );
            }
        }
    }


    _getAttribute(
        node,
        name,
        fallback = null
    ) {

        if (
            !node ||
            !node.attributes
        ) {

            return fallback;
        }


        const attr =
            node.attributes.find(
                a => a.name === name
            );


        if (!attr) {

            return fallback;
        }


        if (
            attr.i !== undefined
        ) {

            return Number(
                attr.i
            );
        }


        if (
            attr.f !== undefined
        ) {

            return Number(
                attr.f
            );
        }


        if (
            attr.s !== undefined
        ) {

            return attr.s;
        }


        return fallback;
    }


    /*
     * Читає TensorProto.rawData.
     *
     * Головний захист:
     * створюємо новий Uint8Array,
     * тому byteOffset завжди 0.
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


            console.log(
                "[AI] Reading tensor:",
                {
                    dataType:
                        tensor.dataType,

                    dims:
                        tensor.dims,

                    bytes:
                        bytes.byteLength
                }
            );


            switch (
                tensor.dataType
            ) {


                // FLOAT
                case 1:

                    if (
                        bytes.byteLength % 4 !== 0
                    ) {

                        throw new Error(
                            "FLOAT tensor має неправильний розмір"
                        );
                    }

                    return new Float32Array(
                        bytes.buffer
                    );


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
                case 4:

                    if (
                        bytes.byteLength % 2 !== 0
                    ) {

                        throw new Error(
                            "UINT16 tensor має непарний розмір"
                        );
                    }

                    return new Uint16Array(
                        bytes.buffer
                    );


                // FLOAT16
                case 10:

                    if (
                        bytes.byteLength % 2 !== 0
                    ) {

                        throw new Error(
                            "FLOAT16 tensor має непарний розмір"
                        );
                    }

                    return new Uint16Array(
                        bytes.buffer
                    );


                default:

                    console.warn(
                        "[AI] Невідомий dataType:",
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


    _float16ToFloat32(value) {

        const h =
            Number(value) &
            0xffff;


        const sign =
            (h & 0x8000)
                ? -1
                : 1;


        const exponent =
            (h >> 10) &
            0x1f;


        const fraction =
            h & 0x03ff;


        if (
            exponent === 0
        ) {

            if (
                fraction === 0
            ) {

                return sign * 0;
            }


            return (
                sign *
                Math.pow(
                    2,
                    -14
                ) *
                (
                    fraction /
                    1024
                )
            );
        }


        if (
            exponent === 31
        ) {

            if (
                fraction === 0
            ) {

                return sign *
                    Infinity;
            }

            return NaN;
        }


        return (
            sign *
            Math.pow(
                2,
                exponent - 15
            ) *
            (
                1 +
                fraction / 1024
            )
        );
    }


    _unpackQ4(
        byte,
        high
    ) {

        return high
            ? (
                (byte >> 4) &
                0x0f
            )
            : (
                byte &
                0x0f
            );
    }


    _getZeroPoint(
        zeroPoints,
        index
    ) {

        if (
            !zeroPoints
        ) {

            return 8;
        }


        const byte =
            zeroPoints[
                Math.floor(
                    index / 2
                )
            ];


        if (
            byte === undefined
        ) {

            return 8;
        }


        return this._unpackQ4(
            byte,
            (index & 1) !== 0
        );
    }


    _dumpBytes(
        data,
        count = 32
    ) {

        if (!data) {

            return [];
        }


        const result = [];


        const n =
            Math.min(
                count,
                data.length
            );


        for (
            let i = 0;
            i < n;
            i++
        ) {

            result.push(
                Number(
                    data[i]
                )
            );
        }


        return result;
    }


    _decodeQ4Sample(node) {

        console.log(
            "[AI] ===== Q4 SAMPLE START ====="
        );


        const inputs =
            node.inputs || [];


        console.log(
            "[AI] Node:",
            node.name
        );


        console.log(
            "[AI] Inputs:",
            inputs
        );


        console.log(
            "[AI] Attributes:",
            node.attributes
        );


        const weightName =
            inputs[1];


        const scaleName =
            inputs[2];


        const zeroName =
            inputs[3] || null;


        console.log(
            "[AI] Weight:",
            weightName
        );


        console.log(
            "[AI] Scale:",
            scaleName
        );


        console.log(
            "[AI] ZeroPoint:",
            zeroName
        );


        const weightTensor =
            this.model.getInitializer(
                weightName
            );


        const scaleTensor =
            this.model.getInitializer(
                scaleName
            );


        const zeroTensor =
            zeroName
                ? this.model.getInitializer(
                    zeroName
                  )
                : null;


        console.log(
            "[AI] Weight tensor:",
            weightTensor
        );


        console.log(
            "[AI] Scale tensor:",
            scaleTensor
        );


        console.log(
            "[AI] Zero tensor:",
            zeroTensor
        );


        if (!weightTensor) {

            throw new Error(
                "Weight tensor не знайдений."
            );
        }


        if (!scaleTensor) {

            throw new Error(
                "Scale tensor не знайдений."
            );
        }


        const weights =
            this._readRawTensor(
                weightTensor
            );


        const scales =
            this._readRawTensor(
                scaleTensor
            );


        const zeroPoints =
            zeroTensor
                ? this._readRawTensor(
                    zeroTensor
                  )
                : null;


        console.log(
            "[AI] Weight type:",
            weights &&
            weights.constructor.name
        );


        console.log(
            "[AI] Scale type:",
            scales &&
            scales.constructor.name
        );


        console.log(
            "[AI] Zero type:",
            zeroPoints &&
            zeroPoints.constructor.name
        );


        console.log(
            "[AI] First weight bytes:",
            this._dumpBytes(
                weights,
                64
            )
        );


        console.log(
            "[AI] First scale values:",
            scales
                ? Array.from(
                    scales.slice(
                        0,
                        Math.min(
                            32,
                            scales.length
                        )
                    )
                  )
                : []
        );


        if (zeroPoints) {

            console.log(
                "[AI] First zero-point bytes:",
                this._dumpBytes(
                    zeroPoints,
                    32
                )
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
            "[AI] Q4 attributes:",
            {
                K,
                N,
                bits,
                blockSize
            }
        );


        if (
            !K ||
            !N
        ) {

            throw new Error(
                "У MatMulNBits немає K або N."
            );
        }


        const valuesPerByte =
            8 / bits;


        const blobSize =
            Math.ceil(
                blockSize *
                bits /
                8
            );


        const blocksPerRow =
            Math.ceil(
                K /
                blockSize
            );


        console.log(
            "[AI] Q4 layout:",
            {
                K,
                N,
                bits,
                blockSize,
                valuesPerByte,
                blobSize,
                blocksPerRow,

                weightDims:
                    weightTensor.dims,

                scaleDims:
                    scaleTensor.dims,

                weightBytes:
                    weights.byteLength,

                scaleValues:
                    scales.length,

                zeroBytes:
                    zeroPoints
                        ? zeroPoints.byteLength
                        : 0
            }
        );


        /*
         * Перевіряємо перші 4 рядки
         * і перші 32 значення кожного.
         */

        const rows =
            Math.min(
                4,
                N
            );


        const cols =
            Math.min(
                32,
                K
            );


        let minimum =
            Infinity;


        let maximum =
            -Infinity;


        let bad =
            0;


        const decoded =
            [];


        for (
            let row = 0;
            row < rows;
            row++
        ) {

            const rowValues =
                [];


            for (
                let col = 0;
                col < cols;
                col++
            ) {

                const block =
                    Math.floor(
                        col /
                        blockSize
                    );


                const inside =
                    col %
                    blockSize;


                const scaleIndex =
                    row *
                    blocksPerRow +
                    block;


                const scaleRaw =
                    scales[
                        scaleIndex
                    ];


                const scale =
                    this._float16ToFloat32(
                        scaleRaw
                    );


                /*
                 * MatMulNBits B:
                 *
                 * [N, blocks, packed]
                 */

                const packedIndex =
                    (
                        row *
                        blocksPerRow *
                        blobSize
                    ) +
                    (
                        block *
                        blobSize
                    ) +
                    Math.floor(
                        inside /
                        valuesPerByte
                    );


                const packed =
                    weights[
                        packedIndex
                    ];


                if (
                    packed === undefined
                ) {

                    bad++;

                    rowValues.push(
                        NaN
                    );

                    continue;
                }


                let q = 0;


                if (
                    bits === 4
                ) {

                    q =
                        this._unpackQ4(
                            packed,
                            (
                                inside &
                                1
                            ) !== 0
                        );
                }


                const zero =
                    this._getZeroPoint(
                        zeroPoints,
                        scaleIndex
                    );


                const value =
                    (
                        q -
                        zero
                    ) *
                    scale;


                rowValues.push(
                    value
                );


                if (
                    Number.isFinite(
                        value
                    )
                ) {

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

                } else {

                    bad++;
                }
            }


            decoded.push(
                rowValues
            );
        }


        console.log(
            "[AI] Q4 decoded sample:",
            decoded
        );


        console.log(
            "[AI] Q4 statistics:",
            {
                minimum,
                maximum,
                bad
            }
        );


        console.log(
            "[AI] ===== Q4 SAMPLE END ====="
        );


        return {
            K,
            N,
            bits,
            blockSize,
            blobSize,
            blocksPerRow,
            weights,
            scales,
            zeroPoints,
            decoded,
            minimum,
            maximum,
            bad
        };
    }


    _prepareForward() {

        try {

            if (
                !this.model.inspectMatMulNBits
            ) {

                throw new Error(
                    "inspectMatMulNBits недоступний."
                );
            }


            const nodes =
                this.model.inspectMatMulNBits();


            if (
                !nodes ||
                nodes.length === 0
            ) {

                throw new Error(
                    "MatMulNBits не знайдено."
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

                    inputs:
                        this.firstQMatMul.inputs,

                    outputs:
                        this.firstQMatMul.outputs,

                    attributes:
                        this.firstQMatMul.attributes
                }
            );


            const result =
                this._decodeQ4Sample(
                    this.firstQMatMul
                );


            if (
                result.bad > 0
            ) {

                console.warn(
                    "[AI] Q4 sample має проблемні значення:",
                    result.bad
                );
            }


            if (
                !Number.isFinite(
                    result.minimum
                ) ||
                !Number.isFinite(
                    result.maximum
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

            max =
                Math.max(
                    max,
                    input[i]
                );
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

        const n =
            Math.min(
                a.length,
                b.length
            );


        let result = 0;


        for (
            let i = 0;
            i < n;
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

        let value =
            -Infinity;


        for (
            let i = 0;
            i < input.length;
            i++
        ) {

            if (
                input[i] >
                value
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


        for (
            let i = 0;
            i + 1 <
            vector.length;
            i += 2
        ) {

            const exponent =
                i /
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
                Math.cos(
                    angle
                );


            const sin =
                Math.sin(
                    angle
                );


            const a =
                vector[i];


            const b =
                vector[i + 1];


            out[i] =
                a * cos -
                b * sin;


            out[i + 1] =
                a * sin +
                b * cos;
        }


        return out;
    }


    async generate(
        prompt,
        options = {}
    ) {

        if (
            !this.ready
        ) {

            throw new Error(
                "SmallLLM ще не готовий."
            );
        }


        if (
            !this.forwardReady
        ) {

            throw new Error(
                "Q4 forward не пройшов підготовчий тест."
            );
        }


        if (
            !this.tokenizer
        ) {

            throw new Error(
                "Tokenizer ще не підключений."
            );
        }


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