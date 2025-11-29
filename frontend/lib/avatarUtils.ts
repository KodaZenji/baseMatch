/**
 * Avatar generation utilities
 * Provides fallback methods for generating user avatars
 */

/**
 * Generate a simple colored avatar from an address using HSL color
 * This is a lightweight fallback when blockies fails
 */
export function generateColorAvatar(address: string): string {
    // Create a canvas-based SVG avatar as fallback
    const normalizedAddress = address.toLowerCase().replace('0x', '');

    // Generate hue from address
    const hueValue = parseInt(normalizedAddress.substring(0, 6), 16) % 360;
    const saturation = 70;
    const lightness = 50;

    // Generate patterns from address
    const patternValue = parseInt(normalizedAddress.substring(6, 12), 16);

    // Create simple geometric pattern
    const gridSize = 5;
    const grid: boolean[][] = [];

    for (let i = 0; i < gridSize; i++) {
        grid[i] = [];
        for (let j = 0; j < gridSize; j++) {
            const bitIndex = (i * gridSize + j) % 32;
            grid[i][j] = ((patternValue >> bitIndex) & 1) === 1;
        }
    }

    const size = 200;
    const cellSize = size / gridSize;

    let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;

    // Background
    svg += `<rect width="${size}" height="${size}" fill="hsl(${hueValue}, ${saturation}%, ${lightness}%)"/>`;

    // Pattern
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (grid[i][j]) {
                const darkerColor = `hsl(${hueValue}, ${saturation}%, ${lightness - 20}%)`;
                svg += `<rect x="${j * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="${darkerColor}"/>`;
            }
        }
    }

    svg += '</svg>';

    // Convert SVG to data URL
    const encodedSvg = encodeURIComponent(svg);
    return `data:image/svg+xml,${encodedSvg}`;
}

/**
 * Generate avatar from address with blockies fallback
 */
export function generateAvatar(address: string): string {
    if (!address) {
        return generateColorAvatar('0x0000000000000000000000000000000000000000');
    }

    try {
        // Try to use blockies if available
        if (typeof window !== 'undefined') {
            try {
                const blockies = require('blockies-ts');
                if (blockies && blockies.render) {
                    const canvas = blockies.render({
                        seed: address.toLowerCase(),
                        size: 8,
                        scale: 16,
                    });
                    return canvas.toDataURL();
                }
            } catch (e) {
                console.warn('Blockies render failed, using color avatar fallback', e);
            }
        }
    } catch (e) {
        console.warn('Blockies unavailable, using color avatar fallback', e);
    }

    // Fallback to color avatar
    return generateColorAvatar(address);
}
