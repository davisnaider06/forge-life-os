import numpy as np
from PIL import Image, ImageFilter
import sys

W, H = 1080, 2340
rng = np.random.default_rng(int(sys.argv[1]) if len(sys.argv) > 1 else 7)


def value_noise(w, h, cell, seed_rng):
    gw, gh = w // cell + 3, h // cell + 3
    grid = seed_rng.random((gh, gw)) * 2 - 1
    ys = np.arange(h) / cell
    xs = np.arange(w) / cell
    y0 = ys.astype(int)
    x0 = xs.astype(int)
    ty = ys - y0
    tx = xs - x0
    ty = ty * ty * (3 - 2 * ty)
    tx = tx * tx * (3 - 2 * tx)
    a = grid[y0][:, x0]
    b = grid[y0][:, x0 + 1]
    c = grid[y0 + 1][:, x0]
    d = grid[y0 + 1][:, x0 + 1]
    top = a + (b - a) * tx[None, :]
    bot = c + (d - c) * tx[None, :]
    return top + (bot - top) * ty[:, None]


def rotated(w, h, cell, seed_rng, angle):
    size = int(np.hypot(w, h)) + 4
    n = value_noise(size, size, cell, seed_rng).astype(np.float32)
    im = Image.fromarray(n, 'F').rotate(angle, resample=Image.BICUBIC)
    a = np.asarray(im)
    oy, ox = (size - h) // 2, (size - w) // 2
    return a[oy:oy + h, ox:ox + w]


def fbm(w, h, base, octaves, ridged=False):
    total = np.zeros((h, w))
    amp, norm = 1.0, 0.0
    cell = base
    for _ in range(octaves):
        n = rotated(w, h, max(2, int(cell)), rng, 17 + 41 * _) if h > 1 else value_noise(w, h, max(2, int(cell)), rng)
        if ridged:
            n = 1 - np.abs(n)
            n = n * n
        total += n * amp
        norm += amp
        amp *= 0.52
        cell /= 2.05
    return total / norm


def blur(a, r):
    for _ in range(3):
        for ax in (0, 1):
            c = np.cumsum(np.pad(a, [(r + 1, r) if i == ax else (0, 0) for i in range(2)], mode='edge'), axis=ax)
            a = (np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return a


Y, X = np.mgrid[0:H, 0:W].astype(float)

# Silhouette: main peak slightly left of centre, a shoulder on the right.
px, py = W * 0.46, H * 0.515
ridge_noise = fbm(W, 1, 90, 6)[0] * H * 0.035
shoulder = np.exp(-((np.arange(W) - W * 0.83) / (W * 0.09)) ** 2) * H * 0.045
top = py + np.abs(np.arange(W) - px) * 0.62 + ridge_noise - shoulder
top = np.minimum(top, H * 0.66 + ridge_noise * 0.6)
mountain = Y > top[None, :]

# Relief used only for lighting: a pyramid plus ridged noise (aretes and gullies).
depth = (Y - top[None, :]) / H
wander = (W * 0.07 * np.sin(Y / H * 9) + W * 0.03 * np.sin(Y / H * 23 + 1)) * np.clip((Y - py) / (H * 0.2), 0, 1)
shape = -np.sqrt((X - px - wander) ** 2 + (W * 0.02) ** 2) / W * 1.6 - depth * 0.9
radial = fbm(W, H, 300, 6, ridged=True)
ai = np.clip(((X - px) / (np.maximum(Y - py, 0) + 90)) * 260 + W / 2, 0, W - 1).astype(int)
di = np.clip((Y - py) * 0.35 + H * 0.3, 0, H - 1).astype(int)
couloirs = radial[di, ai]
relief = shape + 0.26 * couloirs + 0.14 * fbm(W, H, 380, 5, ridged=True) + 0.01 * fbm(W, H, 30, 3)
relief = blur(relief * H, 2)
gy, gx = np.gradient(relief)
nz = np.full_like(gx, 2.2)
norm = np.sqrt(gx * gx + gy * gy + nz * nz)
nx, ny, nz = -gx / norm, -gy / norm, nz / norm
L = np.array([0.82, -0.25, 0.52])
L = L / np.linalg.norm(L)
lit = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
slope = np.sqrt(gx * gx + gy * gy)

# Sun only grazes the upper part of the massif; lower slopes fall into shadow.
sun_line = np.clip(1.25 - depth * 2.6, 0, 1)
lit = np.clip((lit - 0.35) * 1.9, 0, 1) ** 1.1 * sun_line
rock = np.clip((slope - 3.4) / 1.4 + fbm(W, H, 14, 3) * 0.9 - 0.2, 0, 1)
speck = fbm(W, H, 6, 2)

snow_shadow = np.array([44, 60, 74])
rock_shadow = np.array([13, 18, 22])
snow_lit = np.array([236, 138, 78])
rock_lit = np.array([150, 66, 30])
hi = np.array([255, 214, 170])

snowc = snow_shadow + (snow_lit - snow_shadow) * lit[..., None]
snowc = snowc + (hi - snowc) * np.clip(lit - 0.75, 0, 1)[..., None] * 1.6
rockc = rock_shadow + (rock_lit - rock_shadow) * (lit[..., None] * 0.8)
col = snowc + (rockc - snowc) * rock[..., None]
col = col * (0.9 + speck[..., None] * 0.2)
# Atmospheric fade into the dark base.
fade = np.clip((Y - H * 0.64) / (H * 0.36), 0, 1)[..., None] ** 1.3
col = col * (1 - fade * 0.85)

# Sky: deep teal-blue, lighter towards the horizon.
t = (Y / (H * 0.62))[..., None]
sky_top = np.array([10, 26, 36])
sky_low = np.array([30, 58, 72])
sky = sky_top + (sky_low - sky_top) * np.clip(t, 0, 1) ** 1.6
sky = sky + fbm(W, H, 400, 2)[..., None] * 3

# Soft anti-aliased edge.
edge = np.clip((Y - top[None, :]) / 2.0, 0, 1)[..., None]
img = sky * (1 - edge) + col * edge
img = np.clip(img, 0, 255).astype(np.uint8)
out = Image.fromarray(img, 'RGB').filter(ImageFilter.GaussianBlur(0.6))
out.save(sys.argv[2] if len(sys.argv) > 2 else 'mountain.png')
