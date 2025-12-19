#!/usr/bin/env python3
"""
Simple icon generator for FocusGuard extension
Creates placeholder icons with shield emoji
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """Create a simple shield icon"""
    # Create image with gradient background
    img = Image.new('RGB', (size, size), color='#667eea')
    draw = ImageDraw.Draw(img)

    # Draw shield shape (simplified)
    shield_color = '#ffffff'
    margin = size // 6

    # Shield outline (simplified rectangle with rounded bottom)
    points = [
        (margin, margin),
        (size - margin, margin),
        (size - margin, size - margin * 2),
        (size // 2, size - margin),
        (margin, size - margin * 2)
    ]
    draw.polygon(points, fill=shield_color)

    # Try to add emoji text if font is available
    try:
        font_size = size // 2
        # Try to load a font that supports emoji, fallback to default
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
        except:
            font = ImageFont.load_default()

        # Draw shield emoji or checkmark
        text = "✓"
        # Get text bounding box
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Center the text
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - size // 10

        draw.text((x, y), text, fill='#667eea', font=font)
    except Exception as e:
        print(f"Note: Could not add text to icon: {e}")

    # Save the icon
    img.save(output_path, 'PNG')
    print(f"Created icon: {output_path}")

def main():
    """Generate all required icon sizes"""
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    sizes = [16, 32, 48, 128]

    for size in sizes:
        output_path = os.path.join(icons_dir, f'icon{size}.png')
        create_icon(size, output_path)

    print("\nAll icons generated successfully!")
    print("Icons are located in the 'icons' directory.")

if __name__ == '__main__':
    main()
