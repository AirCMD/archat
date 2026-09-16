// ai/engine.js

const MODEL_URL =
    "https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/resolve/main/onnx/model_q4f16.onnx";

const CONFIG_URL =
    "https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/resolve/main/config.json";


class SmallLLM {

    constructor() {
        this.modelBuffer = null;
        this.config = null;
        this.tokenizer = null;

        this.loaded = false;
        this.loading = false;
    }


    async load() {

        if (this.loaded) {
            return;
        }

        if (this.loading) {
            throw new Error("Модель вже завантажується.");
        }

        this.loading = true;

        try {

            console.log("[AI] Завантаження конфігурації...");

            const configResponse = await fetch(CONFIG_URL);

            if (!configResponse.ok) {
                throw new Error(
                    `Config HTTP ${configResponse.status}`
                );
            }

            this.config = await configResponse.json();

            console.log(
                "[AI] Model:",
                this.config._name_or_path
            );

            console.log(
                "[AI] Architecture:",
                this.config.architectures
            );

            console.log(
                "[AI] Hidden size:",
                this.config.hidden_size
            );

            console.log(
                "[AI] Layers:",
                this.config.num_hidden_layers
            );


            console.log("[AI] Завантаження SmolLM2 ONNX...");

            const modelResponse = await fetch(MODEL_URL);

            if (!modelResponse.ok) {
                throw new Error(
                    `Model HTTP ${modelResponse.status}`
                );
            }

            this.modelBuffer =
                await modelResponse.arrayBuffer();


            console.log(
                `[AI] Модель отримана: ${
                    (this.modelBuffer.byteLength / 1024 / 1024).toFixed(1)
                } MB`
            );


            if (window.SmolTokenizer) {
                console.log("[AI] Завантаження tokenizer...");

                this.tokenizer =
                    new window.SmolTokenizer();

                await this.tokenizer.load();
            }


            this.loaded = true;

            console.log("[AI] Базове завантаження завершено.");

        } finally {

            this.loading = false;

        }
    }


    async generate(text) {

        if (!this.loaded) {
            await this.load();
        }

        if (!this.tokenizer) {
            throw new Error("Tokenizer не завантажений.");
        }

        const tokens =
            this.tokenizer.encode(text);

        console.log("[AI] Input:", text);
        console.log("[AI] Tokens:", tokens);

        /*
         * Тут буде власне виконання ONNX-графа.
         *
         * Наступним етапом ми реалізуємо:
         *
         * 1. читання ONNX protobuf;
         * 2. отримання graph;
         * 3. роботу з q4f16 weights;
         * 4. Llama RMSNorm;
         * 5. RoPE;
         * 6. Grouped Query Attention;
         * 7. SiLU;
         * 8. MLP;
         * 9. KV-cache;
         * 10. logits;
         * 11. sampling;
         * 12. autoregressive generation.
         */

        throw new Error(
            "Inference engine ще не реалізований."
        );
    }
}


window.SmallLLM = SmallLLM;