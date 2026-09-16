// ai/q4.js

function float16ToFloat32(h) {

    const sign =
        (h & 0x8000) ? -1 : 1;

    const exponent =
        (h >> 10) & 0x1f;

    const fraction =
        h & 0x03ff;

    if (exponent === 0) {

        if (fraction === 0) {
            return sign * 0;
        }

        return sign *
            Math.pow(2, -14) *
            (fraction / 1024);
    }

    if (exponent === 31) {

        if (fraction === 0) {
            return sign * Infinity;
        }

        return NaN;
    }

    return sign *
        Math.pow(
            2,
            exponent - 15
        ) *
        (1 + fraction / 1024);
}


function unpackInt4(byte, high) {

    if (!high) {
        return byte & 0x0f;
    }

    return (byte >> 4) & 0x0f;
}


function q4UnsignedToSigned(q) {

    return q - 8;
}


/*
 * MatMulNBits:
 *
 * A: normal floating-point activations
 * B: packed INT4 weights
 * scale: FP16 scale per block
 *
 * Це базова CPU-версія.
 *
 * Пізніше її можна перенести на WebGPU.
 */

function matMulQ4F16(
    input,
    packedWeights,
    scales,
    rows,
    cols,
    blockSize
) {

    const output =
        new Float32Array(rows);

    const blocksPerRow =
        Math.ceil(cols / blockSize);

    for (let row = 0; row < rows; row++) {

        let sum = 0;

        for (
            let block = 0;
            block < blocksPerRow;
            block++
        ) {

            const start =
                block * blockSize;

            const end =
                Math.min(
                    start + blockSize,
                    cols
                );

            const scaleIndex =
                row * blocksPerRow + block;

            const scale =
                float16ToFloat32(
                    scales[scaleIndex]
                );

            for (
                let col = start;
                col < end;
                col++
            ) {

                const weightIndex =
                    row * cols + col;

                const byteIndex =
                    weightIndex >> 1;

                const high =
                    (weightIndex & 1) !== 0;

                const packed =
                    packedWeights[byteIndex];

                const q =
                    unpackInt4(
                        packed,
                        high
                    );

                const weight =
                    q4UnsignedToSigned(q) *
                    scale;

                sum +=
                    input[col] *
                    weight;
            }
        }

        output[row] = sum;
    }

    return output;
}


window.float16ToFloat32 =
    float16ToFloat32;

window.matMulQ4F16 =
    matMulQ4F16;