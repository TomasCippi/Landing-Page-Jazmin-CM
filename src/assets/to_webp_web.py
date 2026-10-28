#!/usr/bin/env python3
"""
Convierte imágenes a .webp OPTIMIZADO PARA WEB (livianas, buena calidad).

Por defecto: calidad 82, ancho máximo 1920px, método 6 (mejor compresión).
También procesa .webp existentes (por si querés achicar los que ya hiciste).

Uso:
    python to_webp_web.py /ruta/carpeta
    python to_webp_web.py /ruta/carpeta -q 75            # más liviano
    python to_webp_web.py /ruta/carpeta --ancho 1200     # ancho máximo
    python to_webp_web.py /ruta/carpeta --ancho 0        # no redimensionar
    python to_webp_web.py /ruta/carpeta -r               # incluir subcarpetas
    python to_webp_web.py /ruta/carpeta -o /ruta/salida  # carpeta de salida

Requiere: pip install Pillow
"""

import argparse
import os
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

EXTENSIONES = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".gif", ".jfif", ".webp"}


def convertir(origen: Path, destino: Path, calidad: int, ancho_max: int) -> None:
    with Image.open(origen) as img:
        icc = img.info.get("icc_profile")
        opciones = {"quality": calidad, "method": 6}
        if icc:
            opciones["icc_profile"] = icc

        if getattr(img, "is_animated", False):
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".webp", dir=destino.parent)
            tmp.close()
            img.save(tmp.name, "WEBP", save_all=True, **opciones)
            os.replace(tmp.name, destino)
            return

        img = ImageOps.exif_transpose(img)

        if img.mode == "P":
            img = img.convert("RGBA" if "transparency" in img.info else "RGB")
        elif img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "A" in img.mode else "RGB")

        if ancho_max and img.width > ancho_max:
            alto = round(img.height * ancho_max / img.width)
            img = img.resize((ancho_max, alto), Image.LANCZOS)

        # Guardo a un temporal y reemplazo, así no se rompe si origen == destino
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".webp", dir=destino.parent)
        tmp.close()
        img.save(tmp.name, "WEBP", **opciones)
        os.replace(tmp.name, destino)


def main() -> int:
    p = argparse.ArgumentParser(description="Convierte imágenes a WebP optimizado para web.")
    p.add_argument("carpeta", type=Path, help="Carpeta con las imágenes")
    p.add_argument("-o", "--salida", type=Path, help="Carpeta de salida (default: misma carpeta)")
    p.add_argument("-r", "--recursivo", action="store_true", help="Incluir subcarpetas")
    p.add_argument("-q", "--calidad", type=int, default=82, help="Calidad 1-100 (default 82)")
    p.add_argument("--ancho", type=int, default=1920, help="Ancho máximo en px, 0 = no redimensionar (default 1920)")
    args = p.parse_args()

    if not args.carpeta.is_dir():
        print(f"Error: '{args.carpeta}' no es una carpeta válida.")
        return 1

    patron = "**/*" if args.recursivo else "*"
    archivos = [f for f in args.carpeta.glob(patron) if f.is_file() and f.suffix.lower() in EXTENSIONES]

    if not archivos:
        print("No encontré imágenes para convertir.")
        return 0

    ok = errores = 0
    antes = despues = 0

    for origen in sorted(archivos):
        if args.salida:
            destino = args.salida / origen.relative_to(args.carpeta).with_suffix(".webp")
            destino.parent.mkdir(parents=True, exist_ok=True)
        else:
            destino = origen.with_suffix(".webp")

        try:
            tam_origen = origen.stat().st_size
            convertir(origen, destino, args.calidad, args.ancho)
            antes += tam_origen
            despues += destino.stat().st_size
            ok += 1
            print(f"✔ {origen.name} -> {destino.name}")
        except Exception as e:
            errores += 1
            print(f"✘ {origen.name}: {e}")

    print(f"\nListo: {ok} convertidas, {errores} con error.")
    if antes:
        print(f"Tamaño: {antes / 1e6:.2f} MB -> {despues / 1e6:.2f} MB")
    return 0 if errores == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
