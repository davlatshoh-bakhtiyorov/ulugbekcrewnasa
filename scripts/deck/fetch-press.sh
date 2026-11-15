#!/bin/sh
# Cover images for slide 2 (public thumbnails of the linked news videos/articles; shown with attribution).
mkdir -p press && cd press
for id in 5SPo9AEus2w 3uI8M5Ex4dA 81iwFlLzzH4 GlbDsv0luWM; do
  curl -sf -o "yt-$id.jpg" "https://img.youtube.com/vi/$id/maxresdefault.jpg" || curl -sf -o "yt-$id.jpg" "https://img.youtube.com/vi/$id/sddefault.jpg"
done
curl -sf -o ef.jpg "https://east-fruit.com/wp-content/uploads/2021/04/onion.jpg"
ls -la
