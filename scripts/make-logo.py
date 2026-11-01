#!/usr/bin/env python3
"""把一张带背景色的鸟巢图处理成小程序头像资产。

做的事：
1. 二值化 —— 琥珀色像素留下，其余（深蓝底、渐变、白色水印）全部压成背景色，
   所以源图里的「AI 生成」水印、渐变底色会被一起抹掉；
2. 轻微高斯模糊得到抗锯齿 alpha，双色重绘成品牌色 #F8B500 / #002FA7；
3. 缩小到指定比例再居中，给微信的圆形裁切留安全边距；
4. 导出 1024 / 512 / 192 / 144 四个尺寸。

依赖：Pillow（pip install Pillow）
用法：
    python scripts/make-logo.py                          # 用默认源图与 0.86 留边
    python scripts/make-logo.py path/to/source.png 0.80   # 指定源图与留边比例
"""
import os
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'assets', 'logo')
DEFAULT_SRC = os.path.join(OUT_DIR, 'raw', 'nest-source.png')

AMBER = (248, 181, 0)   # #F8B500
BLUE = (0, 47, 167)     # #002FA7


def is_amber(r, g, b):
    """琥珀判定：偏暖、足够亮、蓝通道低。深蓝底、白色水印都不满足。"""
    return r > 170 and g > 110 and b < 150 and r - b > 60


def flatten(src):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    px = im.load()

    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            if is_amber(*px[x, y]):
                mp[x, y] = 255

    alpha = mask.filter(ImageFilter.GaussianBlur(1.1))
    flat = Image.new('RGB', (w, h), BLUE)
    return Image.composite(Image.new('RGB', (w, h), AMBER), flat, alpha)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    scale = float(sys.argv[2]) if len(sys.argv) > 2 else 0.86
    if not os.path.exists(src):
        sys.exit(f'源图不存在: {src}')

    flat = flatten(src)
    w, h = flat.size
    inner = flat.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    canvas = Image.new('RGB', (w, h), BLUE)
    canvas.paste(inner, ((w - inner.width) // 2, (h - inner.height) // 2))

    canvas.save(os.path.join(OUT_DIR, 'nest-1024.png'), optimize=True)
    for size in (512, 192, 144):
        canvas.resize((size, size), Image.LANCZOS).save(
            os.path.join(OUT_DIR, f'nest-{size}.png'), optimize=True
        )
    print(f'已导出 nest-1024/512/192/144.png 到 {OUT_DIR}（图形占画布 {scale:.0%}）')


if __name__ == '__main__':
    main()
