"""
Demo data for screenshots: six CC0 panoramas from Poly Haven (polyhaven.com),
scaled to 6144x3072, with the capture date in EXIF and GPano metadata.

Download the tonemapped JPGs into src/ first, for example
  https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/small_empty_room_1.jpg
The floor plan is drawn by plan.mjs: node plan.mjs "out/Floor plan 2nd floor.pdf"
"""
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
W, H = 6144, 3072
items = [
    ("unfinished_office", "R0010101.jpg", "2022:10:15 15:36:00"),
    ("unfinished_office_night", "R0010148.jpg", "2022:11:04 16:47:00"),
    ("small_empty_room_1", "R0010233.jpg", "2023:07:24 13:17:00"),
    ("small_empty_room_3", "R0010234.jpg", "2023:07:24 13:40:00"),
    ("small_empty_room_4", "R0010235.jpg", "2023:07:24 14:13:00"),
    ("small_empty_room_2", "R0010236.jpg", "2023:07:24 15:00:00"),
]
xmp = ('<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/">'
       '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" '
       'xmlns:GPano="http://ns.google.com/photos/1.0/panorama/" GPano:ProjectionType="equirectangular" '
       f'GPano:UsePanoramaViewer="True" GPano:FullPanoWidthPixels="{W}" GPano:FullPanoHeightPixels="{H}" '
       f'GPano:CroppedAreaImageWidthPixels="{W}" GPano:CroppedAreaImageHeightPixels="{H}" '
       'GPano:CroppedAreaLeftPixels="0" GPano:CroppedAreaTopPixels="0"/></rdf:RDF></x:xmpmeta><?xpacket end="w"?>')
for src, name, date in items:
    im = Image.open(f"src/{src}.jpg").convert("RGB").resize((W, H), Image.LANCZOS)
    exif = Image.Exif()
    exif[0x0132] = date
    exif.get_ifd(0x8769)[0x9003] = date
    im.save(f"out/{name}", quality=86, exif=exif.tobytes(), xmp=xmp.encode())
    print(name, date)
