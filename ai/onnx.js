// ai/onnx.js
//
// Мінімальний власний ONNX protobuf reader.
// На цьому етапі:
// - читає ModelProto;
// - читає GraphProto;
// - читає NodeProto;
// - читає AttributeProto;
// - читає TensorProto;
// - декодує raw_data;
// - декодує float_data/int32_data/int64_data;
// - зберігає initializer за справжнім ім'ям;
// - розуміє MatMulNBits.
//
// Це НЕ ONNX Runtime.
// Це наш власний reader, спеціально під майбутній inference engine.


/* =========================================================
   PROTOBUF READER
   ========================================================= */

class ProtoReader {

    constructor(buffer) {

        this.data =
            buffer instanceof Uint8Array
                ? buffer
                : new Uint8Array(buffer);

        this.pos = 0;
    }


    get eof() {
        return this.pos >= this.data.length;
    }


    remaining() {
        return this.data.length - this.pos;
    }


    readByte() {

        if (this.pos >= this.data.length) {
            throw new Error(
                "Protobuf: вихід за межі буфера"
            );
        }

        return this.data[this.pos++];
    }


    readVarint() {

        let result = 0n;
        let shift = 0n;

        while (true) {

            const byte =
                this.readByte();

            result |=
                BigInt(byte & 0x7f) << shift;

            if ((byte & 0x80) === 0) {
                break;
            }

            shift += 7n;

            if (shift > 70n) {

                throw new Error(
                    "Protobuf: занадто великий varint"
                );
            }
        }

        return result;
    }


    readVarintNumber() {

        const value =
            this.readVarint();

        const number =
            Number(value);

        if (!Number.isSafeInteger(number)) {

            throw new Error(
                `Protobuf: значення ${value} завелике для Number`
            );
        }

        return number;
    }


    readInt64() {
        return this.readVarint();
    }


