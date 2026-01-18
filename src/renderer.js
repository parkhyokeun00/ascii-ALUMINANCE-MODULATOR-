import * as THREE from 'three';
import { CharacterAtlas } from './atlas.js';

export class Renderer {
    constructor(container) {
        this.container = container;
        this.atlas = new CharacterAtlas();
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.camera.position.z = 1;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        this.params = {
            gamma: 1.8,
            contrast: 1.2,
            brightness: 0.0,
            alphaMask: 0.1,
            resolution: 150,
            fontScale: 1.0,
            pContrast: 1.0,
            mode: 'splittone',
            charset: 'highfi',
            sentence: 'BINARYTEXT',
            darkMode: false,
            bgColor: '#ffffff',
            charColor: '#000000',
            shadowColor: '#0D1B2A',
            midtoneColor: '#E91E63',
            highlightColor: '#FFD600',
            saturation: 1.0
        };

        this.gridSize = { x: 1, y: 1 };
        this.instancedMesh = null;
        this.sourceTexture = null;
        this.charsetUVs = this.prepareCharsetUVs();
    }

    prepareCharsetUVs() {
        const set = this.atlas.getSet('highfi');
        return set.map(c => {
            const uv = this.atlas.getCharUV(c);
            return new THREE.Vector2(uv.u, uv.v);
        });
    }

