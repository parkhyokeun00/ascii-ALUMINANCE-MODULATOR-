import * as THREE from 'three';

export class CharacterAtlas {
    constructor() {
        this.fontSize = 64;
        // Initialize with raw sets
        const rawSets = {
            'highfi': "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
            'classic': " .:-=+*#%@ ",
            'blocks': " ░▒▓█",
            'binary': "01"
        };

        // Create temporary canvas for density calculation
        const canvas = document.createElement('canvas');
        canvas.width = this.fontSize;
        canvas.height = this.fontSize;
        const ctx = canvas.getContext('2d');
        ctx.font = `bold ${this.fontSize * 0.85}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        this.sets = {};
        this.setDetails = {};
        const cache = new Map();

        // Calculate density and sort each set
        Object.keys(rawSets).forEach(key => {
            const chars = rawSets[key].split('');
            const densityMap = chars.map(char => {
                if (cache.has(char)) return { char, d: cache.get(char) };

                ctx.clearRect(0, 0, this.fontSize, this.fontSize);
                ctx.fillStyle = 'white';
                ctx.fillText(char, this.fontSize / 2, this.fontSize / 2);

                const data = ctx.getImageData(0, 0, this.fontSize, this.fontSize).data;
                let pixels = 0;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 0) pixels += data[i + 3]; // Sum alpha
                }
                const density = pixels / (this.fontSize * this.fontSize * 255);
                cache.set(char, density);
                return { char, d: density };
            });

            // Sort: Darkest (lowest intrinsic brightness) -> Lightest
            // Wait.. usually mapping is Luminance 0 (Black) -> Luminance 1 (White)
            // If we draw white text on black bg:
            // " " (space) has 0 density (Black). "@" has high density (White).
            // So logic should be: Density 0 -> Density 1
            // 0 (Space) -> ... -> 1 (Block)

            densityMap.sort((a, b) => a.d - b.d);
            this.sets[key] = densityMap.map(o => o.char).join('');
            this.setDetails[key] = densityMap;
        });

        // Merge all unique characters
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
        // Use uniform font settings for rendering to texture as well
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

    getSetDetails(id) {
        return this.setDetails[id] || this.setDetails['highfi'];
    }
}