    readLengthDelimited() {

        const length =
            this.readVarintNumber();

        const start =
            this.pos;

        const end =
            start + length;

        if (end > this.data.length) {

            throw new Error(
                "Protobuf: length-delimited поле виходить за межі"
            );
        }

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


    readFixed32() {

        if (this.pos + 4 > this.data.length) {

            throw new Error(
                "Protobuf: недостатньо даних для fixed32"
            );
        }

        const view =
            new DataView(
                this.data.buffer,
                this.data.byteOffset + this.pos,
                4
            );

        const value =
            view.getUint32(
                0,
                true
            );

        this.pos += 4;

        return value;
    }


    readFloat32() {

        if (this.pos + 4 > this.data.length) {

            throw new Error(
                "Protobuf: недостатньо даних для float32"
            );
        }

        const view =
            new DataView(
                this.data.buffer,
                this.data.byteOffset + this.pos,
                4
            );

        const value =
            view.getFloat32(
                0,
                true
            );

        this.pos += 4;

        return value;
    }


    readFixed64() {

        if (this.pos + 8 > this.data.length) {

            throw new Error(
                "Protobuf: недостатньо даних для fixed64"
            );
        }

        const view =
            new DataView(
                this.data.buffer,
                this.data.byteOffset + this.pos,
                8
            );

        const value =
            view.getBigUint64(
                0,
                true
            );

        this.pos += 8;

        return value;
    }


    readDouble() {

        if (this.pos + 8 > this.data.length) {

            throw new Error(
                "Protobuf: недостатньо даних для double"
            );
        }

        const view =
            new DataView(
                this.data.buffer,
                this.data.byteOffset + this.pos,
                8
            );

        const value =
            view.getFloat64(
                0,
                true
            );

        this.pos += 8;

        return value;
    }


    skip(wireType) {

        switch (wireType) {

            case 0:
                this.readVarint();
                break;

            case 1:
                this.pos += 8;
                break;

            case 2: {
                const length =
                    this.readVarintNumber();

                this.pos += length;
                break;
            }

            case 5:
                this.pos += 4;
                break;

            default:

                throw new Error(
                    `Protobuf: невідомий wire type ${wireType}`
                );
        }

        if (this.pos > this.data.length) {

            throw new Error(
                "Protobuf: skip вийшов за межі буфера"
            );
        }
    }
}


/* =========================================================
   GENERIC FIELD READER
   ========================================================= */

function readProtoFields(buffer) {

    const reader =
        new ProtoReader(buffer);

    const fields = [];

    while (!reader.eof) {

        const key =
            reader.readVarintNumber();

        const fieldNumber =
            Math.floor(key / 8);

        const wireType =
            key & 7;

        let value = null;

        switch (wireType) {

            case 0:
                value =
                    reader.readVarint();
                break;

            case 1:
                value =
                    reader.readFixed64();
                break;

            case 2:
                value =
                    reader.readLengthDelimited();
                break;

            case 5:
                value =
                    reader.readFixed32();
                break;

            default:

                reader.skip(wireType);
                break;
        }

        fields.push({
            fieldNumber,
            wireType,
            value
        });
    }

    return fields;
}


function fieldList(
    fields,
    number
) {

    return fields.filter(
        field =>
            field.fieldNumber === number
    );
}


function firstField(
    fields,
    number
) {

    return fields.find(
        field =>
            field.fieldNumber === number
    );
}


/* =========================================================
   ATTRIBUTE
   ========================================================= */

const ONNX_ATTRIBUTE_TYPE = {

    UNDEFINED: 0,
    FLOAT: 1,
    INT: 2,
    STRING: 3,
    TENSOR: 4,
    GRAPH: 5,
    SPARSE_TENSOR: 11,

    FLOATS: 6,
    INTS: 7,
    STRINGS: 8,
    TENSORS: 9,
    GRAPHS: 10,
    SPARSE_TENSORS: 12
};


function decodeAttribute(buffer) {

    const fields =
        readProtoFields(buffer);

    const attribute = {

        name: "",

        type: null,

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


    const nameField =
        firstField(fields, 1);

    if (nameField) {

        attribute.name =
            decodeStringField(
                nameField
            );
    }


    const typeField =
        firstField(fields, 20);

    if (typeField) {

        attribute.type =
            Number(
                typeField.value
            );
    }


    const f =
        firstField(fields, 2);

    if (f) {

        attribute.f =
            uint32ToFloat(
                Number(f.value)
            );
    }


    const i =
        firstField(fields, 3);

    if (i) {

        attribute.i =
            Number(
                BigInt.asIntN(
                    64,
                    i.value
                )
            );
    }


    const s =
        firstField(fields, 4);

    if (s) {

        attribute.s =
            decodeUTF8(
                s.value
            );
    }


    const tensor =
        firstField(fields, 5);

    if (tensor) {

        attribute.t =
            decodeTensorProto(
                tensor.value
            );
    }


    const graph =
        firstField(fields, 6);

    if (graph) {

        attribute.g =
            decodeGraphProto(
                graph.value
            );
    }


    for (
        const field
        of fieldList(fields, 7)
    ) {

        attribute.floats.push(
            Number(
                field.value
            )
        );
    }


    for (
        const field
        of fieldList(fields, 8)
    ) {

        attribute.ints.push(
            Number(
                BigInt.asIntN(
                    64,
                    field.value
                )
            )
        );
    }


    for (
        const field
        of fieldList(fields, 9)
    ) {

        attribute.strings.push(
            decodeUTF8(
                field.value
            )
        );
    }


    for (
        const field
        of fieldList(fields, 10)
    ) {

        attribute.tensors.push(
            decodeTensorProto(
                field.value
            )
        );
    }


    for (
        const field
        of fieldList(fields, 11)
    ) {

        attribute.graphs.push(
            decodeGraphProto(
                field.value
            )
        );
    }


    return attribute;
}


/* =========================================================
   TENSOR TYPES
   ========================================================= */

const ONNX_TENSOR_TYPE = {

    UNDEFINED: 0,

    FLOAT: 1,
    UINT8: 2,
    INT8: 3,
    UINT16: 4,
    INT16: 5,
    INT32: 6,
    INT64: 7,

    STRING: 8,
    BOOL: 9,

    FLOAT16: 10,
    DOUBLE: 11,

    UINT32: 12,
    UINT64: 13,

    COMPLEX64: 14,
    COMPLEX128: 15,

    BFLOAT16: 16,

    FLOAT8E4M3FN: 17,
    FLOAT8E4M3FNUZ: 18,
    FLOAT8E5M2: 19,
    FLOAT8E4M3: 20,
    FLOAT8E4M3FNUZ: 18
};


const ONNX_TENSOR_TYPE_NAME = {

    0: "UNDEFINED",

    1: "FLOAT",
    2: "UINT8",
    3: "INT8",
    4: "UINT16",
    5: "INT16",
    6: "INT32",
    7: "INT64",

    8: "STRING",
    9: "BOOL",

    10: "FLOAT16",
    11: "DOUBLE",

    12: "UINT32",
    13: "UINT64",

    14: "COMPLEX64",
    15: "COMPLEX128",

    16: "BFLOAT16",

    17: "FLOAT8E4M3FN",
    18: "FLOAT8E4M3FNUZ",
    19: "FLOAT8E5M2",
    20: "FLOAT8E4M3"
};


/* =========================================================
   TENSORPROTO
   ========================================================= */

function decodeTensorProto(buffer) {

    const fields =
        readProtoFields(buffer);

    const tensor = {

        name: "",

        dims: [],

        dataType: 0,

        dataTypeName: "UNDEFINED",

        rawData: null,

        floatData: [],
        doubleData: [],
        int32Data: [],
        int64Data: [],
        uint64Data: [],

        stringData: [],

        externalData: [],

        dataLocation: 0
    };


    /*
     * TensorProto.dims = field 1
     *
     * repeated int64
     *
     * Може бути packed wire type 2
     * або старий unpacked wire type 0.
     */

    for (
        const field
        of fieldList(fields, 1)
    ) {

        if (field.wireType === 0) {

            tensor.dims.push(
                Number(
                    BigInt.asIntN(
                        64,
                        field.value
                    )
                )
            );

        } else if (field.wireType === 2) {

            const packed =
                new ProtoReader(
                    field.value
                );

            while (!packed.eof) {

                tensor.dims.push(
                    Number(
                        BigInt.asIntN(
                            64,
                            packed.readVarint()
                        )
                    )
                );
            }
        }
    }


    /*
     * TensorProto.data_type = field 2
     */

    const typeField =
        firstField(fields, 2);

    if (typeField) {

        tensor.dataType =
            Number(
                typeField.value
            );

        tensor.dataTypeName =
            ONNX_TENSOR_TYPE_NAME[
                tensor.dataType
            ] ||
            `TYPE_${tensor.dataType}`;
    }


    /*
     * TensorProto.float_data = field 4
     */

    for (
        const field
        of fieldList(fields, 4)
    ) {

        if (field.wireType === 5) {

            tensor.floatData.push(
                uint32ToFloat(
                    Number(field.value)
                )
            );

        } else if (field.wireType === 2) {

            const packed =
                new ProtoReader(
                    field.value
                );

            while (!packed.eof) {

                tensor.floatData.push(
                    packed.readFloat32()
                );
            }
        }
    }


    /*
     * TensorProto.int32_data = field 5
     */

    for (
        const field
        of fieldList(fields, 5)
    ) {

        if (field.wireType === 0) {

            tensor.int32Data.push(
                Number(
                    BigInt.asIntN(
                        32,
                        field.value
                    )
                )
            );

        } else if (field.wireType === 2) {

            const packed =
                new ProtoReader(
                    field.value
                );

            while (!packed.eof) {

                tensor.int32Data.push(
                    Number(
                        BigInt.asIntN(
                            32,
                            packed.readVarint()
                        )
                    )
                );
            }
        }
    }


    /*
     * TensorProto.int64_data = field 7
     */

    for (
        const field
        of fieldList(fields, 7)
    ) {

        if (field.wireType === 0) {

            tensor.int64Data.push(
                BigInt.asIntN(
                    64,
                    field.value
                )
            );

        } else if (field.wireType === 2) {

            const packed =
                new ProtoReader(
                    field.value
                );

            while (!packed.eof) {

                tensor.int64Data.push(
                    BigInt.asIntN(
                        64,
                        packed.readVarint()
                    )
                );
            }
        }
    }


    /*
     * TensorProto.double_data = field 10
     */

    for (
        const field
        of fieldList(fields, 10)
    ) {

        if (field.wireType === 1) {

            tensor.doubleData.push(
                uint64ToDouble(
                    field.value
                )
            );

        } else if (field.wireType === 2) {

            const packed =
                new ProtoReader(
                    field.value
                );

            while (!packed.eof) {

                tensor.doubleData.push(
                    packed.readDouble()
                );
            }
        }
    }


    /*
     * TensorProto.uint64_data = field 11
     */

    for (
        const field
        of fieldList(fields, 11)
    ) {

        if (field.wireType === 0) {

            tensor.uint64Data.push(
                field.value
            );

        } else if (field.wireType === 2) {

            const packed =
                new ProtoReader(
                    field.value
                );

            while (!packed.eof) {

                tensor.uint64Data.push(
                    packed.readVarint()
                );
            }
        }
    }


    /*
     * TensorProto.string_data = field 6
     */

    for (
        const field
        of fieldList(fields, 6)
    ) {

        tensor.stringData.push(
            field.value
        );
    }


    /*
     * TensorProto.raw_data = field 9
     */

    const raw =
        firstField(fields, 9);

    if (raw) {

        tensor.rawData =
            raw.value;
    }


    /*
     * TensorProto.name = field 8
     */

    const name =
        firstField(fields, 8);

    if (name) {

        tensor.name =
            decodeUTF8(
                name.value
            );
    }


    /*
     * TensorProto.external_data = field 13
     */

    for (
        const field
        of fieldList(fields, 13)
    ) {

        const entryFields =
            readProtoFields(
                field.value
            );

        let key = "";
        let value = "";

        const keyField =
            firstField(
                entryFields,
                1
            );

        const valueField =
            firstField(
                entryFields,
                2
            );

        if (keyField) {
            key =
                decodeUTF8(
                    keyField.value
                );
        }

        if (valueField) {
            value =
                decodeUTF8(
                    valueField.value
                );
        }

        tensor.externalData.push({
            key,
            value
        });
    }


    /*
     * TensorProto.data_location = field 14
     */

    const location =
        firstField(fields, 14);

    if (location) {

        tensor.dataLocation =
            Number(
                location.value
            );
    }


    return tensor;
}


/* =========================================================
   TENSOR DATA DECODER
   ========================================================= */

function tensorElementCount(tensor) {

    if (!tensor.dims.length) {
        return 1;
    }

    return tensor.dims.reduce(
        (a, b) => a * b,
        1
    );
}


function tensorRawTypedArray(tensor) {

    if (!tensor.rawData) {
        return null;
    }

    const bytes =
        tensor.rawData;


    switch (tensor.dataType) {

        case ONNX_TENSOR_TYPE.FLOAT:

            return new Float32Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength / 4
            );


        case ONNX_TENSOR_TYPE.DOUBLE:

            return new Float64Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength / 8
            );


        case ONNX_TENSOR_TYPE.INT8:

            return new Int8Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength
            );