    createGrid(width, height) {
        if (this.instancedMesh) {
            this.scene.remove(this.instancedMesh);
            this.instancedMesh.geometry.dispose();
            this.instancedMesh.material.dispose();
        }

        const geometry = new THREE.PlaneGeometry(1, 1);
        const count = width * height;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uAtlas: { value: this.atlas.texture },
                uSource: { value: this.sourceTexture },
                uCharset: { value: this.charsetUVs },
                uAtlasStep: { value: this.atlas.getCharUV(' ').size },
                uGamma: { value: this.params.gamma },
                uContrast: { value: this.params.contrast },
                uBrightness: { value: this.params.brightness },
                uMinAlpha: { value: this.params.alphaMask },
                uPContrast: { value: this.params.pContrast },
                uFontScale: { value: this.params.fontScale },
                uDarkMode: { value: this.params.darkMode ? 1.0 : 0.0 },
                uMode: { value: 0 },
                uSingleColor: { value: new THREE.Color(this.params.charColor) },
                uShadowColor: { value: new THREE.Color(this.params.shadowColor) },
                uMidtoneColor: { value: new THREE.Color(this.params.midtoneColor) },
                uHighlightColor: { value: new THREE.Color(this.params.highlightColor) },
                uSaturation: { value: this.params.saturation },
                uInvert: { value: 0.0 },
                uGridSize: { value: new THREE.Vector2(width, height) }
            },
            vertexShader: `
                attribute vec2 gridUV;
                varying vec2 vGridUV;
                varying vec2 vUv;
                uniform float uFontScale;
                void main() {
                    vGridUV = gridUV;
                    vUv = uv;
                    vec3 pos = position;
                    pos.xy *= uFontScale;
                    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uAtlas;
                uniform sampler2D uSource;
                uniform vec2 uCharset[70];
                uniform float uAtlasStep;
                uniform vec2 uGridSize;
                uniform float uGamma;
                uniform float uContrast;
                uniform float uBrightness;
                uniform float uMinAlpha;
                uniform float uPContrast;
                uniform float uDarkMode;
                uniform int uMode;
                uniform vec3 uSingleColor;
                uniform vec3 uShadowColor;
                uniform vec3 uMidtoneColor;
                uniform vec3 uHighlightColor;
                uniform float uSaturation;
                uniform float uInvert;

                varying vec2 vGridUV;
                varying vec2 vUv;

                vec3 rgb_to_oklab(vec3 c) {
                    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
                    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073970566 * c.b;
                    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787435 * c.b;
                    float l_ = pow(max(0.0, l), 1.0/3.0);
                    float m_ = pow(max(0.0, m), 1.0/3.0);
                    float s_ = pow(max(0.0, s), 1.0/3.0);
                    return vec3(0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
                                1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
                                0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_);
                }

                vec3 oklab_to_rgb(vec3 c) {
                    float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
                    float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
                    float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
                    float l = l_ * l_ * l_;
                    float m = m_ * m_ * m_;
                    float s = s_ * s_ * s_;
                    return vec3(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                                -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                                -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
                }

                void main() {
                    vec4 source = texture2D(uSource, vGridUV);
                    vec3 rgb = clamp(source.rgb, 0.0, 1.0);
                    
                    if (uInvert > 0.5) {
                        rgb = 1.0 - rgb;
                    }

                    vec3 lab = rgb_to_oklab(rgb);
                    float lum = lab.x;
                    if (uPContrast != 1.0) lum = pow(max(0.0, lum), 1.0 / uPContrast);
                    float alphaBase = (uDarkMode > 0.5) ? lum : (1.0 - lum);
                    float alpha = (alphaBase - 0.5) * uContrast + 0.5 + uBrightness;
                    alpha = pow(clamp(alpha, 0.0, 1.0), uGamma);
                    alpha = max(alpha, uMinAlpha);
                    int charIdx = int(clamp(1.0 - lum, 0.0, 1.0) * 69.0);
                    vec2 charUV = uCharset[charIdx];
                    if (uMode == 3) {
                        float checker = mod(floor(vGridUV.x * uGridSize.x) + floor(vGridUV.y * uGridSize.y), 2.0);
                        charUV = (checker > 0.5) ? uCharset[0] : uCharset[1];
                    }
                    vec3 color;
                    if (uMode == 0) color = uSingleColor;
                    else if (uMode == 1) {
                        if (lum < 0.5) color = oklab_to_rgb(mix(rgb_to_oklab(uShadowColor), rgb_to_oklab(uMidtoneColor), lum*2.0));
                        else color = oklab_to_rgb(mix(rgb_to_oklab(uMidtoneColor), rgb_to_oklab(uHighlightColor), (lum-0.5)*2.0));
                    } else color = oklab_to_rgb(vec3(lab.x, lab.yz * uSaturation));
                    vec4 tex = texture2D(uAtlas, vUv * uAtlasStep + charUV);
                    if (tex.a < 0.1 || alpha < 0.01) discard;
                    gl_FragColor = vec4(clamp(color, 0.0, 1.0), tex.a * alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });

        const modeMap = { 'single': 0, 'splittone': 1, 'source': 2, 'binary': 3 };
        material.uniforms.uMode.value = modeMap[this.params.mode] || 0;

        this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);
        const gridUVs = new Float32Array(count * 2);
        const dummy = new THREE.Object3D();
        const aspect = width / height;
        const scaleX = 2 * aspect / width;
        const scaleY = 2 / height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                gridUVs[i * 2] = (x + 0.5) / width;
                gridUVs[i * 2 + 1] = 1.0 - (y + 0.5) / height;
                const posX = (x / width) * 2 * aspect - aspect + (scaleX / 2);
                const posY = -(y / height) * 2 + 1 - (scaleY / 2);
                dummy.position.set(posX, posY, 0);
                dummy.scale.set(scaleX, scaleY * 1.3, 1);
                dummy.updateMatrix();
                this.instancedMesh.setMatrixAt(i, dummy.matrix);
            }
        }

        this.instancedMesh.geometry.setAttribute('gridUV', new THREE.InstancedBufferAttribute(gridUVs, 2));
        this.scene.add(this.instancedMesh);
    }

    setImage(source) {
        if (this.sourceTexture) {
            this.sourceTexture.dispose();
            this.sourceTexture = null;
        }

        if (source instanceof HTMLVideoElement) {
            this.sourceTexture = new THREE.VideoTexture(source);
        } else {
            this.sourceTexture = new THREE.Texture(source);
        }
        this.sourceTexture.minFilter = THREE.LinearFilter;
        this.sourceTexture.magFilter = THREE.LinearFilter;
        this.sourceTexture.needsUpdate = true;

        this.currentSource = source;
        this.updateResolution();
    }

    updateResolution() {
        if (!this.currentSource) return;
        let w = (this.currentSource.videoWidth || this.currentSource.width);
        let h = (this.currentSource.videoHeight || this.currentSource.height);

        // If metadata not yet available for video, try a few more times or wait
        if (w === 0 || h === 0) {
            setTimeout(() => this.updateResolution(), 50);
            return;
        }

        const aspect = w / h;
        this.gridSize.x = this.params.resolution;
        this.gridSize.y = Math.round(this.params.resolution / aspect);
        this.createGrid(this.gridSize.x, this.gridSize.y);
    }

    updateParams(params) {
        const oldRes = this.params.resolution;
        const oldBg = this.params.bgColor;
        const oldCharset = this.params.charset;
        this.params = { ...params };

        if (this.instancedMesh) {
            const u = this.instancedMesh.material.uniforms;
            u.uGamma.value = this.params.gamma;
            u.uContrast.value = this.params.contrast;
            u.uBrightness.value = this.params.brightness;
            u.uMinAlpha.value = this.params.alphaMask;
            u.uPContrast.value = this.params.pContrast;
            u.uFontScale.value = this.params.fontScale;
            u.uDarkMode.value = this.params.darkMode ? 1.0 : 0.0;
            u.uInvert.value = this.params.invertColor ? 1.0 : 0.0;
            const modeMap = { 'single': 0, 'splittone': 1, 'source': 2, 'binary': 3 };
            u.uMode.value = modeMap[this.params.mode] || 0;
            u.uSingleColor.value.set(this.params.charColor);
            u.uShadowColor.value.set(this.params.shadowColor);
            u.uMidtoneColor.value.set(this.params.midtoneColor);
            u.uHighlightColor.value.set(this.params.highlightColor);
            u.uSaturation.value = this.params.saturation;

            if (this.params.charset !== oldCharset) {
                let set = this.atlas.getSet(this.params.charset);

                // If binary 0,1 set, ensure 0 is dark (dense) and 1 is light (sparse) or vice versa based on preference.
                // In standard mapping: Index 0 is Darkest (High Density), Index 69 is Lightest (Low Density/Empty)
                // "0" is visually denser than "1"?
                // 0 (curved) vs 1 (line). 0 usually denser.
                // let's assume the set order in atlas is 'correct' density order.

                const uvs = [];
                for (let i = 0; i < 70; i++) {
                    // Interpolate index
                    const charIndex = Math.floor((i / 70.0) * set.length);
                    const char = set[charIndex];
                    const uv = this.atlas.getCharUV(char);
                    uvs.push(new THREE.Vector2(uv.u, uv.v));
                }
                u.uCharset.value = uvs;
            }
        }

        if (this.params.bgColor !== oldBg) this.renderer.setClearColor(this.params.bgColor);
        if (this.params.resolution !== oldRes) this.updateResolution();
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.renderer.setSize(width, height);
        const aspect = width / height;
        this.camera.left = -aspect; this.camera.right = aspect;
        this.camera.top = 1; this.camera.bottom = -1;
        this.camera.updateProjectionMatrix();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
