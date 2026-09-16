(() => {
    "use strict";

    /*
     * AI Couple Lab
     * Minimal ONNX protobuf reader
     *
     * Завдання цього файлу:
     * 1. Завантажити ONNX
     * 2. Розібрати protobuf без плутанини string/bytes/int64
     * 3. Отримати graph, nodes, initializers
     * 4. Знайти MatMulNBits
     *
     * Це ще НЕ inference engine.
     */

    class ByteReader {

        constructor(buffer) {
            this.bytes = new Uint8Array(buffer);
            this.pos = 0;
        }

        get length() {
            return this.bytes.length;
        }

        get eof() {
            return this.pos >= this.bytes.length;
        }

        remaining() {
            return this.bytes.length - this.pos;
        }

        readByte() {
            if (this.pos >= this.bytes.length) {
                throw new Error("protobuf: читання за межами buffer");
            }

            return this.bytes[this.pos++];
        }

        readBytes(length) {
            if (length < 0 || this.pos + length > this.bytes.length) {
                throw new Error(
                    `protobuf: неправильна довжина bytes: ${length}`
                );
            }

            const start = this.pos;
            this.pos += length;

            return this.bytes.subarray(start, start + length);
        }

        readVarint() {

            let result = 0n;
            let shift = 0n;

            for (let i = 0; i < 10; i++) {

                const byte = this.readByte();

                result |= BigInt(byte & 0x7f) << shift;

                if ((byte & 0x80) === 0) {
                    return result;
                }

                shift += 7n;
            }

            throw new Error("protobuf: varint занадто довгий");
        }

        readUInt64() {
            return this.readVarint();
        }

        readInt64() {

            const value = this.readVarint();

            /*
             * protobuf int64 використовує two's complement.
             */

            return BigInt.asIntN(64, value);
        }

        readBool() {
            return this.readVarint() !== 0n;
        }

        readFixed32() {

            const b0 = this.readByte();
            const b1 = this.readByte();
            const b2 = this.readByte();
            const b3 = this.readByte();

            return (
                b0 |
                (b1 << 8) |
                (b2 << 16) |
                (b3 << 24)
            ) >>> 0;
        }

        readFloat32() {

            const buffer = new ArrayBuffer(4);
            const view = new DataView(buffer);

            for (let i = 0; i < 4; i++) {
                view.setUint8(i, this.readByte());
            }

            return view.getFloat32(0, true);
        }

        readFixed64() {

            const low = BigInt(this.readFixed32());
            const high = BigInt(this.readFixed32());

            return low | (high << 32n);
        }

        readDouble() {

            const low = this.readFixed32();
            const high = this.readFixed32();

            const buffer = new ArrayBuffer(8);
            const view = new DataView(buffer);

            view.setUint32(0, low, true);
            view.setUint32(4, high, true);

            return view.getFloat64(0, true);
        }

        readString(length) {

            const bytes = this.readBytes(length);

            return new TextDecoder("utf-8").decode(bytes);
        }

        skip(wireType) {

            switch (wireType) {

                case 0:
                    this.readVarint();
                    return;

                case 1:
                    this.readBytes(8);
                    return;

                case 2: {
                    const length = this.readVarint();

                    if (length > BigInt(Number.MAX_SAFE_INTEGER)) {
                        throw new Error("protobuf: bytes занадто великі");
                    }

                    this.readBytes(Number(length));
                    return;
                }

                case 5:
                    this.readBytes(4);
                    return;

                default:
                    throw new Error(
                        `protobuf: невідомий wire type ${wireType}`
                    );
            }
        }
    }


    /*
     * Читає protobuf message в масив:
     *
     * {
     *   field: номер поля,
     *   wire: wire type,
     *   value: значення
     * }
     */

    function readFields(buffer) {

        const reader =
            buffer instanceof ByteReader
                ? buffer
                : new ByteReader(buffer);

        const fields = [];

        while (!reader.eof) {

            const tag = reader.readVarint();

            const fieldNumber = Number(tag >> 3n);
            const wireType = Number(tag & 7n);

            if (!fieldNumber) {
                throw new Error("protobuf: field number = 0");
            }

            let value;

            switch (wireType) {

                case 0:
                    value = reader.readVarint();
                    break;

                case 1:
                    value = reader.readDouble();
                    break;

                case 2: {

                    const lengthBig = reader.readVarint();

                    if (
                        lengthBig >
                        BigInt(Number.MAX_SAFE_INTEGER)
                    ) {
                        throw new Error(
                            "protobuf: message занадто великий"
                        );
                    }

                    value =
                        reader.readBytes(
                            Number(lengthBig)
                        );

                    break;
                }

                case 5:
                    value = reader.readFloat32();
                    break;

                default:
                    throw new Error(
                        `protobuf: unsupported wire type ${wireType}`
                    );
            }

            fields.push({
                field: fieldNumber,
                wire: wireType,
                value
            });
        }

        return fields;
    }


    function fieldsOf(fields, number) {
        return fields.filter(x => x.field === number);
    }


    function firstField(fields, number) {

        const found =
            fields.find(x => x.field === number);

        return found ? found.value : undefined;
    }


    function bytesToString(bytes) {

        if (!bytes) return "";

        return new TextDecoder("utf-8").decode(bytes);
    }


    function bigintToNumber(value) {

        if (typeof value === "number") {
            return value;
        }

        const n = Number(value);

        if (!Number.isSafeInteger(n)) {
            console.warn(
                "[ONNX] BigInt перевищує safe integer:",
                value.toString()
            );
        }

        return n;
    }


    function bigintArrayToNumbers(values) {
        return values.map(bigintToNumber);
    }


    /*
     * TensorProto
     */

    function decodeTensorProto(buffer) {

        const fields = readFields(buffer);

        const tensor = {
            dims: [],
            dataType: null,
            floatData: [],
            int32Data: [],
            int64Data: [],
            uint64Data: [],
            doubleData: [],
            stringData: [],
            rawData: null,
            name: "",
            externalData: [],
            dataLocation: null
        };

        for (const item of fields) {

            switch (item.field) {

                /*
                 * repeated int64 dims
                 */
                case 1:

                    if (item.wire === 0) {
                        tensor.dims.push(
                            bigintToNumber(
                                BigInt.asIntN(
                                    64,
                                    item.value
                                )
                            )
                        );
                    }

                    else if (item.wire === 2) {

                        const packed =
                            readFields(item.value);

                        for (const p of packed) {
                            if (p.wire === 0) {
                                tensor.dims.push(
                                    bigintToNumber(
                                        BigInt.asIntN(
                                            64,
                                            p.value
                                        )
                                    )
                                );
                            }
                        }
                    }

                    break;


                /*
                 * data_type
                 */
                case 2:

                    if (item.wire === 0) {
                        tensor.dataType =
                            bigintToNumber(item.value);
                    }

                    break;


                /*
                 * float_data
                 */
                case 4:

                    if (item.wire === 5) {
                        tensor.floatData.push(item.value);
                    }

                    else if (item.wire === 2) {

                        const packed =
                            readFields(item.value);

                        for (const p of packed) {
                            if (p.wire === 5) {
                                tensor.floatData.push(p.value);
                            }
                        }
                    }

                    break;


                /*
                 * int32_data
                 */
                case 5:

                    if (item.wire === 0) {
                        tensor.int32Data.push(
                            bigintToNumber(
                                BigInt.asIntN(
                                    32,
                                    item.value
                                )
                            )
                        );
                    }

                    else if (item.wire === 2) {

                        const packed =
                            readFields(item.value);

                        for (const p of packed) {
                            if (p.wire === 0) {
                                tensor.int32Data.push(
                                    bigintToNumber(
                                        BigInt.asIntN(
                                            32,
                                            p.value
                                        )
                                    )
                                );
                            }
                        }
                    }

                    break;


                /*
                 * int64_data
                 */
                case 7:

                    if (item.wire === 0) {
                        tensor.int64Data.push(
                            BigInt.asIntN(
                                64,
                                item.value
                            )
                        );
                    }

                    else if (item.wire === 2) {

                        const packed =
                            readFields(item.value);

                        for (const p of packed) {
                            if (p.wire === 0) {
                                tensor.int64Data.push(
                                    BigInt.asIntN(
                                        64,
                                        p.value
                                    )
                                );
                            }
                        }
                    }

                    break;


                /*
                 * string_data
                 */
                case 6:

                    if (item.wire === 2) {
                        tensor.stringData.push(
                            bytesToString(item.value)
                        );
                    }

                    break;


                /*
                 * name
                 */
                case 8:

                    if (item.wire === 2) {
                        tensor.name =
                            bytesToString(item.value);
                    }

                    break;


                /*
                 * raw_data
                 */
                case 9:

                    if (item.wire === 2) {
                        tensor.rawData =
                            item.value;
                    }

                    break;


                /*
                 * double_data
                 */
                case 10:

                    if (item.wire === 1) {
                        tensor.doubleData.push(
                            item.value
                        );
                    }

                    break;


                /*
                 * uint64_data
                 */
                case 11:

                    if (item.wire === 0) {
                        tensor.uint64Data.push(
                            item.value
                        );
                    }

                    else if (item.wire === 2) {

                        const packed =
                            readFields(item.value);

                        for (const p of packed) {
                            if (p.wire === 0) {
                                tensor.uint64Data.push(
                                    p.value
                                );
                            }
                        }
                    }

                    break;


                /*
                 * external_data
                 *
                 * repeated StringStringEntryProto
                 */
                case 13:

                    if (item.wire === 2) {

                        const entryFields =
                            readFields(item.value);

                        let key = "";
                        let value = "";

                        for (const e of entryFields) {

                            if (
                                e.field === 1 &&
                                e.wire === 2
                            ) {
                                key =
                                    bytesToString(e.value);
                            }

                            if (
                                e.field === 2 &&
                                e.wire === 2
                            ) {
                                value =
                                    bytesToString(e.value);
                            }
                        }

                        tensor.externalData.push({
                            key,
                            value
                        });
                    }

                    break;


                /*
                 * data_location
                 */
                case 14:

                    if (item.wire === 0) {
                        tensor.dataLocation =
                            bigintToNumber(item.value);
                    }

                    break;
            }
        }

        return tensor;
    }


    /*
     * AttributeProto
     */

    function decodeAttributeProto(buffer) {

        const fields = readFields(buffer);

        const attribute = {
            name: "",
            type: null,
            refAttrName: "",
            f: null,
            i: null,
            s: null,
            t: null,
            g: null,
            floats: [],
            ints: [],
            strings: [],
            tensors: [],
            graphs: []
        };

        for (const item of fields) {

            switch (item.field) {

                case 1:

                    if (item.wire === 2) {
                        attribute.name =
                            bytesToString(item.value);
                    }

                    break;

                /*
                 * f
                 */
                case 2:

                    if (item.wire === 5) {
                        attribute.f = item.value;
                    }

                    break;

                /*
                 * i
                 */
                case 3:

                    if (item.wire === 0) {
                        attribute.i =
                            BigInt.asIntN(
                                64,
                                item.value
                            );
                    }

                    break;

                /*
                 * s
                 */
                case 4:

                    if (item.wire === 2) {
                        attribute.s =
                            item.value;
                    }

                    break;

                /*
                 * t
                 */
                case 5:

                    if (item.wire === 2) {
                        attribute.t =
                            decodeTensorProto(
                                item.value
                            );
                    }

                    break;

                /*
                 * g
                 */
                case 6:

                    if (item.wire === 2) {
                        attribute.g =
                            decodeGraphProto(
                                item.value
                            );
                    }

                    break;

                /*
                 * floats
                 */
                case 7:

                    if (item.wire === 5) {
                        attribute.floats.push(
                            item.value
                        );
                    }

                    else if (item.wire === 2) {

                        const packed =
                            readFields(item.value);

                        for (const p of packed) {
                            if (p.wire === 5) {
                                attribute.floats.push(
                                    p.value
                                );
                            }
                        }
                    }

                    break;

                /*
                 * ints
                 */
                case 8:

                    if (item.wire === 0) {
                        attribute.ints.push(
                            BigInt.asIntN(
                                64,
                                item.value
                            )
                        );
                    }

                    else if (item.wire === 2) {

                        const packed =
                            readFields(item.value);

                        for (const p of packed) {
                            if (p.wire === 0) {
                                attribute.ints.push(
                                    BigInt.asIntN(
                                        64,
                                        p.value
                                    )
                                );
                            }
                        }
                    }

                    break;

                /*
                 * strings
                 */
                case 9:

                    if (item.wire === 2) {
                        attribute.strings.push(
                            item.value
                        );
                    }

                    break;

                /*
                 * tensors
                 */
                case 10:

                    if (item.wire === 2) {
                        attribute.tensors.push(
                            decodeTensorProto(
                                item.value
                            )
                        );
                    }

                    break;

                /*
                 * graphs
                 */
                case 11:

                    if (item.wire === 2) {
                        attribute.graphs.push(
                            decodeGraphProto(
                                item.value
                            )
                        );
                    }

                    break;

                /*
                 * type
                 */
                case 20:

                    if (item.wire === 0) {
                        attribute.type =
                            bigintToNumber(
                                item.value
                            );
                    }

                    break;

                /*
                 * ref_attr_name
                 */
                case 21:

                    if (item.wire === 2) {
                        attribute.refAttrName =
                            bytesToString(item.value);
                    }

                    break;
            }
        }

        return attribute;
    }


    /*
     * NodeProto
     */

    function decodeNodeProto(buffer) {

        const fields = readFields(buffer);

        const node = {
            inputs: [],
            outputs: [],
            name: "",
            opType: "",
            domain: "",
            attributes: []
        };

        for (const item of fields) {

            switch (item.field) {

                /*
                 * input
                 */
                case 1:

                    if (item.wire === 2) {
                        node.inputs.push(
                            bytesToString(item.value)
                        );
                    }

                    break;

                /*
                 * output
                 */
                case 2:

                    if (item.wire === 2) {
                        node.outputs.push(
                            bytesToString(item.value)
                        );
                    }

                    break;

                /*
                 * name
                 */
                case 3:

                    if (item.wire === 2) {
                        node.name =
                            bytesToString(item.value);
                    }

                    break;

                /*
                 * op_type
                 */
                case 4:

                    if (item.wire === 2) {
                        node.opType =
                            bytesToString(item.value);
                    }

                    break;

                /*
                 * attribute
                 */
                case 5:

                    if (item.wire === 2) {
                        node.attributes.push(
                            decodeAttributeProto(
                                item.value
                            )
                        );
                    }

                    break;

                /*
                 * domain
                 */
                case 7:

                    if (item.wire === 2) {
                        node.domain =
                            bytesToString(item.value);
                    }

                    break;
            }
        }

        return node;
    }


    /*
     * ValueInfoProto
     *
     * ВАЖЛИВО:
     *
     * field 1 = name      -> STRING
     * field 2 = doc_string -> STRING
     * field 3 = type      -> message
     *
     * Старий код помилково трактував деякі байти
     * як int64. Саме це давало:
     *
     * Cannot convert
     * 98,97,116,99,104...
     *
     * тобто "batch_size".
     */

    function decodeValueInfo(buffer) {

        const fields = readFields(buffer);

        const result = {
            name: "",
            docString: "",
            type: null
        };

        for (const item of fields) {

            switch (item.field) {

                case 1:

                    if (item.wire !== 2) {
                        throw new Error(
                            "ValueInfoProto.name має бути string"
                        );
                    }

                    result.name =
                        bytesToString(item.value);

                    break;

                case 2:

                    if (item.wire === 2) {
                        result.docString =
                            bytesToString(item.value);
                    }

                    break;

                case 3:

                    if (item.wire === 2) {
                        result.type =
                            decodeTypeProto(
                                item.value
                            );
                    }

                    break;

                default:
                    break;
            }
        }

        return result;
    }


    /*
     * TypeProto
     */

    function decodeTypeProto(buffer) {

        const fields = readFields(buffer);

        const type = {
            tensorType: null,
            sequenceType: null,
            mapType: null,
            optionalType: null
        };

        for (const item of fields) {

            if (item.wire !== 2) {
                continue;
            }

            switch (item.field) {

                /*
                 * tensor_type
                 */
                case 1:
                    type.tensorType =
                        decodeTensorTypeProto(
                            item.value
                        );
                    break;

                /*
                 * sequence_type
                 */
                case 4:
                    type.sequenceType =
                        item.value;
                    break;

                /*
                 * map_type
                 */
                case 5:
                    type.mapType =
                        item.value;
                    break;

                /*
                 * optional_type
                 */
                case 9:
                    type.optionalType =
                        item.value;
                    break;
            }
        }

        return type;
    }


    /*
     * TensorTypeProto
     *
     * field 1 = elem_type
     * field 2 = shape
     */

    function decodeTensorTypeProto(buffer) {

        const fields = readFields(buffer);

        const result = {
            elemType: null,
            shape: null
        };

        for (const item of fields) {

            if (item.field === 1) {

                if (item.wire === 0) {
                    result.elemType =
                        bigintToNumber(item.value);
                }

                continue;
            }

            if (
                item.field === 2 &&
                item.wire === 2
            ) {

                result.shape =
                    decodeTensorShapeProto(
                        item.value
                    );
            }
        }

        return result;
    }


    /*
     * TensorShapeProto
     */

    function decodeTensorShapeProto(buffer) {

        const fields = readFields(buffer);

        const dimensions = [];

        for (const item of fields) {

            if (
                item.field === 1 &&
                item.wire === 2
            ) {

                dimensions.push(
                    decodeDimensionProto(
                        item.value
                    )
                );
            }
        }

        return {
            dimensions
        };
    }


    /*
     * TensorShapeProto.Dimension
     *
     * field 1 = dim_value int64
     * field 2 = dim_param string
     */

    function decodeDimensionProto(buffer) {

        const fields = readFields(buffer);

        const dimension = {
            value: null,
            param: null
        };

        for (const item of fields) {

            if (
                item.field === 1 &&
                item.wire === 0
            ) {

                dimension.value =
                    bigintToNumber(
                        BigInt.asIntN(
                            64,
                            item.value
                        )
                    );
            }

            else if (
                item.field === 2 &&
                item.wire === 2
            ) {

                dimension.param =
                    bytesToString(item.value);
            }
        }

        return dimension;
    }


    /*
     * GraphProto
     */

    function decodeGraphProto(buffer) {

        const fields = readFields(buffer);

        const graph = {
            nodes: [],
            name: "",
            initializers: [],
            inputs: [],
            outputs: [],
            valueInfo: []
        };

        for (const item of fields) {

            switch (item.field) {

                /*
                 * node
                 */
                case 1:

                    if (item.wire === 2) {
                        graph.nodes.push(
                            decodeNodeProto(
                                item.value
                            )
                        );
                    }

                    break;

                /*
                 * name
                 */
                case 2:

                    if (item.wire === 2) {
                        graph.name =
                            bytesToString(item.value);
                    }

                    break;

                /*
                 * initializer
                 */
                case 5:

                    if (item.wire === 2) {

                        graph.initializers.push(
                            decodeTensorProto(
                                item.value
                            )
                        );
                    }

                    break;

                /*
                 * input
                 */
                case 11:

                    if (item.wire === 2) {

                        graph.inputs.push(
                            decodeValueInfo(
                                item.value
                            )
                        );
                    }

                    break;

                /*
                 * output
                 */
                case 12:

                    if (item.wire === 2) {

                        graph.outputs.push(
                            decodeValueInfo(
                                item.value
                            )
                        );
                    }

                    break;

                /*
                 * value_info
                 */
                case 13:

                    if (item.wire === 2) {

                        graph.valueInfo.push(
                            decodeValueInfo(
                                item.value
                            )
                        );
                    }

                    break;
            }
        }

        return graph;
    }


    /*
     * ModelProto
     */

    function decodeModelProto(buffer) {

        const fields = readFields(buffer);

        const model = {
            irVersion: null,
            producerName: "",
            producerVersion: "",
            domain: "",
            modelVersion: null,
            graph: null,
            opsets: []
        };

        for (const item of fields) {

            switch (item.field) {

                /*
                 * ir_version
                 */
                case 1:

                    if (item.wire === 0) {
                        model.irVersion =
                            BigInt.asIntN(
                                64,
                                item.value
                            );
                    }

                    break;

                /*
                 * producer_name
                 */
                case 2:

                    if (item.wire === 2) {
                        model.producerName =
                            bytesToString(item.value);
                    }

                    break;

                /*
                 * producer_version
                 */
                case 3:

                    if (item.wire === 2) {
                        model.producerVersion =
                            bytesToString(item.value);
                    }

                    break;

                /*
                 * domain
                 */
                case 4:

                    if (item.wire === 2) {
                        model.domain =
                            bytesToString(item.value);
                    }

                    break;

                /*
                 * model_version
                 */
                case 5:

                    if (item.wire === 0) {
                        model.modelVersion =
                            BigInt.asIntN(
                                64,
                                item.value
                            );
                    }

                    break;

                /*
                 * graph
                 */
                case 7:

                    if (item.wire === 2) {
                        model.graph =
                            decodeGraphProto(
                                item.value
                            );
                    }

                    break;

                /*
                 * opset_import
                 *
                 * тут достатньо зберегти сирі поля,
                 * повний OpsetProto нам зараз не потрібен.
                 */
                case 8:

                    if (item.wire === 2) {

                        const opsetFields =
                            readFields(item.value);

                        let domain = "";
                        let version = null;

                        for (
                            const opField of opsetFields
                        ) {

                            if (
                                opField.field === 1 &&
                                opField.wire === 2
                            ) {

                                domain =
                                    bytesToString(
                                        opField.value
                                    );
                            }

                            if (
                                opField.field === 2 &&
                                opField.wire === 0
                            ) {

                                version =
                                    BigInt.asIntN(
                                        64,
                                        opField.value
                                    );
                            }
                        }

                        model.opsets.push({
                            domain,
                            version
                        });
                    }

                    break;
            }
        }

        return model;
    }


    class ONNXModel {

        constructor() {

            this.buffer = null;
            this.model = null;
            this.loaded = false;

            this.graph = null;

            this.initializers = new Map();
            this.nodes = [];
            this.inputs = [];
            this.outputs = [];
            this.valueInfo = [];
        }


        async load(url) {

            console.log(
                "[ONNX] Завантаження:",
                url
            );

            const response =
                await fetch(url);

            if (!response.ok) {
                throw new Error(
                    `ONNX HTTP ${response.status}`
                );
            }

            this.buffer =
                await response.arrayBuffer();

            console.log(
                "[ONNX] Отримано",
                (
                    this.buffer.byteLength /
                    1024 /
                    1024
                ).toFixed(1),
                "MB"
            );

            this.parse();

            this.loaded = true;

            console.log(
                "[ONNX] Модель успішно розібрана."
            );

            return this;
        }


        parse() {

            console.log(
                "[ONNX] Розбір protobuf..."
            );

            this.model =
                decodeModelProto(
                    this.buffer
                );

            if (!this.model.graph) {
                throw new Error(
                    "ONNX: GraphProto не знайдений"
                );
            }

            this.graph =
                this.model.graph;

            this.nodes =
                this.graph.nodes;

            this.inputs =
                this.graph.inputs;

            this.outputs =
                this.graph.outputs;

            this.valueInfo =
                this.graph.valueInfo;

            this.initializers.clear();

            for (
                const tensor
                of this.graph.initializers
            ) {

                if (tensor.name) {

                    this.initializers.set(
                        tensor.name,
                        tensor
                    );
                }
            }

            console.log(
                "[ONNX] Graph:",
                this.graph.name
            );

            console.log(
                "[ONNX] Nodes:",
                this.nodes.length
            );

            console.log(
                "[ONNX] Initializers:",
                this.initializers.size
            );

            console.log(
                "[ONNX] Inputs:",
                this.inputs.length
            );

            console.log(
                "[ONNX] Outputs:",
                this.outputs.length
            );

            console.log(
                "[ONNX] ValueInfo:",
                this.valueInfo.length
            );
        }


        getInitializer(name) {

            return this.initializers.get(name);
        }


        getNodeAttributes(node) {

            const result = {};

            for (
                const attribute
                of node.attributes
            ) {

                if (attribute.f !== null) {
                    result[attribute.name] =
                        attribute.f;
                }

                else if (attribute.i !== null) {
                    result[attribute.name] =
                        attribute.i;
                }

                else if (attribute.s !== null) {
                    result[attribute.name] =
                        bytesToString(attribute.s);
                }

                else if (attribute.t !== null) {
                    result[attribute.name] =
                        attribute.t;
                }

                else if (
                    attribute.floats.length
                ) {
                    result[attribute.name] =
                        attribute.floats;
                }

                else if (
                    attribute.ints.length
                ) {
                    result[attribute.name] =
                        attribute.ints;
                }

                else if (
                    attribute.strings.length
                ) {
                    result[attribute.name] =
                        attribute.strings.map(
                            bytesToString
                        );
                }

                else {
                    result[attribute.name] = null;
                }
            }

            return result;
        }


        findNodesByOp(opType) {

            return this.nodes.filter(
                node => node.opType === opType
            );
        }


        inspectModel() {

            console.group(
                "[ONNX] Інформація про модель"
            );

            console.log(
                "IR version:",
                this.model.irVersion?.toString()
            );

            console.log(
                "Producer:",
                this.model.producerName,
                this.model.producerVersion
            );

            console.log(
                "Graph:",
                this.graph.name
            );

            console.log(
                "Nodes:",
                this.nodes.length
            );

            console.log(
                "Initializers:",
                this.initializers.size
            );

            console.log(
                "Inputs:",
                this.inputs
            );

            console.log(
                "Outputs:",
                this.outputs
            );

            console.groupEnd();
        }


        inspectMatMulNBits() {

            const nodes =
                this.findNodesByOp(
                    "MatMulNBits"
                );

            console.log(
                "[ONNX] MatMulNBits:",
                nodes.length
            );

            for (
                let i = 0;
                i < Math.min(nodes.length, 20);
                i++
            ) {

                const node = nodes[i];

                console.log(
                    `[ONNX] MatMulNBits #${i}`,
                    {
                        name: node.name,
                        inputs: node.inputs,
                        outputs: node.outputs,
                        attributes:
                            this.getNodeAttributes(node)
                    }
                );
            }

            return nodes;
        }


        inspectOperators() {

            const counts = new Map();

            for (
                const node
                of this.nodes
            ) {

                counts.set(
                    node.opType,
                    (counts.get(node.opType) || 0) + 1
                );
            }

            const sorted =
                [...counts.entries()]
                    .sort(
                        (a, b) => b[1] - a[1]
                    );

            console.table(
                sorted.map(
                    ([op, count]) => ({
                        operator: op,
                        count
                    })
                )
            );

            return sorted;
        }
    }


    window.ONNXModel = ONNXModel;

    /*
     * Доступ для діагностики.
     * Необхідно тільки якщо захочемо тестувати protobuf
     * прямо з DevTools.
     */

    window.ONNXDebug = {
        ByteReader,
        readFields,
        decodeModelProto,
        decodeGraphProto,
        decodeValueInfo,
        decodeTypeProto,
        decodeTensorProto
    };

})();