        case ONNX_TENSOR_TYPE.UINT8:

            return new Uint8Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength
            );


        case ONNX_TENSOR_TYPE.INT16:

            return new Int16Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength / 2
            );


        case ONNX_TENSOR_TYPE.UINT16:

            return new Uint16Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength / 2
            );


        case ONNX_TENSOR_TYPE.INT32:

            return new Int32Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength / 4
            );


        case ONNX_TENSOR_TYPE.UINT32:

            return new Uint32Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength / 4
            );


        case ONNX_TENSOR_TYPE.INT64: {

            const source =
                new BigInt64Array(
                    bytes.buffer,
                    bytes.byteOffset,
                    bytes.byteLength / 8
                );

            return Array.from(
                source,
                Number
            );
        }


        case ONNX_TENSOR_TYPE.UINT64: {

            const source =
                new BigUint64Array(
                    bytes.buffer,
                    bytes.byteOffset,
                    bytes.byteLength / 8
                );

            return Array.from(
                source,
                Number
            );
        }


        case ONNX_TENSOR_TYPE.FLOAT16:

            return new Uint16Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength / 2
            );


        case ONNX_TENSOR_TYPE.BFLOAT16:

            return new Uint16Array(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength / 2
            );


        default:

            return null;
    }
}


function getTensorData(tensor) {

    /*
     * raw_data має пріоритет.
     */

    const raw =
        tensorRawTypedArray(tensor);

    if (raw) {
        return raw;
    }


    switch (tensor.dataType) {

        case ONNX_TENSOR_TYPE.FLOAT:

            return new Float32Array(
                tensor.floatData
            );


        case ONNX_TENSOR_TYPE.DOUBLE:

            return new Float64Array(
                tensor.doubleData
            );


        case ONNX_TENSOR_TYPE.INT32:

            return new Int32Array(
                tensor.int32Data
            );


        case ONNX_TENSOR_TYPE.INT64:

            return tensor.int64Data.map(
                Number
            );


        case ONNX_TENSOR_TYPE.UINT64:

            return tensor.uint64Data.map(
                Number
            );


        default:

            return null;
    }
}


