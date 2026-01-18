#include <emscripten/emscripten.h>
#include <vector>
#include <cmath>

extern "C" {

EMSCRIPTEN_KEEPALIVE
void process_image(uint8_t* rgba, int width, int height, float gamma, float contrast, float brightness, float alpha_mask, uint8_t* output_alpha) {
    // Basic luminance processing example
    for (int i = 0; i < width * height; ++i) {
        float r = rgba[i * 4] / 255.0f;
        float g = rgba[i * 4 + 1] / 255.0f;
        float b = rgba[i * 4 + 2] / 255.0f;

        // Luminance
        float lum = 0.2126f * r + 0.7152f * g + 0.0722f * b;

        // Gamma & Contrast
        lum = std::pow(lum, 1.0f / gamma);
        lum = (lum - 0.5f) * contrast + 0.5f + (brightness - 1.0f);
        
        if (lum < 0) lum = 0;
        if (lum > 1) lum = 1;

        // Alpha Mask logic
        output_alpha[i] = (lum > alpha_mask) ? 255 : 0;
    }
}

}
