import * as THREE from 'three';
import { Renderer } from './renderer.js';

class App {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.fileInput = document.getElementById('file-input');
        this.themeToggle = document.getElementById('theme-toggle');
        this.renderMode = document.getElementById('render-mode');
        this.charsetSelect = document.getElementById('charset');
        this.sentenceInput = document.getElementById('sentence-input');
        this.sentenceGroup = document.getElementById('sentence-group');
        this.resDisplay = document.getElementById('res-display');
        this.modeDisplay = document.getElementById('mode-display');
        this.videoRef = null;
        this.uploadCounter = 0;

        this.params = {
            gamma: 1.8,
            contrast: 1.2,
            brightness: 0.0,
            alphaMask: 0.1,
            mode: 'splittone',
            charset: 'highfi',
            sentence: 'BINARYTEXT',
            resolution: 150,
            fontScale: 1.0,
            pContrast: 1.0,
            darkMode: false,
            bgColor: '#ffffff',
            charColor: '#000000',
            shadowColor: '#0D1B2A',
            midtoneColor: '#E91E63',
            highlightColor: '#FFD600',
            saturation: 1.0,
            invertColor: false
        };

        this.debounceTimer = null;
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.renderer = new Renderer(this.container);
        this.updateUIGroups();
        this.updateParameters();
        this.animate();
    }

    setupEventListeners() {
        this.themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            this.params.darkMode = document.body.classList.contains('dark-mode');
            this.updateParameters();
        });

        // Invert Color Checkbox
        const invertParams = document.getElementById('invert-color');
        if (invertParams) {
            invertParams.addEventListener('change', (e) => {
                this.params.invertColor = e.target.checked;
                this.updateParameters();
            });
        }

        ['gamma', 'contrast', 'brightness', 'alpha-mask', 'resolution', 'saturation',
            'char-color', 'shadow-color', 'midtone-color', 'highlight-color', 'bg-color', 'charset',
            'font-scale', 'p-contrast'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const camelId = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

                el.addEventListener('input', (e) => {
                    const val = e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
                    this.params[camelId] = val;

                    if (camelId === 'resolution') {
                        clearTimeout(this.debounceTimer);
                        this.debounceTimer = setTimeout(() => {
                            this.updateParameters();
                        }, 200);
                    } else {
                        this.updateParameters();
                    }
                });
            });

        this.renderMode.addEventListener('change', (e) => {
            this.params.mode = e.target.value;
            this.updateUIGroups();
            this.updateParameters();
        });

        this.sentenceInput.addEventListener('input', (e) => {
            this.params.sentence = e.target.value || ' ';
            this.updateParameters();
        });

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const uploadId = ++this.uploadCounter;
            const url = URL.createObjectURL(file);

            if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = url;
                video.muted = true;
                video.loop = true;
                video.setAttribute('playsinline', ''); // For better mobile compatibility

                // Set resolution ONCE when metadata is known
                video.onloadedmetadata = () => {
                    if (uploadId !== this.uploadCounter) {
                        URL.revokeObjectURL(url);
                        return;
                    }
                    this.params.resolution = Math.min(video.videoWidth, 1024);
                    const resSlider = document.getElementById('resolution');
                    if (resSlider) resSlider.value = this.params.resolution;
                    this.renderer.updateParams(this.params);
                };

                // Start playback when ready
                video.oncanplay = () => {
                    if (uploadId !== this.uploadCounter) return;

                    if (this.videoRef !== video) {
                        if (this.videoRef) {
                            this.videoRef.pause();
                            this.videoRef.src = "";
                            this.videoRef.load();
                        }
                        this.videoRef = video;
                        this.renderer.setImage(video);
                        video.play().catch(e => console.error("Play failed:", e));
                    }
                };
            } else {
                const img = new Image();
                img.onload = () => {
                    if (uploadId !== this.uploadCounter) {
                        URL.revokeObjectURL(url);
                        return;
                    }

                    this.params.resolution = Math.min(img.width, 1024);
                    const resSlider = document.getElementById('resolution');
                    if (resSlider) resSlider.value = this.params.resolution;

                    if (this.videoRef) {
                        this.videoRef.pause();
                        this.videoRef.src = "";
                        this.videoRef.load();
                        this.videoRef = null;
                    }
                    this.renderer.updateParams(this.params);
                    this.renderer.setImage(img);
                };
                img.src = url;
            }
        });

        window.addEventListener('resize', () => {
            this.renderer.onResize();
        });
    }

    updateUIGroups() {
        document.getElementById('sentence-group').style.display = (this.params.mode === 'sentence') ? 'flex' : 'none';
        document.getElementById('single-color-group').style.display = (this.params.mode === 'single') ? 'flex' : 'none';
        document.getElementById('split-tone-group').style.display = (this.params.mode === 'splittone') ? 'flex' : 'none';
        document.getElementById('oklch-group').style.display = (this.params.mode === 'source') ? 'flex' : 'none';
        this.modeDisplay.textContent = this.params.mode.toUpperCase();
    }

    updateParameters() {
        this.renderer.updateParams(this.params);
        if (this.renderer.gridSize) {
            this.resDisplay.textContent = `${this.renderer.gridSize.x}x${this.renderer.gridSize.y}`;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render();
    }
}

new App();
