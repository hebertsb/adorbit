"""Construye los originales vectoriales de la propuesta de identidad AdOrbit.

Usa fontTools instalado en el entorno de diseño; no es dependencia del producto.
Los textos se trazan para conservar el aspecto al importar en Affinity o en la web.
"""

import json
from html import escape
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

BASE = Path(__file__).resolve().parent
MARCA = '#4f46e5'
NOCHE = '#0f1220'
TINTA = '#1f2937'
SUAVE = '#5b6472'
LILA = '#8b92ff'
FUENTES = {
    'normal': TTFont('C:/Windows/Fonts/segoeui.ttf'),
    'medio': TTFont('C:/Windows/Fonts/segoeuisl.ttf'),
    'fuerte': TTFont('C:/Windows/Fonts/segoeuib.ttf'),
}


def texto(contenido, x, y, tam=16, color=TINTA, peso='normal', espacio=0):
    """Devuelve texto trazado en SVG con la línea base indicada."""
    fuente = FUENTES[peso]
    glifos = fuente.getGlyphSet()
    mapa = fuente.getBestCmap()
    escala = tam / fuente['head'].unitsPerEm
    cursor = 0
    partes = []
    for caracter in contenido:
        nombre = mapa.get(ord(caracter), '.notdef')
        pluma = SVGPathPen(glifos)
        glifos[nombre].draw(pluma)
        partes.append(f'<path transform="translate({cursor:.3f} 0)" d="{pluma.getCommands()}"/>')
        cursor += glifos[nombre].width + espacio / escala
    return f'<g aria-label="{escape(contenido)}" fill="{color}" transform="translate({x} {y}) scale({escala} {-escala})">'+''.join(partes)+'</g>'


def rect(x, y, w, h, color, r=0, borde=None):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{color}"'+(f' stroke="{borde}"' if borde else '')+'/>'


def linea(x1, y1, x2, y2, color='#e3e6ee', ancho=1):
    return f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{color}" stroke-width="{ancho}"/>'


def simbolo(x=0, y=0, tam=128, color=MARCA):
    # La trayectoria orbital hace de travesaño de la A. Una sola tinta, sin degradados.
    return f'''<g id="simbolo-orbital" transform="translate({x} {y}) scale({tam / 128})" fill="{color}">
    <path d="M25 104 L57 25 Q59 20 65 20 L69 20 Q74 20 76 25 L108 104 L86 104 L65 48 L45 104 Z"/>
    <path d="M103 37 C80 31 38 48 19 69 C-2 92 21 102 58 91 C80 85 100 74 111 62 L105 57 C91 70 72 79 54 84 C26 92 16 87 28 75 C44 58 80 43 100 44 Z"/>
    <circle cx="110" cy="39" r="8"/>
    </g>'''


def logo(x, y, hauteur=80, oscuro=False, mono=False):
    color = '#ffffff' if mono else (LILA if oscuro else MARCA)
    tinta = '#e8eaf3' if oscuro or mono else TINTA
    return simbolo(x, y, hauteur, color)+texto('AdOrbit', x+hauteur*1.1, y+hauteur*.745, hauteur*.66, tinta, 'fuerte', -hauteur*.018)


def svg(w, h, contenido, titulo):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{escape(titulo)}</title>{contenido}</svg>'


def guardar(nombre, w, h, contenido, titulo):
    archivo = BASE / (nombre+'.svg')
    archivo.write_text(svg(w,h,contenido,titulo), encoding='utf-8')
    return archivo


archivos = []
archivos.append(guardar('adorbit-logo-web',640,160,logo(16,16,128),'AdOrbit — logotipo principal para fondos claros'))
archivos.append(guardar('adorbit-logo-oscuro',640,160,logo(16,16,128,True),'AdOrbit — logotipo para fondos oscuros'))
archivos.append(guardar('adorbit-logo-blanco',640,160,logo(16,16,128,True,True),'AdOrbit — logotipo blanco'))
archivos.append(guardar('adorbit-simbolo',128,128,simbolo(),'AdOrbit — símbolo'))
archivos.append(guardar('adorbit-simbolo-blanco',128,128,simbolo(color='#ffffff'),'AdOrbit — símbolo blanco'))
archivos.append(guardar('adorbit-icono-app',1024,1024,rect(0,0,1024,1024,MARCA)+simbolo(172,172,680,'#ffffff'),'AdOrbit — ícono de aplicación, fondo opaco y zona segura'))
archivos.append(guardar('adorbit-icono-adaptable-frente',432,432,simbolo(104,104,224,'#ffffff'),'AdOrbit — primer plano de ícono adaptable Android'))
archivos.append(guardar('adorbit-icono-adaptable-fondo',432,432,rect(0,0,432,432,MARCA),'AdOrbit — fondo de ícono adaptable Android'))
archivos.append(guardar('adorbit-favicon',32,32,rect(0,0,32,32,MARCA,7)+simbolo(2,2,28,'#ffffff'),'AdOrbit — favicon'))

