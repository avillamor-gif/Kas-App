#!/bin/bash

# Generate Android launcher icons from icon-512.png
# Requires ImageMagick: brew install imagemagick

set -e

SOURCE_ICON="public/icon-512.png"
ANDROID_RES="android/app/src/main/res"

if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Error: $SOURCE_ICON not found"
    exit 1
fi

if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Install with: brew install imagemagick"
    exit 1
fi

echo "📱 Generating Android launcher icons from $SOURCE_ICON..."

# Icon sizes for each density
mdpi_size="48"
hdpi_size="72"
xhdpi_size="96"
xxhdpi_size="144"
xxxhdpi_size="192"

for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    # Get the size for this density
    case $density in
        mdpi) size=$mdpi_size ;;
        hdpi) size=$hdpi_size ;;
        xhdpi) size=$xhdpi_size ;;
        xxhdpi) size=$xxhdpi_size ;;
        xxxhdpi) size=$xxxhdpi_size ;;
    esac
    
    output_dir="$ANDROID_RES/mipmap-$density"
    
    mkdir -p "$output_dir"
    
    # Generate ic_launcher.png
    convert "$SOURCE_ICON" -resize "${size}x${size}" \
        -gravity center -extent "${size}x${size}" \
        -background transparent \
        "$output_dir/ic_launcher.png"
    
    echo "✅ Generated $output_dir/ic_launcher.png (${size}x${size})"
    
    # Generate ic_launcher_round.png (same size, Android handles rounding)
    cp "$output_dir/ic_launcher.png" "$output_dir/ic_launcher_round.png"
    
    # Generate ic_launcher_foreground.png (for adaptive icons)
    convert "$SOURCE_ICON" -resize "${size}x${size}" \
        -gravity center -extent "${size}x${size}" \
        -background transparent \
        "$output_dir/ic_launcher_foreground.png"
    
    echo "✅ Generated $output_dir/ic_launcher_foreground.png (${size}x${size})"
done

echo ""
echo "🎉 All Android icons generated successfully!"
echo "Run: npx cap build android"
