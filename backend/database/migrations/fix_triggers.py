import os, re, sys

def update_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    # Find the table name from the CREATE TABLE line (simplistic)
    # We'll assume the trigger name is update_<table>_updated_at
    # Extract table name from line like: CREATE TABLE IF NOT EXISTS users (
    match = re.search(r'CREATE TABLE IF NOT EXISTS\s+(\w+)', content, re.IGNORECASE)
    if not match:
        print(f"No table found in {filename}")
        return
    table = match.group(1)
    trigger_name = f'update_{table}_updated_at'
    function_name = 'update_updated_at_column'
    # Build replacement block
    new_block = f'''-- Trigger for updated_at (idempotent)
DROP TRIGGER IF EXISTS {trigger_name} ON {table};
DROP FUNCTION IF EXISTS {function_name};
CREATE OR REPLACE FUNCTION {function_name}()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER {trigger_name}
    BEFORE UPDATE ON {table}
    FOR EACH ROW
    EXECUTE FUNCTION {function_name};
'''
    # Replace from the line '-- Trigger for updated_at' up to the line after the trigger creation (which ends with a semicolon after EXECUTE...)
    # We'll use regex to find the block.
    pattern = r'-- Trigger for updated_at[\s\S]*?EXECUTE FUNCTION update_updated_at_column\(\);'
    # Ensure we replace exactly one occurrence
    new_content = re.sub(pattern, new_block, content, count=1)
    if new_content == content:
        print(f"Pattern not found in {filename}")
        return
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {filename}")

for fname in os.listdir('.'):
    if fname.endswith('.sql') and fname.startswith(('001_','002_','003_','004_','005_','006_')):
        update_file(fname)
