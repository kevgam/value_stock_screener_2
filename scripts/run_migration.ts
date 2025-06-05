import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    // Read the migration SQL
    console.log('Running migration...')
    const migrationPath = path.join(process.cwd(), 'sql/migrations/add_original_market_cap.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    // First check if we can connect to the database
    const { error: connectionError } = await supabase.from('stocks').select('*').limit(0)
    if (connectionError) {
      throw new Error(`Failed to connect to database: ${connectionError.message}`)
    }

    // Execute the migration using the Management API
    const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Migration failed: ${JSON.stringify(error)}`)
    }

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration() 