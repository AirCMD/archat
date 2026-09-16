// ai/onnx.js

class ProtoReader {

    constructor(buffer) {

        this.data =
            new Uint8Array(buffer);

        this.pos = 0;
    }

    get eof() {
        return this.pos >= this.data.length;
    }

    readByte() {

        return this.data[this.pos++];
    }


    readVarint() {

        let result = 0;
        let shift = 0;

        while (true) {

            const byte =
                this.readByte();

            result |=
                (byte & 0x7f) << shift;

            if ((byte & 0x80) === 0) {
                break;
            }

            shift += 7;

            if (shift > 63) {
                throw new Error(
                    "Varint занадто великий"
                );
            }
        }

        return result;
    }


    readLengthDelimited() {

        const length =
            this.readVarint();

        const start =
            this.pos;

        const end =
            start + length;

        const value =
            this.data.slice(
                start,
                end
            );

        this.pos = end;

        return value;
    }


    readString() {

        return new TextDecoder().decode(
            this.readLengthDelimited()
        );
    }


    skipWireType(wireType) {

        switch (wireType) {

            case 0:
                this.readVarint();
                break;

            case 1:
                this.pos += 8;
                break;

            case 2: {
                const length =
                    this.readVarint();

                this.pos += length;
                break;
            }

            case 5:
                this.pos += 4;
                break;

            default:
                throw new Error(
                    `Невідомий protobuf wire type: ${wireType}`
                );
        }
    }
}


function readFields(buffer) {

    const reader =
        new ProtoReader(buffer);

    const fields = [];

    while (!reader.eof) {

        const key =
            reader.readVarint();

        const fieldNumber =
            key >>> 3;

        const wireType =
            key & 7;

        let value;

        if (wireType === 0) {

            value =
                reader.readVarint();

        } else if (wireType === 2) {

            value =
                reader.readLengthDelimited();

        } else {

            reader.skipWireType(wireType);
            value = null;
        }

        fields.push({
            fieldNumber,
            wireType,
            value
        });
    }

    return fields;
}


function decodeNode(buffer) {

    const fields =
        readFields(buffer);

    const node = {
        input: [],
        output: [],
        name: "",
        opType: "",
        attributes: []
    };

    for (const field of fields) {

        switch (field.fieldNumber) {

            // input
            case 1:

                node.input.push(
                    new TextDecoder().decode(
                        field.value
                    )
                );

                break;

            // output
            case 2:

                node.output.push(
                    new TextDecoder().decode(
                        field.value
                    )
                );

                break;

            // name
            case 3:

                node.name =
                    new TextDecoder().decode(
                        field.value
                    );

                break;

            // op_type
            case 4:

                node.opType =
                    new TextDecoder().decode(
                        field.value
                    );

                break;

            // AttributeProto
            case 5:

                node.attributes.push(
                    decodeAttribute(
                        field.value
                    )
                );

                break;
        }
    }

    return node;
}


function decodeAttribute(buffer) {

    const fields =
        readFields(buffer);

    const attr = {
        name: "",
        type: null,
        value: null
    };

    for (const field of fields) {

        switch (field.fieldNumber) {

            case 1:

                attr.name =
                    new TextDecoder().decode(
                        field.value
                    );

                break;

            case 20:

                attr.type =
                    field.value;

                break;

            case 2:

                attr.value =
                    field.value;

                break;

            case 3:

                attr.value =
                    field.value;

                break;
        }
    }

    return attr;
}


class ONNXModel {

    constructor() {

        this.graph = null;

        this.nodes = [];
        this.initializers = new Map();

        this.inputs = [];
        this.outputs = [];
    }


    async load(url) {

        console.log(
            "[ONNX] Завантаження графа..."
        );

        const response =
            await fetch(url);

        if (!response.ok) {

            throw new Error(
                `ONNX HTTP ${response.status}`
            );
        }

        const buffer =
            await response.arrayBuffer();

        console.log(
            `[ONNX] Отримано ${(
                buffer.byteLength /
                1024 /
                1024
            ).toFixed(1)} MB`
        );

        this.parse(buffer);

        return this;
    }


    parse(buffer) {

        /*
         * На першому етапі нам потрібно отримати
         * ModelProto → GraphProto.
         */

        const fields =
            readFields(buffer);

        let graphBytes = null;

        for (const field of fields) {

            /*
             * ModelProto:
             *
             * field 7 = graph
             */

            if (
                field.fieldNumber === 7 &&
                field.wireType === 2
            ) {

                graphBytes =
                    field.value;

                break;
            }
        }

        if (!graphBytes) {

            throw new Error(
                "У ONNX не знайдено GraphProto."
            );
        }

        this.parseGraph(graphBytes);
    }


    parseGraph(buffer) {

        const fields =
            readFields(buffer);

        for (const field of fields) {

            switch (field.fieldNumber) {

                // node
                case 1:

                    this.nodes.push(
                        decodeNode(
                            field.value
                        )
                    );

                    break;

                // initializer
                case 5:

                    /*
                     * TensorProto буде реалізовано
                     * наступним етапом.
                     */

                    this.initializers.set(
                        `initializer_${this.initializers.size}`,
                        field.value
                    );

                    break;

                // input
                case 11:

                    this.inputs.push(
                        field.value
                    );

                    break;

                // output
                case 12:

                    this.outputs.push(
                        field.value
                    );

                    break;
            }
        }

        console.log(
            `[ONNX] Nodes: ${this.nodes.length}`
        );

        console.log(
            `[ONNX] Initializers: ${this.initializers.size}`
        );
    }
}


window.ProtoReader = ProtoReader;
window.ONNXModel = ONNXModel;