-- Database Migration for Unified Registration Flow
-- Execute this SQL in your Supabase SQL Editor

-- ============================================================================
-- TABLE 1: users (Central Source of Truth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    wallet_address TEXT UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    wallet_verified BOOLEAN DEFAULT FALSE,
    name TEXT,
    age INTEGER,
    gender TEXT,
    interests TEXT,
    photo_url TEXT,
    photo_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(email_verified, wallet_verified);

-- Add comments for documentation
COMMENT ON TABLE users IS 'Central source of truth for all user profile data and verification status';
COMMENT ON COLUMN users.email IS 'User email address (normalized to lowercase)';
COMMENT ON COLUMN users.wallet_address IS 'User wallet address (normalized to lowercase)';
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email';
COMMENT ON COLUMN users.wallet_verified IS 'Whether the user has verified their wallet signature';
COMMENT ON COLUMN users.photo_hash IS 'Keccak256 hash of photo URL for on-chain storage';

-- ============================================================================
-- TABLE 2: profiles (On-Chain Minting Audit Log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    address TEXT UNIQUE NOT NULL,
    on_chain BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_address ON profiles(address);
CREATE INDEX IF NOT EXISTS idx_profiles_on_chain ON profiles(on_chain);

-- Add comments
COMMENT ON TABLE profiles IS 'Tracks on-chain minting status for user profiles';
COMMENT ON COLUMN profiles.on_chain IS 'Whether the profile has been minted on-chain';
COMMENT ON COLUMN profiles.address IS 'Wallet address associated with this profile';

-- ============================================================================
-- TABLE 3: email_verifications (Temporary Email Token Storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);

-- Add comments
COMMENT ON TABLE email_verifications IS 'Temporary storage for email verification tokens';
COMMENT ON COLUMN email_verifications.token IS 'Unique verification token sent to user email';
COMMENT ON COLUMN email_verifications.expires_at IS 'Token expiration timestamp (24 hours from creation)';

-- ============================================================================
-- OPTIONAL: wallet_verifications (if not already exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallet_verifications_token ON wallet_verifications(token);
CREATE INDEX IF NOT EXISTS idx_wallet_verifications_wallet ON wallet_verifications(wallet_address);

-- Add comments
COMMENT ON TABLE wallet_verifications IS 'Temporary storage for wallet verification tokens';

-- ============================================================================
-- FUNCTIONS: Auto-update timestamps
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CLEANUP FUNCTION: Remove expired tokens
-- ============================================================================

-- Function to clean up expired email verification tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM email_verifications WHERE expires_at < NOW();
    DELETE FROM wallet_verifications WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup daily
-- (This requires pg_cron extension - install if needed)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 0 * * *', 'SELECT cleanup_expired_tokens();');

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Optional but recommended
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (auth.uid() = id OR auth.role() = 'service_role');

-- Policy: Service role can do everything
CREATE POLICY users_service_role_policy ON users
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY profiles_service_role_policy ON profiles
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY email_verifications_service_role_policy ON email_verifications
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY wallet_verifications_service_role_policy ON wallet_verifications
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- SAMPLE QUERIES FOR VERIFICATION
-- ============================================================================

-- Check if tables were created successfully
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'profiles', 'email_verifications', 'wallet_verifications');

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'profiles', 'email_verifications', 'wallet_verifications');

-- Test user verification status query
-- SELECT 
--     email,
--     wallet_address,
--     email_verified,
--     wallet_verified,
--     CASE 
--         WHEN email_verified AND wallet_verified THEN 'Fully Verified'
--         WHEN email_verified THEN 'Email Only'
--         WHEN wallet_verified THEN 'Wallet Only'
--         ELSE 'Unverified'
--     END as verification_status
-- FROM users
-- LIMIT 10;

-- ============================================================================
-- TABLE 4: chat_messages (End-to-End Encrypted Messaging for Matched Users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_address TEXT NOT NULL,
    user2_address TEXT NOT NULL,
    sender_address TEXT NOT NULL,
    encrypted_message TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_status BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_users ON chat_messages(user1_address, user2_address);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_address);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_status ON chat_messages(read_status);

-- Add comments
COMMENT ON TABLE chat_messages IS 'Stores chat messages between matched users';
COMMENT ON COLUMN chat_messages.user1_address IS 'First user in the match (wallet address)';
COMMENT ON COLUMN chat_messages.user2_address IS 'Second user in the match (wallet address)';
COMMENT ON COLUMN chat_messages.sender_address IS 'Address of the user who sent the message';
COMMENT ON COLUMN chat_messages.encrypted_message IS 'Base64-encoded encrypted message content';
COMMENT ON COLUMN chat_messages.nonce IS 'Base64-encoded nonce/IV for AES-GCM decryption';
COMMENT ON COLUMN chat_messages.read_status IS 'Whether the message has been read by recipient';

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages they are part of
CREATE POLICY chat_messages_select_policy ON chat_messages
    FOR SELECT
    USING (auth.role() = 'service_role');

-- Policy: Service role can do everything
CREATE POLICY chat_messages_service_role_policy ON chat_messages
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Run this to verify migration success:
SELECT 
    'Migration completed successfully!' as status,
    NOW() as completed_at;
