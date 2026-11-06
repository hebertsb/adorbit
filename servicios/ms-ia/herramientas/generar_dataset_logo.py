"""Genera un dataset sintetico (pero honesto) para afinar YOLO a detectar el logo REAL
de AdOrbit -- ver documentacion/05-decisiones-y-pendientes.md D20/D21.

No hay piezas publicitarias reales subidas todavia para entrenar con fotos de verdad,
asi que se compone el logo real (documentacion/diseno/adorbit-logo-*.png, con alfa)
sobre fondos variados en posicion/escala/rotacion/opacidad aleatorias. Como el script
controla donde puso el logo, la caja delimitadora (bounding box) que escribe es EXACTA,
no estimada -- es un dataset etiquetado real, aunque las imagenes sean compuestas en vez
de fotografiadas. Se agregan ejemplos negativos (sin logo) para que el modelo no
prediga logo en cualquier imagen.

Uso: python herramientas/generar_dataset_logo.py [--n 250]
"""

from __future__ import annotations

import argparse
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
DISENO = RAIZ.parent.parent / "documentacion" / "diseno"
DATASET = RAIZ / "herramientas" / "_dataset_logo"
TAMANO_IMG = 320

LOGO_OSCURO = DISENO / "adorbit-logo-oscuro.png"
LOGO_BLANCO = DISENO / "adorbit-logo-blanco.png"

RNG = random.Random(7)
NP_RNG = np.random.default_rng(7)


def _fondo_aleatorio() -> Image.Image:
    """Fondo procedural variado (gradiente + ruido + a veces formas) -- no se descargan
    fotos externas, pero la variedad de color/textura/iluminacion es real, no un solo
    color plano, para que el modelo no memorice un fondo fijo."""
    estilo = RNG.choice(["gradiente", "ruido", "formas"])
    base = Image.new("RGB", (TAMANO_IMG, TAMANO_IMG))
    px = base.load()

    color_a = tuple(NP_RNG.integers(20, 235, 3).tolist())
    color_b = tuple(NP_RNG.integers(20, 235, 3).tolist())
    vertical = RNG.random() < 0.5

    for y in range(TAMANO_IMG):
        for x in range(TAMANO_IMG):
            t = (y if vertical else x) / TAMANO_IMG
            px[x, y] = tuple(int(color_a[i] * (1 - t) + color_b[i] * t) for i in range(3))

    if estilo == "ruido":
        ruido = (NP_RNG.normal(0, 18, (TAMANO_IMG, TAMANO_IMG, 3))).astype(np.int16)
        arr = np.array(base).astype(np.int16) + ruido
        base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    elif estilo == "formas":
        d = ImageDraw.Draw(base)
        for _ in range(RNG.randint(1, 4)):
            color = tuple(NP_RNG.integers(0, 255, 3).tolist())
            x0, y0 = RNG.randint(0, TAMANO_IMG), RNG.randint(0, TAMANO_IMG)
            x1, y1 = x0 + RNG.randint(20, 120), y0 + RNG.randint(20, 120)
            d.ellipse([x0, y0, x1, y1], fill=color)

    return base.filter(ImageFilter.GaussianBlur(RNG.uniform(0, 1.2)))


def _brillo_promedio(img: Image.Image) -> float:
    return float(np.array(img.convert("L")).mean())


def _componer_logo(fondo: Image.Image) -> tuple[Image.Image, tuple[float, float, float, float] | None]:
    """Devuelve (imagen_final, bbox_yolo_normalizada) -- bbox es None si es un
    ejemplo negativo (sin logo), a proposito en ~25% de los casos."""
    if RNG.random() < 0.25:
        return fondo, None

    ruta_logo = LOGO_OSCURO if _brillo_promedio(fondo) > 128 else LOGO_BLANCO
    logo = Image.open(ruta_logo).convert("RGBA")

    escala = RNG.uniform(0.25, 0.6)
    nuevo_ancho = int(TAMANO_IMG * escala)
    nuevo_alto = int(nuevo_ancho * logo.height / logo.width)
    logo = logo.resize((nuevo_ancho, nuevo_alto), Image.LANCZOS)

    angulo = RNG.uniform(-12, 12)
    logo = logo.rotate(angulo, expand=True, resample=Image.BICUBIC)

    opacidad = RNG.uniform(0.75, 1.0)
    if opacidad < 1.0:
        alfa = logo.split()[3].point(lambda a: int(a * opacidad))
        logo.putalpha(alfa)

    max_x = max(1, TAMANO_IMG - logo.width)
    max_y = max(1, TAMANO_IMG - logo.height)
    x = RNG.randint(0, max_x)
    y = RNG.randint(0, max_y)

    compuesta = fondo.convert("RGBA")
    compuesta.alpha_composite(logo, (x, y))
    compuesta = compuesta.convert("RGB")

    cx = (x + logo.width / 2) / TAMANO_IMG
    cy = (y + logo.height / 2) / TAMANO_IMG
    w = logo.width / TAMANO_IMG
    h = logo.height / TAMANO_IMG
    return compuesta, (cx, cy, w, h)


def generar(n: int) -> None:
    for split, cantidad in [("train", int(n * 0.85)), ("val", n - int(n * 0.85))]:
        (DATASET / "images" / split).mkdir(parents=True, exist_ok=True)
        (DATASET / "labels" / split).mkdir(parents=True, exist_ok=True)
        for i in range(cantidad):
            fondo = _fondo_aleatorio()
            imagen, bbox = _componer_logo(fondo)
            nombre = f"{split}_{i:04d}"
            imagen.save(DATASET / "images" / split / f"{nombre}.jpg", quality=90)
            with open(DATASET / "labels" / split / f"{nombre}.txt", "w") as f:
                if bbox is not None:
                    cx, cy, w, h = bbox
                    f.write(f"0 {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")
        print(f"{split}: {cantidad} imagenes generadas en {DATASET / 'images' / split}")

    yaml_contenido = f"""path: {DATASET.as_posix()}
train: images/train
val: images/val
names:
  0: logo_adorbit
"""
    (DATASET / "dataset.yaml").write_text(yaml_contenido, encoding="utf-8")
    print("dataset.yaml escrito en", DATASET / "dataset.yaml")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=250)
    args = parser.parse_args()
    generar(args.n)
