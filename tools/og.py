# Gera a imagem de compartilhamento (1200x630) a partir do poster do vídeo.
from PIL import Image, ImageDraw, ImageFont
P='public/img/'
bg=Image.open(P+'hero-poster.webp').convert('RGB')
W,H=1200,630
r=max(W/bg.width,H/bg.height); bg=bg.resize((int(bg.width*r)+1,int(bg.height*r)+1))
x=bg.width-W; y=int((bg.height-H)*0.25); bg=bg.crop((x,y,x+W,y+H))
ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
for i in range(W):
    a=int(245*max(0,1-i/820)); d.line([(i,0),(i,H)],fill=(13,59,36,a))
img=Image.alpha_composite(bg.convert('RGBA'),ov)
z=Image.new('RGBA',(W,16),(20,32,26,255)); zd=ImageDraw.Draw(z)
for k in range(-20,W+40,36): zd.polygon([(k,16),(k+18,16),(k+34,0),(k+16,0)],fill=(242,194,0,255))
img.alpha_composite(z,(0,H-16))
logo=Image.open(P+'logo-dark.png').convert('RGBA'); logo.thumbnail((330,200)); img.alpha_composite(logo,(60,56))
d=ImageDraw.Draw(img)
f1=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',54); f2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',28)
d.text((60,300),'Segurança do trabalho',font=f1,fill=(255,255,255)); d.text((60,365),'e treinamentos de NR',font=f1,fill=(255,255,255))
d.text((60,450),'Goiânia e todo Goiás · Orçamento pelo WhatsApp',font=f2,fill=(242,194,0))
img.convert('RGB').save(P+'og.jpg','JPEG',quality=84,optimize=True)
