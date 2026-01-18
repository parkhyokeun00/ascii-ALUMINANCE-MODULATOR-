export class ImageProcessor {
    constructor() { }

    /**
     * Replaces the planned WASM functionality with a JavaScript implementation.
     * Processes image data to calculate luminance and alpha mask.
     */
    process(imageData) {
        const { width, height, data } = imageData;
        const out = {
            colors: new Float32Array(width * height * 3),
            luminance: new Float32Array(width * height)
        };

        for (let i = 0; i < width * height; i++) {
            const r = data[i * 4] / 255;
            const g = data[i * 4 + 1] / 255;
            const b = data[i * 4 + 2] / 255;

            out.colors[i * 3] = r;
            out.colors[i * 3 + 1] = g;
            out.colors[i * 3 + 2] = b;

            // Rec. 709 Luminance
            out.luminance[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        return out;
    }
}