/* =========================================================
   NODE
   ========================================================= */

function decodeNode(buffer) {

    const fields =
        readProtoFields(buffer);

    const node = {

        name: "",

        opType: "",

        domain: "",

        inputs: [],
        outputs: [],

        attributes: []
    };


    /*
     * input = field 1
     */

    for (
        const field
        of fieldList(fields, 1)
    ) {

        node.inputs.push(
            decodeUTF8(
                field.value
            )
        );
    }


    /*
     * output = field 2
     */

    for (
        const field
        of fieldList(fields, 2)
    ) {

        node.outputs.push(
            decodeUTF8(
                field.value
            )
        );
    }


    /*
     * name = field 3
     */

    const name =
        firstField(fields, 3);

    if (name) {

        node.name =
            decodeUTF8(
                name.value
            );
    }


    /*
     * op_type = field 4
     */

    const op =
        firstField(fields, 4);

    if (op) {

        node.opType =
            decodeUTF8(
                op.value
            );
    }


    /*
     * attribute = field 5
     */

    for (
        const field
        of fieldList(fields, 5)
    ) {

        node.attributes.push(
            decodeAttribute(
                field.value
            )
        );
    }


    /*
     * domain = field 7
     */

    const domain =
        firstField(fields, 7);

    if (domain) {

        node.domain =
            decodeUTF8(
                domain.value
            );
    }


    return node;
}


