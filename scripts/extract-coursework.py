from pathlib import Path
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
review=root/'review-coursework';review.mkdir(exist_ok=True)
for key,file in [('sde',r'C:/Users/lenovo/Downloads/SDE_S2_Siyi_Yu (1).pdf'),('fea',r'C:/Users/lenovo/Downloads/FEA_CW_Siyi_Yu (1).pdf')]:
    folder=root/'assets/projects'/('soft-signals' if key=='sde' else 'common-ground')/'study';folder.mkdir(parents=True,exist_ok=True)
    doc=pdfium.PdfDocument(file);thumbs=[]
    for i in range(len(doc)):
        page=doc[i];im=page.render(scale=1.5).to_pil().convert('RGB')
        thumb=ImageOps.contain(im,(310,225));tile=Image.new('RGB',(330,255),'#ddd');tile.paste(thumb,((330-thumb.width)//2,0));ImageDraw.Draw(tile).text((10,235),f'{key} page {i+1}',fill='black');thumbs.append(tile)
        if i>0:im.save(folder/f'page-{i+1:02}.webp',quality=90)
    sheet=Image.new('RGB',(330*4,255*((len(thumbs)+3)//4)),'#ddd')
    for i,t in enumerate(thumbs):sheet.paste(t,((i%4)*330,(i//4)*255))
    sheet.save(review/f'{key}-contact.jpg')
    if key=='fea':
        for p in [3,7,10,11]:
            for j,img in enumerate(PdfReader(file).pages[p].images):
                im=img.image.convert('RGB')
                if im.width>90 and im.height>90:im.save(folder/f'figure-p{p+1}-{j}.webp',quality=94)
