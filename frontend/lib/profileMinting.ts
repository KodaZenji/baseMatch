/**
 * Profile Minting and Update Flow Handler
 * Handles:
 * 1. Image upload (Blockie SVG or user photo) to Supabase
 * 2. tokenURI construction pointing to dynamic metadata API
 * 3. Smart contract transactions (createProfile/registerWithEmail/updateProfile)
 */

import { generateColorAvatar } from './avatarUtils';

/**
 * Generate a Blockie SVG avatar and convert to data URL
 * Used for auto-generated wallet-based avatars
 */
export function generateBlockieDataUrl(address: string): string {
    try {
        // Generate a simple SVG avatar (Blockie-style)
        const svg = generateColorAvatar(address);

        // Convert SVG to data URL
        const base64 = Buffer.from(svg).toString('base64');
        return `data:image/svg+xml;base64,${base64}`;
    } catch (error) {
        console.error('Error generating Blockie avatar:', error);
        // Return a solid color fallback
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%234F46E5' width='200' height='200'/%3E%3C/svg%3E`;
    }
}

/**
 * Upload image to Supabase Storage
 * Handles both user-selected images and generated avatars
 */
export async function uploadImageToSupabase(
    imageData: string | File,
    walletAddress: string
): Promise<string> {
    try {
        const formData = new FormData();

        if (typeof imageData === 'string') {
            // Data URL - convert to File
            const response = await fetch(imageData);
            const blob = await response.blob();
            formData.append('file', blob, `avatar-${walletAddress}.png`);
        } else {
            // File object
            formData.append('file', imageData);
        }

        const uploadResponse = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Image upload failed');
        }

        const data = await uploadResponse.json();
        return data.url;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

/**
 * Construct short tokenURI pointing to metadata API endpoint
 * Format: /api/metadata/{tokenId}
 * This will be queried by wallets and marketplaces to fetch metadata
 */
export function constructTokenURI(tokenId?: string): string {
    // The actual tokenId is assigned on-chain, so we use a placeholder
    // The metadata API will fetch based on the actual tokenId passed to it
    return '/api/metadata/[tokenId]';
}

/**
 * Handle initial profile minting (wallet users - first time)
 * 
 * Flow:
 * 1. Generate Blockie avatar (auto-generated from wallet address)
 * 2. Upload avatar to Supabase Storage
 * 3. Prepare profile data
 * 4. Return prepared data for contract transaction
 */
export async function handleProfileMint(
    walletAddress: string,
    profileData: {
        name: string;
        birthYear: number;
        gender: string;
        interests: string;
    }
): Promise<{
    photoUrl: string;
    contractArgs: [string, number, string, string, string];
    transactionType: 'createProfile';
}> {
    try {
        console.log('Starting profile mint for:', walletAddress);

        // Step 1: Generate Blockie avatar from wallet address
        const blockieDataUrl = generateBlockieDataUrl(walletAddress);
        console.log('Blockie avatar generated');

        // Step 2: Upload avatar to Supabase
        const photoUrl = await uploadImageToSupabase(blockieDataUrl, walletAddress);
        console.log('Avatar uploaded to Supabase:', photoUrl);

        // Step 3: Prepare contract transaction arguments
        // createProfile(name, birthYear, gender, interests, photoUrl)
        const contractArgs: [string, number, string, string, string] = [
            profileData.name,
            profileData.birthYear,
            profileData.gender,
            profileData.interests,
            photoUrl,
        ];

        return {
            photoUrl,
            contractArgs,
            transactionType: 'createProfile',
        };
    } catch (error) {
        console.error('Error in handleProfileMint:', error);
        throw error;
    }
}

/**
 * Handle email registration with profile creation
 * 
 * Flow:
 * 1. Generate Blockie avatar
 * 2. Upload avatar to Supabase (optional, email can skip initial photo)
 * 3. Return data for registerWithEmail transaction
 */
export async function handleEmailRegistration(
    walletAddress: string,
    profileData: {
        name: string;
        birthYear: number;
        gender: string;
        interests: string;
        email: string;
    },
    skipPhotoUpload?: boolean
): Promise<{
    photoUrl: string;
    contractArgs: [string, number, string, string, string];
    transactionType: 'registerWithEmail';
}> {
    try {
        console.log('Starting email registration for:', walletAddress);

        let photoUrl = '';

        // Step 1: Generate and upload avatar unless skipped
        if (!skipPhotoUpload) {
            const blockieDataUrl = generateBlockieDataUrl(walletAddress);
            photoUrl = await uploadImageToSupabase(blockieDataUrl, walletAddress);
            console.log('Avatar uploaded to Supabase:', photoUrl);
        }

        // Step 2: Prepare contract transaction arguments
        // registerWithEmail(name, birthYear, gender, interests, email)
        const contractArgs: [string, number, string, string, string] = [
            profileData.name,
            profileData.birthYear,
            profileData.gender,
            profileData.interests,
            profileData.email,
        ];

        return {
            photoUrl,
            contractArgs,
            transactionType: 'registerWithEmail',
        };
    } catch (error) {
        console.error('Error in handleEmailRegistration:', error);
        throw error;
    }
}

/**
 * Handle profile text update (for existing profiles)
 * 
 * Flow:
 * 1. Upload new image if user changed it
 * 2. Keep existing image URL if not changed
 * 3. Return data for updateProfile transaction
 */
export async function handleProfileTextUpdate(
    tokenId: string,
    newProfileData: {
        name: string;
        birthYear: number;
        gender: string;
        interests: string;
        photoUrl: string;
        email: string;
    },
    newImageFile?: File
): Promise<{
    photoUrl: string;
    contractArgs: [string, number, string, string, string, string];
    transactionType: 'updateProfile';
}> {
    try {
        console.log('Starting profile text update for tokenId:', tokenId);

        let photoUrl = newProfileData.photoUrl;

        // Step 1: Upload new image if provided
        if (newImageFile) {
            photoUrl = await uploadImageToSupabase(newImageFile, tokenId);
            console.log('New profile image uploaded:', photoUrl);
        }

        // Step 2: Prepare contract transaction arguments
        // updateProfile(name, birthYear, gender, interests, photoUrl, email)
        const contractArgs: [string, number, string, string, string, string] = [
            newProfileData.name,
            newProfileData.birthYear,
            newProfileData.gender,
            newProfileData.interests,
            photoUrl,
            newProfileData.email,
        ];

        return {
            photoUrl,
            contractArgs,
            transactionType: 'updateProfile',
        };
    } catch (error) {
        console.error('Error in handleProfileTextUpdate:', error);
        throw error;
    }
}

/**
 * Unified handler for minting and updating logic
 * Determines which flow to use based on conditions
 */
export async function handleProfileOperation(
    operationType: 'create' | 'register' | 'update',
    walletAddress: string,
    profileData: any,
    additionalOptions?: {
        newImageFile?: File;
        skipPhotoUpload?: boolean;
    }
): Promise<{
    photoUrl: string;
    contractArgs: any;
    transactionType: string;
}> {
    switch (operationType) {
        case 'create':
            return handleProfileMint(walletAddress, profileData);

        case 'register':
            return handleEmailRegistration(
                walletAddress,
                profileData,
                additionalOptions?.skipPhotoUpload
            );

        case 'update':
            return handleProfileTextUpdate(
                profileData.tokenId,
                profileData,
                additionalOptions?.newImageFile
            );

        default:
            throw new Error(`Unknown operation type: ${operationType}`);
    }
}
