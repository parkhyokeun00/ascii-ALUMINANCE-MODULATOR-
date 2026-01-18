import * as THREE from 'three';

export class CharacterAtlas {
    constructor() {
        this.fontSize = 64;
        this.sets = {
            'highfi': "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
            'classic': " .:-=+*#%@ ", // Standard density
            'blocks': " ░▒▓█", // Unicode blocks
            'binary': "01"
        };

        // Merge all unique characters from all sets into one large atlas
        const allChars = Object.values(this.sets).join('');
        this.uniqueChars = [...new Set(allChars.split(''))];
        this.charMap = new Map();
        this.texture = this.createAtlas();
    }

    createAtlas() {
        const count = this.uniqueChars.length;
        const size = Math.ceil(Math.sqrt(count));
        const canvas = document.createElement('canvas');
        canvas.width = size * this.fontSize;
        canvas.height = size * this.fontSize;
        const ctx = canvas.getContext('2d');

        // Background should be transparent for character masking
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = `bold ${this.fontSize * 0.85}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        this.uniqueChars.forEach((char, i) => {
            const x = (i % size) * this.fontSize;
            const y = Math.floor(i / size) * this.fontSize;
            ctx.fillText(char, x + this.fontSize / 2, y + this.fontSize / 2);

            this.charMap.set(char, {
                u: (i % size) / size,
                v: 1.0 - (Math.floor(i / size) / size) - (1 / size),
                size: 1 / size
            });
        });

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        return tex;
    }

    getCharUV(char) {
        return this.charMap.get(char) || this.charMap.get(' ');
    }

    getSet(id) {
        return (this.sets[id] || this.sets['highfi']).split('');
    }
}
