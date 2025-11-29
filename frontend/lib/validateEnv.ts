/**
 * Environment variable validation
 * Checks that all required environment variables are set at startup
 */

export interface EnvValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check WalletConnect Project ID
    if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
        errors.push('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Wallet connection will not work.');
    }

    // Check contract addresses
    const contractAddresses = {
        PROFILE_NFT: process.env.NEXT_PUBLIC_PROFILE_NFT_ADDRESS,
        MATCHING: process.env.NEXT_PUBLIC_MATCHING_ADDRESS,
        STAKING: process.env.NEXT_PUBLIC_STAKING_ADDRESS,
        REPUTATION: process.env.NEXT_PUBLIC_REPUTATION_ADDRESS,
        ACHIEVEMENT: process.env.NEXT_PUBLIC_ACHIEVEMENT_ADDRESS,
    };

    for (const [name, address] of Object.entries(contractAddresses)) {
        if (!address) {
            warnings.push(`${name} contract address not configured. Some features may not work.`);
        } else if (!address.startsWith('0x') || address.length !== 42) {
            errors.push(`${name} contract address is invalid: ${address}`);
        }
    }

    // Check Supabase config if using email features
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        warnings.push('Supabase is not configured. Email features may not work.');
    }

    // Log validation results
    if (errors.length > 0) {
        console.error('❌ Environment Validation Errors:');
        errors.forEach(err => console.error(`  - ${err}`));
    }

    if (warnings.length > 0) {
        console.warn('⚠️  Environment Validation Warnings:');
        warnings.forEach(warn => console.warn(`  - ${warn}`));
    }

    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ Environment validation passed');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}
