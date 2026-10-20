# Kokoaa vertailukuvat rinnakkain: sarakkeet maxzoom 11 / 10 / 8.
import json, os
from PIL import Image, ImageDraw, ImageFont
R = json.load(open('hs/tulokset.json'))
os.makedirs('hsout', exist_ok=True)
font = ImageFont.load_default(size=28)
for place in ['lofootit', 'harstad']:
    for z in [5, 7, 10, 13]:
        ims = [Image.open(f'hs/{place}-z{z}-mz{v}.png') for v in (11, 10, 8)]
        w, h = ims[0].size
        out = Image.new('RGB', (w*3 + 20, h + 50), 'white')
        d = ImageDraw.Draw(out)
        for i, (v, im) in enumerate(zip((11, 10, 8), ims)):
            out.paste(im, (i*(w+10), 50))
            kt = next(r['kt'] for r in R if r['place'] == place and r['z'] == z and r['v'] == v)
            d.text((i*(w+10) + 10, 10), f'{place} z{z} | maxzoom {v}' + (' (nyt)' if v == 11 else '') + f' | {kt} kt', fill='black', font=font)
        out.save(f'hsout/{place}-z{z}.png')