/* =========================================================
   VALUE INFO
   ========================================================= */

function decodeValueInfo(buffer) {

    const fields =
        readProtoFields(buffer);

    const result = {

        name: "",

        elemType: null,

        dims: []
    };


    const name =
        firstField(fields, 1);

    if (name) {

        result.name =
            decodeUTF8(
                name.value
            );
    }


    /*
     * type = field 2
     *
     * TypeProto
     *
     * tensor_type = field 1
     */

    const typeField =
        firstField(fields, 2);

    if (!typeField) {
        return result;
    }


    const typeFields =
        readProtoFields(
            typeField.value
        );


    const tensorType =
        firstField(
            typeFields,
            1
        );

    if (!tensorType) {
        return result;
    }


    const tensorFields =
        readProtoFields(
            tensorType.value
        );


    const elemType =
        firstField(
            tensorFields,
            1
        );

    if (elemType) {

        result.elemType =
            Number(
                elemType.value
            );
    }


    const shape =
        firstField(
            tensorFields,
            2
        );

    if (shape) {

        const shapeFields =
            readProtoFields(
                shape.value
            );

        for (
            const dimension
            of fieldList(
                shapeFields,
                1
            )
        ) {

            const dimFields =
                readProtoFields(
                    dimension.value
                );

            const dimValue =
                firstField(
                    dimFields,
                    2
                );

            if (dimValue) {

                result.dims.push(
                    Number(
                        BigInt.asIntN(
                            64,
                            dimValue.value
                        )
                    )
                );

            } else {

                /*
                 * symbolic dimension
                 */

                result.dims.push(
                    null
                );
            }
        }
    }


    return result;
}


/* =========================================================
   GRAPH
   ========================================================= */

