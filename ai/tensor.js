// ai/tensor.js

class Tensor {

    constructor(data, dims, dtype = "float32") {
        this.data = data;
        this.dims = dims;
        this.dtype = dtype;
    }

    get size() {
        return this.data.length;
    }

    index(...coords) {

        if (coords.length !== this.dims.length) {
            throw new Error(
                `Tensor index: очікувалось ${this.dims.length} координат`
            );
        }

        let index = 0;
        let stride = 1;

        for (let i = this.dims.length - 1; i >= 0; i--) {

            index += coords[i] * stride;
            stride *= this.dims[i];
        }

        return index;
    }

    get(...coords) {
        return this.data[this.index(...coords)];
    }

    set(value, ...coords) {
        this.data[this.index(...coords)] = value;
    }

    static zeros(dims, dtype = "float32") {

        const size =
            dims.reduce((a, b) => a * b, 1);

        const data =
            dtype === "float16"
                ? new Uint16Array(size)
                : new Float32Array(size);

        return new Tensor(data, dims, dtype);
    }

    static fromFloat32(array, dims) {
        return new Tensor(
            new Float32Array(array),
            dims,
            "float32"
        );
    }

    clone() {

        return new Tensor(
            new this.data.constructor(this.data),
            [...this.dims],
            this.dtype
        );
    }
}


// ------------------------------------------------------------
// BASIC OPERATIONS
// ------------------------------------------------------------

function tensorAdd(a, b) {

    if (a.size !== b.size) {
        throw new Error("tensorAdd: різні розміри");
    }

    const out =
        new Float32Array(a.size);

    for (let i = 0; i < out.length; i++) {
        out[i] = a.data[i] + b.data[i];
    }

    return new Tensor(
        out,
        [...a.dims],
        "float32"
    );
}


function tensorMul(a, b) {

    if (a.size !== b.size) {
        throw new Error("tensorMul: різні розміри");
    }

    const out =
        new Float32Array(a.size);

    for (let i = 0; i < out.length; i++) {
        out[i] = a.data[i] * b.data[i];
    }

    return new Tensor(
        out,
        [...a.dims],
        "float32"
    );
}


function tensorScale(a, scalar) {

    const out =
        new Float32Array(a.size);

    for (let i = 0; i < a.size; i++) {
        out[i] = a.data[i] * scalar;
    }

    return new Tensor(
        out,
        [...a.dims],
        "float32"
    );
}


function rmsNorm(x, weight, eps) {

    const hidden = x.dims[x.dims.length - 1];

    const rows = x.size / hidden;

    const out =
        new Float32Array(x.size);

    for (let row = 0; row < rows; row++) {

        let sum = 0;

        const start = row * hidden;

        for (let i = 0; i < hidden; i++) {

            const v = x.data[start + i];

            sum += v * v;
        }

        const mean =
            sum / hidden;

        const inv =
            1 / Math.sqrt(mean + eps);

        for (let i = 0; i < hidden; i++) {

            out[start + i] =
                x.data[start + i] *
                inv *
                weight.data[i];
        }
    }

    return new Tensor(
        out,
        [...x.dims],
        "float32"
    );
}


function silu(x) {

    const out =
        new Float32Array(x.size);

    for (let i = 0; i < x.size; i++) {

        const v = x.data[i];

        out[i] =
            v /
            (1 + Math.exp(-v));
    }

    return new Tensor(
        out,
        [...x.dims],
        "float32"
    );
}


window.Tensor = Tensor;
window.tensorAdd = tensorAdd;
window.tensorMul = tensorMul;
window.tensorScale = tensorScale;
window.rmsNorm = rmsNorm;
window.silu = silu;