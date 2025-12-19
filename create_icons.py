#!/usr/bin/env python3
"""
Create minimal valid PNG icons without external dependencies
Creates simple colored square placeholders
"""

import struct
import zlib
import os

def create_simple_png(width, height, color_rgb, output_path):
    """
    Create a simple solid color PNG file
    color_rgb: tuple of (r, g, b)
    """
    def png_chunk(chunk_type, data):
        """Create a PNG chunk"""
        chunk_data = chunk_type + data
        crc = zlib.crc32(chunk_data) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk_data + struct.pack('>I', crc)

    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk (image header)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)

    # IDAT chunk (image data)
    r, g, b = color_rgb
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # Filter type for scanline
        for x in range(width):
            raw_data += bytes([r, g, b])

    compressed_data = zlib.compress(raw_data, 9)
    idat = png_chunk(b'IDAT', compressed_data)

    # IEND chunk (image end)
    iend = png_chunk(b'IEND', b'')

    # Write PNG file
    with open(output_path, 'wb') as f:
        f.write(signature + ihdr + idat + iend)

    print(f'Created {output_path}')

def main():
    """Generate placeholder icons"""
    icons_dir = 'icons'
    os.makedirs(icons_dir, exist_ok=True)

    # Purple color matching extension theme (#667eea)
    purple = (102, 126, 234)

    sizes = [16, 32, 48, 128]

    for size in sizes:
        output_path = os.path.join(icons_dir, f'icon{size}.png')
        create_simple_png(size, size, purple, output_path)

    print('\n✓ All placeholder icons created!')
    print('Note: These are simple colored squares.')
    print('For better icons, see icons/README.md for instructions.')

if __name__ == '__main__':
    main()