function decodeGraphProto(buffer) {

    const fields =
        readProtoFields(buffer);

    const graph = {

        name: "",

        nodes: [],

        initializers: new Map(),

        inputs: [],
        outputs: [],

        valueInfo: []
    };


    /*
     * node = field 1
     */

    for (
        const field
        of fieldList(fields, 1)
    ) {

        graph.nodes.push(
            decodeNode(
                field.value
            )
        );
    }


    /*
     * name = field 2
     */

    const name =
        firstField(fields, 2);

    if (name) {

        graph.name =
            decodeUTF8(
                name.value
            );
    }


    /*
     * initializer = field 5
     */

    for (
        const field
        of fieldList(fields, 5)
    ) {

        const tensor =
            decodeTensorProto(
                field.value
            );

        graph.initializers.set(
            tensor.name,
            tensor
        );
    }


    /*
     * input = field 11
     */

    for (
        const field
        of fieldList(fields, 11)
    ) {

        graph.inputs.push(
            decodeValueInfo(
                field.value
            )
        );
    }


    /*
     * output = field 12
     */

    for (
        const field
        of fieldList(fields, 12)
    ) {

        graph.outputs.push(
            decodeValueInfo(
                field.value
            )
        );
    }


    /*
     * value_info = field 13
     */

    for (
        const field
        of fieldList(fields, 13)
    ) {

        graph.valueInfo.push(
            decodeValueInfo(
                field.value
            )
        );
    }


    return graph;
}


/* =========================================================
   MODEL
   ========================================================= */

class ONNXModel {

    constructor() {

        this.irVersion = null;

        this.producerName = "";
        this.producerVersion = "";

        this.domain = "";
        this.modelVersion = null;

        this.graph = null;

        this.nodes = [];

        this.initializers =
            new Map();

        this.inputs = [];
        this.outputs = [];

        this.opsets = [];
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

        const fields =
            readProtoFields(buffer);


        /*
         * ModelProto.ir_version = field 1
         */

        const ir =
            firstField(
                fields,
                1
            );

        if (ir) {

            this.irVersion =
                Number(
                    BigInt.asIntN(
                        64,
                        ir.value
                    )
                );
        }


        /*
         * producer_name = field 2
         */

        const producer =
            firstField(
                fields,
                2
            );

        if (producer) {

            this.producerName =
                decodeUTF8(
                    producer.value
                );
        }


        /*
         * producer_version = field 3
         */

        const producerVersion =
            firstField(
                fields,
                3
            );

        if (producerVersion) {

            this.producerVersion =
                decodeUTF8(
                    producerVersion.value
                );
        }


        /*
         * domain = field 4
         */

        const domain =
            firstField(
                fields,
                4
            );

        if (domain) {

            this.domain =
                decodeUTF8(
                    domain.value
                );
        }


        /*
         * model_version = field 5
         */

        const version =
            firstField(
                fields,
                5
            );

        if (version) {

            this.modelVersion =
                Number(
                    BigInt.asIntN(
                        64,
                        version.value
                    )
                );
        }


        /*
         * graph = field 7
         */

        const graphField =
            firstField(
                fields,
                7
            );

        if (!graphField) {

            throw new Error(
                "ONNX: GraphProto не знайдено"
            );
        }


        this.graph =
            decodeGraphProto(
                graphField.value
            );


        this.nodes =
            this.graph.nodes;

        this.initializers =
            this.graph.initializers;

        this.inputs =
            this.graph.inputs;

        this.outputs =
            this.graph.outputs;


        /*
         * opset_import = field 8
         */

        for (
            const field
            of fieldList(fields, 8)
        ) {

            const opsetFields =
                readProtoFields(
                    field.value
                );

            let domain = "";

            let version = 0;

            const domainField =
                firstField(
                    opsetFields,
                    1
                );

            if (domainField) {

                domain =
                    decodeUTF8(
                        domainField.value
                    );
            }

            const versionField =
                firstField(
                    opsetFields,
                    2
                );

            if (versionField) {

                version =
                    Number(
                        BigInt.asIntN(
                            64,
                            versionField.value
                        )
                    );
            }

            this.opsets.push({
                domain,
                version
            });
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
            "[ONNX] Opsets:",
            this.opsets
        );
    }


    getInitializer(name) {

        return this.initializers.get(
            name
        );
    }


