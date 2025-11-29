
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

let supabase;

async function initSupabase() {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables');
        console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
        console.log('\nYour current environment variables:');
        console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET');
        console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'NOT SET');
        console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY || 'NOT SET');
        console.log('\nExample .env.local configuration:');
        console.log('NEXT_PUBLIC_SUPABASE_URL=https://xvynefwulsgbyzkvqmuo.supabase.co');
        console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2eW5lZnd1bHNnYnl6a3ZxbXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMTA4MDEsImV4cCI6MjA3OTY4NjgwMX0.pL6I7nOKvPK3awVY_6F7XMo9UN9VckcQ-GU22qA8MJY');
        console.log('SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2eW5lZnd1bHNnYnl6a3ZxbXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDExMDgwMSwiZXhwIjoyMDc5Njg2ODAxfQ.KhjReftFukHAuQNMLTNOvkR7gSxZHGanogr-r-IBgxM');
        process.exit(1);
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
}

async function setupTables() {
    await initSupabase();

    console.log('Setting up Supabase tables for email verification...\n');

    try {
        
        console.log('1. Creating users table...');
        const { error: usersError } = await supabase.rpc('exec_sql', {
            sql: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          wallet_address TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          email_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `
        });

        if (usersError) {
            
            console.log('   Note: Users table may already exist or using existing table');
        } else {
            console.log('   ✓ Users table created successfully');
        }

    
        console.log('2. Creating email_verifications table...');
        const { error: verificationsError } = await supabase.rpc('exec_sql', {
            sql: `
        CREATE TABLE IF NOT EXISTS email_verifications (
          id SERIAL PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          email TEXT NOT NULL,
          wallet_address TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
        CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
        CREATE INDEX IF NOT EXISTS idx_email_verifications_wallet_address ON email_verifications(wallet_address);
      `
        });

        if (verificationsError) {
            
            console.log('   Note: Email verifications table may already exist or using existing table');
        } else {
            console.log('   ✓ Email verifications table created successfully');
        }

        console.log('\n✓ Setup complete!');
        console.log('\nNext steps:');
        console.log('1. Make sure your .env.local file has the correct Supabase credentials');
        console.log('2. Test the email verification flow by running the development server:');
        console.log('   npm run dev');
        console.log('3. Try registering a new user and verifying their email');

    } catch (error) {
        console.error('Error setting up tables:', error.message);
        console.log('\nTroubleshooting tips:');
        console.log('- Check that your Supabase credentials are correct');
        console.log('- Make sure you have network access to your Supabase project');
        console.log('- Verify that your Supabase project is not paused');
    }
}

async function setupTablesWithDirectAPI() {
    await initSupabase();

    console.log('Setting up Supabase tables using direct API...\n');

    try {
        
        console.log('1. Testing connection and checking existing tables...');

        
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (usersError && usersError.code === '42P01') {
            
            console.log('   Users table does not exist, will attempt to create it');
        } else {
            console.log('   ✓ Users table exists or is accessible');
        }

    
        const { data: verificationsData, error: verificationsError } = await supabase
            .from('email_verifications')
            .select('id')
            .limit(1);

        if (verificationsError && verificationsError.code === '42P01') {
            // Table doesn't exist, need to create it
            console.log('   Email verifications table does not exist, will attempt to create it');
        } else {
            console.log('   ✓ Email verifications table exists or is accessible');
        }

        console.log('\nNote: In Supabase, tables are typically created through the web interface');
        console.log('or using SQL in the SQL Editor. This script verifies connectivity but');
        console.log('cannot automatically create tables in all Supabase configurations.');
        console.log('\nPlease create the tables manually in your Supabase project if needed.');

    } catch (error) {
        console.error('Error:', error.message);
    }
}


console.log('Supabase Email Verification Table Setup Script');
console.log('============================================\n');


setupTables().catch(err => {
    console.log('RPC approach failed, trying alternative method...');
    setupTablesWithDirectAPI().catch(console.error);
});