# Lámina editorial: identidad arriba, uso en producto abajo.
p = [rect(0,0,1800,1460,'#f6f7fb')]
p += [texto('ADORBIT / IDENTIDAD DIGITAL',64,55,15,SUAVE,'fuerte',2.2), texto('01  /  PROPUESTA DE MARCA',1438,55,12,SUAVE,'normal',1.1)]
p += [texto('Todo gira alrededor de una buena idea.',64,124,42,TINTA,'fuerte',-.8),texto('Una identidad para conectar campañas, personas y resultados.',65,160,20,SUAVE)]
# Hero claro
p += [rect(64,202,1038,366,'#ffffff',22),texto('01 / LOGOTIPO PRINCIPAL',98,241,12,SUAVE,'fuerte',1.4),logo(177,278,200),texto('Tu agencia, en una misma órbita.',399,466,21,SUAVE),texto('A geométrica + trayectoria orbital + punto de conexión',98,535,14,SUAVE)]
# Hero oscuro
p += [rect(1126,202,610,366,NOCHE,22),texto('02 / SOBRE FONDO OSCURO',1160,241,12,'#a3abc0','fuerte',1.4),logo(1180,310,128,True),texto('Mismo símbolo. Una marca consistente.',1160,529,15,'#a3abc0')]
# Paleta
p += [texto('LA PALETA YA DEFINIDA EN EL SISTEMA',64,618,12,SUAVE,'fuerte',1.5)]
paleta=[('Índigo / Marca',MARCA),('Índigo / Oscuro',LILA),('Azul noche',NOCHE),('Fondo claro','#f6f7fb'),('Superficie','#ffffff')]
for i,(nombre,color) in enumerate(paleta):
    x=64+i*340
    p += [rect(x,640,312,54,color,10,'#e3e6ee' if i>2 else None),texto(nombre,x,721,15,TINTA,'fuerte'),texto(color.upper(),x+218,721,12,SUAVE)]
p += [linea(64,753,1736,753),texto('03 / ASÍ SE VERÍA EN LA PLATAFORMA',64,800,12,SUAVE,'fuerte',1.4),texto('Vista de marca · datos de ejemplo',1456,800,13,SUAVE)]
# Ventana web
p += [rect(64,831,1148,525,'#ffffff',16,'#e3e6ee'),rect(65,832,1146,34,'#eef0f5',15),rect(65,850,1146,16,'#eef0f5')]
for i,c in enumerate(['#c3c8d6','#c3c8d6','#c3c8d6']):
    p.append(f'<circle cx="{85+i*15}" cy="849" r="4" fill="{c}"/>')
p += [texto('AdOrbit / Portal de gestión',530,854,11,SUAVE),linea(273,867,273,1356),logo(83,889,39),texto('ESPACIO DE TRABAJO',86,972,9,SUAVE,'fuerte',1)]
for i,nombre in enumerate(['Resumen','Campañas','Clientes','Creatividades','Facturación','Inteligencia']):
    y=994+i*40
    if i==0:p.append(rect(78,y,182,32,'#eef0ff',7))
    p.append(rect(91,y+10,11,11,MARCA if i==0 else '#a3abc0',3))
    p.append(texto(nombre,114,y+21,12,MARCA if i==0 else SUAVE,'fuerte' if i==0 else 'normal'))
p += [texto('Tu agencia, de un vistazo.',307,922,27,TINTA,'fuerte',-.4),texto('Toda la actividad de tu equipo en un solo lugar.',307,949,13,SUAVE),rect(1049,895,128,38,MARCA,10),texto('+ Nueva campaña',1062,919,11,'#ffffff','fuerte')]
for i,(nombre,valor,nota) in enumerate([('Campañas activas','24','6 listas para revisión'),('Piezas por aprobar','08','Creatividad en movimiento'),('Inversión del mes','Bs 48.500','Resumen de campañas')]):
    x=307+i*298
    p += [rect(x,981,278,114,'#ffffff',14,'#e3e6ee'),texto(nombre,x+18,1008,12,SUAVE),texto(valor,x+18,1046,29,TINTA,'fuerte'),texto(nota,x+18,1075,11,SUAVE)]
