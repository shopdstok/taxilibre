import re

with open('Ride.js', 'r') as f:
    content = f.read()

# Pattern for the first index: fields: ['pickup_latitude', 'pickup_longitude']
# We want to add a name property after the fields line.
# We'll look for the line containing "fields: ['pickup_latitude', 'pickup_longitude']"
# and then insert a line after it with the name, but we need to be inside the object.

# Instead, we can replace the whole object for each index.

# We'll do two replacements.

# First index
pattern1 = r"(\s+)\{[\s\n]*fields:\s*\[\s*'pickup_latitude'\s*,\s*'pickup_longitude'\s*\][\s\n]*\}"
replacement1 = r"\1{\n      fields: ['pickup_latitude', 'pickup_longitude'],\n      name: 'idx_rides_pickup_location'\n    }"

# Second index
pattern2 = r"(\s+)\{[\s\n]*fields:\s*\[\s*'dropoff_latitude'\s*,\s*'dropoff_longitude'\s*\][\s\n]*\}"
replacement2 = r"\1{\n      fields: ['dropoff_latitude', 'dropoff_longitude'],\n      name: 'idx_rides_dropoff_location'\n    }"

# Apply replacements
new_content = re.sub(pattern1, replacement1, content, flags=re.MULTILINE)
new_content = re.sub(pattern2, replacement2, new_content, flags=re.MULTILINE)

with open('Ride.js', 'w') as f:
    f.write(new_content)
