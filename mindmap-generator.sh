#!/bin/bash

for file in mind-maps/*.md; do
  npx markmap-cli --no-open --output docs/$(basename $file ".md").html mind-maps/$(basename "$file")
done