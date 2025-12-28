const fs = require('fs');
const path = require('path');

// Ensure the directory exists
const targetDir = path.join(__dirname, '..', 'public', 'assets');

if (!fs.existsSync(targetDir)) {
    console.log(`Creating directory: ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
}

// Define simple SVG templates for each entity
const assets = [
    { name: 'player', color: '#171717', stroke: '#ffffff', shape: 'rect', label: 'P' },
    { name: 'lust', color: '#ec4899', stroke: '#000000', shape: 'circle', label: 'L' },
    { name: 'gluttony', color: '#22c55e', stroke: '#000000', shape: 'hexagon', label: 'G' },
    { name: 'greed', color: '#eab308', stroke: '#000000', shape: 'diamond', label: 'Gr' },
    { name: 'sloth', color: '#60a5fa', stroke: '#000000', shape: 'square', label: 'S' },
    { name: 'wrath', color: '#ef4444', stroke: '#000000', shape: 'triangle', label: 'W' },
    { name: 'envy', color: '#a855f7', stroke: '#000000', shape: 'circle', label: 'E' },
    { name: 'pride', color: '#f97316', stroke: '#000000', shape: 'octagon', label: 'Pr' },
];

function generateSVG(item) {
    const size = 64;
    const center = size / 2;
    const r = 28;
    let shapeTag = '';

    if (item.shape === 'circle') {
        shapeTag = `<circle cx="${center}" cy="${center}" r="${r}" fill="${item.color}" stroke="${item.stroke}" stroke-width="4" />`;
    } else if (item.shape === 'rect' || item.shape === 'square') {
        shapeTag = `<rect x="${center - r}" y="${center - r}" width="${r * 2}" height="${r * 2}" fill="${item.color}" stroke="${item.stroke}" stroke-width="4" />`;
    } else if (item.shape === 'triangle') {
        const pts = `${center},${center - r} ${center + r},${center + r} ${center - r},${center + r}`;
        shapeTag = `<polygon points="${pts}" fill="${item.color}" stroke="${item.stroke}" stroke-width="4" />`;
    } else if (item.shape === 'diamond') {
        const pts = `${center},${center - r} ${center + r},${center} ${center},${center + r} ${center - r},${center}`;
        shapeTag = `<polygon points="${pts}" fill="${item.color}" stroke="${item.stroke}" stroke-width="4" />`;
    } else {
        // Hexagon/Octagon fallback to circle for simplicity of placeholder
        shapeTag = `<circle cx="${center}" cy="${center}" r="${r}" fill="${item.color}" stroke="${item.stroke}" stroke-width="4" />`;
    }

    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  ${shapeTag}
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="serif" font-weight="bold" font-size="24" fill="white" stroke="black" stroke-width="1">${item.label}</text>
</svg>`;
}

assets.forEach(asset => {
    const filePath = path.join(targetDir, `${asset.name}.svg`);
    const svgContent = generateSVG(asset);
    fs.writeFileSync(filePath, svgContent);
    console.log(`Generated: ${filePath}`);
});

console.log('Assets generation complete. You can now start the game.');