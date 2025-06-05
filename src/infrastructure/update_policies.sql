-- Drop existing policies
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON stocks;
DROP POLICY IF EXISTS "Allow anonymous read access" ON stocks;
DROP POLICY IF EXISTS "Allow service role full access" ON stocks;

-- Disable RLS temporarily
ALTER TABLE stocks DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Enable insert for all users" ON stocks
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON stocks
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable update for all users" ON stocks
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON stocks
  FOR DELETE
  TO public
  USING (true); 