/**
 * Utility functions for optimizing NFT metadata to be lightweight
 */

// Function to generate a compact avatar representation
export function generateCompactAvatar(seed: string): string {
    // Generate a simple hash-based color scheme
    const hash = simpleHash(seed);
    const hue = hash % 360;
    const saturation = 70 + (hash % 30);
    const lightness = 40 + (hash % 20);

    // Return a compact SVG string
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="45" fill="hsl(${hue}, ${saturation}%, ${lightness}%)"/>
    <circle cx="${30 + (hash % 40)}" cy="${30 + (hash % 40)}" r="${5 + (hash % 10)}" fill="white"/>
    <circle cx="${30 + ((hash * 2) % 40)}" cy="${30 + ((hash * 3) % 40)}" r="${3 + (hash % 7)}" fill="white"/>
  </svg>`;
}

// Simple hash function for deterministic generation
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

// Function to compress profile data into minimal JSON
export function compressProfileData(profile: any): string {
    // Only include essential fields
    const minimalProfile = {
        id: profile.tokenId.toString(),
        n: profile.name.substring(0, 20), // Limit name length
        a: profile.age,
        i: profile.interests.substring(0, 100), // Limit interests length
        // Photo/avatar is stored separately as URI
    };

    return JSON.stringify(minimalProfile);
}

// Function to estimate metadata size in bytes
export function estimateMetadataSize(metadata: string): number {
    return new Blob([metadata]).size;
}