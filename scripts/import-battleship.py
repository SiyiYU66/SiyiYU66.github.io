from pathlib import Path
from PIL import Image
import shutil,re
root=Path(__file__).resolve().parents[1]
source=root/'game-source/computing-2-submission-SiyiYU66-main'
out=root/'assets/games/battleship';out.mkdir(parents=True,exist_ok=True)
for f in (source/'web-app').iterdir():
    if f.is_file() and f.suffix in ['.html','.css','.js']:shutil.copy2(f,out/f.name)
shutil.copytree(source/'web-app/assets',out/'assets',dirs_exist_ok=True)
shutil.copytree(root/'node_modules/ramda/es',out/'vendor/ramda',dirs_exist_ok=True)
(out/'ramda.js').write_text('import * as R from "./vendor/ramda/index.js";\nexport default R;\n',encoding='utf8')
replacements={}
for name in ['background pic.png','brief-icon.png','Single Player mode selection pic.png','2 Player mode selection pic.png']:
    f=out/'assets'/name;im=Image.open(f)
    needs_alpha=('A' in im.getbands() and im.getchannel('A').getextrema()[0]<255) or 'transparency' in im.info
    # Retain transparent cut-outs: flattening RGBA to RGB paints them black.
    im=im.convert('RGBA' if 'A' in im.getbands() or 'transparency' in im.info else 'RGB')
    im.thumbnail((1600,1600) if name!='brief-icon.png' else (256,256));dest=f.with_suffix('.webp');im.save(dest,quality=90);replacements[name]=dest.name;f.unlink()
    if needs_alpha:
        with Image.open(dest) as encoded:
            if encoded.mode!='RGBA' or encoded.getchannel('A').getextrema()[0]==255:
                raise ValueError(f'Transparency lost while exporting {name}')
for f in list(out.glob('*.html'))+list(out.glob('*.css'))+list(out.glob('*.js')):
    s=f.read_text(encoding='utf8')
    for old,new in replacements.items():s=s.replace(old,new)
    if f.suffix=='.html' and 'name="viewport"' not in s:s=s.replace('<meta charset="utf-8">','<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">')
    # Root ornament missing from the upload: reuse the supplied ship sprite.
    s=s.replace('./assets/battleship.png','./assets/player1/battleship.png').replace('./assets/favicon.png','./assets/player1/battleship.png')
    if re.search('[\u4e00-\u9fff]',s):print('Review CJK:',f.name)
    f.write_text(s,encoding='utf8')
s=(source/'server/server.js').read_text(encoding='utf8')
body=s[s.index('// ── Room state'):s.index('// ── Start')]
server='import {Server} from "socket.io";\nimport Battleship from "../assets/games/battleship/BattleShip.js";\nexport function attachBattleship(server){\nconst io=new Server(server,{maxHttpBufferSize:100000});\n'+body+'\nreturn io;\n}\n'
(root/'scripts/battleship-server.mjs').write_text(server,encoding='utf8')
print('Imported game:',out)