p += [rect(307,1115,574,211,'#ffffff',14,'#e3e6ee'),texto('Campañas en movimiento',326,1146,16,TINTA,'fuerte'),texto('CAMPAÑA',326,1176,9,SUAVE,'fuerte',.8),texto('ESTADO',690,1176,9,SUAVE,'fuerte',.8),linea(326,1188,859,1188)]
for i,(nombre,sub,estado) in enumerate([('Lanzamiento de marca','Estrategia · Diseño · Medios','Activa'),('Campaña de temporada','Contenido · Redes sociales','En revisión'),('Presencia en vía pública','Producción · Trabajo de campo','Activa')]):
    y=1212+i*43
    p += [texto(nombre,326,y,12,TINTA,'fuerte'),texto(sub,326,y+15,10,SUAVE),rect(690,y-13,109,22,'#eef0ff' if i==1 else '#d9f5e9',11),texto(estado,702,y+2,10,MARCA if i==1 else '#047857')]
p += [rect(901,1115,278,211,NOCHE,14),simbolo(1098,1131,52,LILA),texto('Inteligencia',922,1152,16,'#e8eaf3','fuerte'),texto('Una nueva perspectiva',922,1203,19,'#e8eaf3','fuerte'),texto('para tus resultados.',922,1230,19,'#e8eaf3','fuerte'),texto('Explora el rendimiento de tus',922,1261,12,'#a3abc0'),texto('campañas desde un solo panel.',922,1280,12,'#a3abc0')]
# Móvil: pantalla de 360 escalada a lámina, sin prometer funcionalidad.
p += [rect(1248,831,269,525,NOCHE,35),rect(1256,839,253,509,'#f6f7fb',28),rect(1330,845,102,17,NOCHE,9),texto('9:41',1275,861,10,TINTA,'fuerte'),logo(1273,885,37),texto('Hola, equipo.',1275,966,24,TINTA,'fuerte'),texto('La creatividad sigue contigo.',1275,989,12,SUAVE),rect(1273,1011,219,112,MARCA,14),texto('CAMPAÑAS ACTIVAS',1288,1038,10,'#ffffff','fuerte',.5),texto('24',1288,1081,36,'#ffffff','fuerte'),simbolo(1413,1034,66,'#ffffff'),texto('Tu próxima actividad',1275,1158,15,TINTA,'fuerte'),rect(1273,1175,219,89,'#ffffff',14,'#e3e6ee'),texto('Revisión de piezas',1287,1201,13,TINTA,'fuerte'),texto('Campaña de temporada',1287,1222,11,SUAVE),texto('Hoy · 14:30',1287,1244,11,MARCA),rect(1268,1288,229,44,'#ffffff',12),texto('Inicio',1291,1316,11,MARCA,'fuerte'),texto('Campañas',1351,1316,11,SUAVE),texto('Perfil',1442,1316,11,SUAVE)]
# Icono y tamaños
p += [texto('04 / ÍCONO APP',1551,860,11,SUAVE,'fuerte',.6),rect(1552,890,184,184,MARCA,40),simbolo(1576,914,136,'#ffffff'),texto('AdOrbit',1611,1106,17,TINTA,'fuerte'),texto('Simple. Visible.',1552,1161,14,TINTA,'fuerte'),texto('También en pequeño.',1552,1184,14,SUAVE)]
for x,tam in [(1552,48),(1620,32),(1672,24)]:
    p += [rect(x,1210,tam,tam,MARCA,tam*.22),simbolo(x+tam*.06,1210+tam*.06,tam*.88,'#ffffff')]
p += [texto('48 px',1552,1285,10,SUAVE),texto('32 px',1620,1285,10,SUAVE),texto('24 px',1672,1285,10,SUAVE),linea(64,1392,1736,1392),texto('ADORBIT',64,1426,12,TINTA,'fuerte',2),texto('Campañas · Clientes · Creatividades · Facturación · Inteligencia',225,1426,13,SUAVE),texto('VECTORIAL / WEB + APP',1504,1426,11,SUAVE,'fuerte',.8)]
archivos.append(guardar('adorbit-presentacion-identidad',1800,1460,''.join(p),'AdOrbit — identidad visual y aplicaciones de marca'))

print(json.dumps({'originales':len(archivos),'carpeta':str(BASE)},ensure_ascii=False))