    getNodeAttributes(node) {

        const result = {};

        for (
            const attribute
            of node.attributes
        ) {

            if (
                attribute.type ===
                ONNX_ATTRIBUTE_TYPE.INT
            ) {

                result[
                    attribute.name
                ] =
                    attribute.i;

            } else if (
                attribute.type ===
                ONNX_ATTRIBUTE_TYPE.FLOAT
            ) {

                result[
                    attribute.name
                ] =
                    attribute.f;

            } else if (
                attribute.type ===
                ONNX_ATTRIBUTE_TYPE.STRING
            ) {

                result[
                    attribute.name
                ] =
                    attribute.s;

            } else if (
                attribute.type ===
                ONNX_ATTRIBUTE_TYPE.INTS
            ) {

                result[
                    attribute.name
                ] =
                    attribute.ints;

            } else if (
                attribute.type ===
                ONNX_ATTRIBUTE_TYPE.FLOATS
            ) {

                result[
                    attribute.name
                ] =
                    attribute.floats;

            } else {

                result[
                    attribute.name
                ] =
                    attribute;
            }
        }

        return result;
    }


    findNodesByOp(opType) {

        return this.nodes.filter(
            node =>
                node.opType === opType
        );
    }


    inspectMatMulNBits() {

        const nodes =
            this.nodes.filter(
                node =>
                    node.opType ===
                    "MatMulNBits"
            );


        console.log(
            `[ONNX] MatMulNBits: ${nodes.length}`
        );


        for (
            const node
            of nodes
        ) {

            const attributes =
                this.getNodeAttributes(
                    node
                );


            console.log(
                "[ONNX] MatMulNBits",
                {
                    name: node.name,

                    domain: node.domain,

                    inputs: node.inputs,

                    outputs: node.outputs,

                    attributes
                }
            );


            const weight =
                this.getInitializer(
                    node.inputs[1]
                );

            const scales =
                this.getInitializer(
                    node.inputs[2]
                );

            const zeroPoints =
                node.inputs.length >= 4
                    ? this.getInitializer(
                        node.inputs[3]
                    )
                    : null;


            if (weight) {

                console.log(
                    "[ONNX]   B:",
                    {
                        name: weight.name,
                        dims: weight.dims,
                        type: weight.dataTypeName,
                        bytes:
                            weight.rawData
                                ?.byteLength || 0
                    }
                );
            }


            if (scales) {

                console.log(
                    "[ONNX]   scales:",
                    {
                        name: scales.name,
                        dims: scales.dims,
                        type: scales.dataTypeName,
                        bytes:
                            scales.rawData
                                ?.byteLength || 0
                    }
                );
            }


            if (zeroPoints) {

                console.log(
                    "[ONNX]   zero_points:",
                    {
                        name: zeroPoints.name,
                        dims: zeroPoints.dims,
                        type: zeroPoints.dataTypeName,
                        bytes:
                            zeroPoints.rawData
                                ?.byteLength || 0
                    }
                );
            }
        }


        return nodes;
    }
}


/* =========================================================
   HELPERS
   ========================================================= */

function decodeUTF8(bytes) {

    return new TextDecoder()
        .decode(bytes);
}


function decodeStringField(field) {

    return decodeUTF8(
        field.value
    );
}


function uint32ToFloat(value) {

    const buffer =
        new ArrayBuffer(4);

    const view =
        new DataView(buffer);

    view.setUint32(
        0,
        value >>> 0,
        true
    );

    return view.getFloat32(
        0,
        true
    );
}


function uint64ToDouble(value) {

    const buffer =
        new ArrayBuffer(8);

    const view =
        new DataView(buffer);

    view.setBigUint64(
        0,
        value,
        true
    );

    return view.getFloat64(
        0,
        true
    );
}


/* =========================================================
   EXPORT
   ========================================================= */

window.ProtoReader =
    ProtoReader;

window.ONNXModel =
    ONNXModel;

window.decodeTensorProto =
    decodeTensorProto;

window.getTensorData =
    getTensorData;

window.ONNX_TENSOR_TYPE =
    ONNX_TENSOR_TYPE;

window.ONNX_TENSOR_TYPE_NAME =
    ONNX_TENSOR_TYPE_NAME;