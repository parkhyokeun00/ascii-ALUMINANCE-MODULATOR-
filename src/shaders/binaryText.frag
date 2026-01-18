precision highp float;

uniform sampler2D uTexture;
uniform float uAlphaThreshold;

varying vec2 vUv;
varying float vInstanceAlpha;

void main() {
    // If instance alpha is below threshold, discard or make transparent
    if (vInstanceAlpha < 0.1) {
        discard;
    }

    vec4 color = texture2D(uTexture, vUv);
    gl_FragColor = color;
}
