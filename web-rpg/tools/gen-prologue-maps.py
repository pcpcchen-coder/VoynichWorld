#!/usr/bin/env python3
"""
序章〈味變〉地圖圖塊產生器：python3 tools/gen-prologue-maps.py
輸出 js/data/maps-tiles.js（只含 ground／objects／overlay 三層）。
地圖的名稱、實體、patches 等寫在 js/data/maps-*.js，那些檔案以座標參照這裡的地形；
改這裡的座標時，請一併檢查實體座標（node tools/print-map.js <地圖id> 可印出含實體的預覽）。
圖塊字元見 docs/ENGINE.md §5.1。
"""
import math, os, json

class M:
    def __init__(s, w, h, fill='.'):
        s.w, s.h = w, h
        s.g = [[fill] * w for _ in range(h)]
        s.o = [[' '] * w for _ in range(h)]
        s.v = [[' '] * w for _ in range(h)]

    def L(s, layer):
        return {'g': s.g, 'o': s.o, 'v': s.v}[layer]

    def set(s, x, y, ch, layer='g'):
        if 0 <= x < s.w and 0 <= y < s.h:
            s.L(layer)[y][x] = ch

    def rect(s, x0, y0, x1, y1, ch, layer='g'):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                s.set(x, y, ch, layer)

    def border(s, ch='R'):
        s.rect(0, 0, s.w - 1, 0, ch); s.rect(0, s.h - 1, s.w - 1, s.h - 1, ch)
        s.rect(0, 0, 0, s.h - 1, ch); s.rect(s.w - 1, 0, s.w - 1, s.h - 1, ch)

    def ellipse(s, cx, cy, rx, ry, ch, layer='g'):
        for y in range(s.h):
            for x in range(s.w):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                    s.set(x, y, ch, layer)

    def hline(s, x0, x1, y, ch, layer='g'):
        for x in range(min(x0, x1), max(x0, x1) + 1): s.set(x, y, ch, layer)

    def vline(s, x, y0, y1, ch, layer='g'):
        for y in range(min(y0, y1), max(y0, y1) + 1): s.set(x, y, ch, layer)

    def pts(s, lst, ch, layer='o'):
        for x, y in lst: s.set(x, y, ch, layer)

    def rows(s, layer):
        return [''.join(r) for r in s.L(layer)]


maps = {}

# ---------------------------------------------------------------- 霧階池站 40×30
m = M(40, 30)
m.border('R')
m.rect(1, 25, 4, 28, ';'); m.rect(34, 1, 38, 3, ';'); m.rect(1, 1, 3, 1, ';')
m.ellipse(16, 14, 7.3, 4.7, '~')
m.ellipse(16, 14, 4.3, 2.6, 'W')
# 浮基小徑
m.vline(19, 0, 5, ','); m.hline(2, 37, 5, ','); m.vline(37, 5, 24, ','); m.hline(37, 39, 12, ',')
m.vline(2, 5, 24, ','); m.hline(2, 37, 24, ','); m.vline(25, 10, 24, ',')
m.vline(5, 22, 23, ','); m.vline(30, 22, 23, ','); m.hline(19, 25, 10, ','); m.vline(19, 5, 10, ',')
m.hline(2, 8, 12, ',')            # 往水位尺
m.hline(20, 25, 18, ',')          # 往取樣點
m.set(19, 0, ',')                 # 北口
m.set(39, 12, ',')                # 東口
# 棚（H；最下一列為牆面）
m.rect(3, 2, 7, 4, 'H'); m.set(5, 4, 'D')          # 池守棚
m.rect(3, 20, 7, 22, 'H'); m.set(5, 22, 'D')       # 記脈棚
m.rect(28, 20, 32, 22, 'H'); m.set(30, 22, 'D')    # 湯棚
m.rect(22, 7, 25, 9, 'H')                          # 嫁接棚（不可進入）
m.rect(9, 1, 11, 2, 'H'); m.rect(33, 15, 35, 16, 'H'); m.rect(11, 26, 13, 27, 'H')  # 其餘小棚
m.rect(28, 27, 34, 28, '"')
m.rect(14, 28, 18, 28, ';')
# 物件
m.pts([(9, 8), (10, 7), (11, 8), (12, 7), (13, 8), (14, 7), (15, 8)], 't')   # 站內鐘管草七株
m.pts([(1, 17), (1, 18), (20, 28), (22, 27), (24, 28), (26, 28)], 't')
m.pts([(14, 1), (24, 3), (36, 19), (8, 27), (36, 28), (1, 9), (27, 12)], 'Y')
m.pts([(6, 9), (33, 12), (22, 26), (8, 18), (36, 9), (16, 1), (1, 22), (38, 16)], 'b')
m.pts([(16, 26), (3, 13), (27, 16), (12, 21), (31, 26), (6, 26), (21, 22)], 'f')
m.pts([(22, 1), (23, 1)], 'p')                                 # 梭的貨架
m.pts([(26, 7), (27, 7), (28, 7)], 'n')                         # 嫁接棚旁根籬
m.pts([(34, 26)], 'c')                                          # 絡的補膜攤
m.pts([(11, 20), (11, 22)], 'p')                                # 淨水槽旁的陶罐
maps['map.miststep.station'] = m

# ---------------------------------------------------------------- 站內棚屋 30×12
m = M(30, 12, ':')
m.rect(0, 0, 29, 0, '|'); m.rect(0, 10, 29, 11, '|')
for x in (0, 9, 19, 29): m.vline(x, 0, 11, '|')
m.set(4, 10, 'D'); m.set(14, 10, 'D'); m.set(24, 10, 'D')
m.rect(0, 11, 29, 11, '0')
# 記脈棚（左）
m.pts([(4, 2), (5, 2)], 'c'); m.pts([(7, 1), (3, 4)], 'k'); m.pts([(2, 7), (3, 7), (6, 7)], 'm'); m.pts([(7, 8)], 'p')
# 池守棚（中）
m.pts([(10, 1), (11, 1)], 'k'); m.pts([(16, 4)], 'k'); m.pts([(14, 6), (15, 6)], 'c'); m.pts([(18, 1), (18, 8)], 'p'); m.pts([(12, 8), (13, 8)], 'm')
# 湯棚（右）
m.pts([(22, 3), (26, 3), (22, 6), (26, 6)], 'c'); m.pts([(28, 1)], 'h'); m.pts([(28, 3), (20, 1)], 'p'); m.pts([(21, 8), (27, 8)], 'm')
maps['map.miststep.sheds'] = m

# ---------------------------------------------------------------- 階梯泉（下三階）40×32
m = M(40, 32)
m.border('R')
m.rect(1, 1, 5, 7, 'R'); m.rect(34, 1, 38, 7, 'R'); m.rect(1, 1, 38, 1, 'R')
m.rect(1, 1, 3, 9, 'R'); m.rect(36, 1, 38, 16, 'R')
m.rect(6, 2, 33, 7, '^')                         # 三階台地
m.rect(1, 8, 38, 9, 'R'); m.rect(18, 8, 20, 9, '>')   # 三階↔二階
m.rect(1, 17, 38, 18, 'R'); m.rect(18, 17, 20, 18, '>')  # 二階↔一階
m.rect(1, 10, 35, 16, '.'); m.rect(1, 10, 1, 16, 'R')
m.rect(1, 19, 38, 30, '.')
# 三階泉源池
m.ellipse(19, 4.5, 8, 2.8, '~'); m.ellipse(19, 4.5, 5, 1.8, 'W')
m.ellipse(19, 4.5, 2.2, 1.2, 's')
m.vline(19, 2, 7, '='); m.set(19, 4, 'R')        # 取樣石（中央）
m.set(19, 3, 'W'); m.set(18, 4, '='); m.set(20, 4, '=')
m.set(19, 4, '^')
# 二階池
m.ellipse(19, 13, 6.5, 3.2, '~'); m.ellipse(19, 13, 3.8, 2.0, 'W')
m.vline(19, 10, 16, '=')
# 一階池（北半全深，棧道為唯一往上的路）
m.ellipse(19, 21.5, 7.5, 4.6, '~'); m.ellipse(19, 20.5, 5.8, 3.3, 'W')
m.rect(13, 19, 25, 19, 'W'); m.rect(15, 19, 23, 19, 'W')
m.vline(19, 19, 27, '=')
m.rect(1, 17, 38, 18, 'R'); m.rect(18, 17, 20, 18, '>')   # 池階之間的礦殼短梯（池畫完後再壓一次）
m.vline(19, 27, 31, ',')
m.set(19, 31, ',')                               # 南口
m.vline(19, 0, 1, ',')                           # 北口（往上階，本章封閉）
m.set(19, 1, '^')
m.rect(29, 19, 31, 23, 'x'); m.set(28, 21, 'x'); m.set(32, 20, 'x')   # 乾裂活土
m.set(33, 21, '!'); m.set(31, 5, '!'); m.set(30, 6, '!')
m.rect(24, 27, 29, 28, '"'); m.rect(7, 12, 9, 13, '"')
m.pts([(10, 27), (13, 27)], 't'); m.pts([(7, 20), (12, 29), (31, 13), (4, 15), (26, 24)], 'b')
m.pts([(4, 14), (7, 22), (27, 3)], 'f'); m.pts([(3, 28), (36, 29), (8, 6)], 'Y'); m.pts([(25, 6), (12, 3)], 'r')
maps['map.miststep.terrace'] = m

# ---------------------------------------------------------------- 活土原 44×30
m = M(44, 30)
m.border('R')
m.rect(1, 1, 6, 4, '"'); m.rect(2, 19, 6, 21, '"'); m.rect(10, 25, 13, 26, '"')
m.hline(0, 19, 8, ','); m.vline(19, 8, 16, ','); m.hline(19, 30, 16, ','); m.vline(30, 16, 22, ','); m.hline(30, 43, 22, ',')
m.set(0, 8, ','); m.set(43, 22, ',')
# 東口窄道
m.rect(40, 21, 43, 21, 'R'); m.rect(40, 23, 43, 23, 'R'); m.rect(42, 1, 43, 20, 'R'); m.rect(42, 24, 43, 28, 'R')
# 乾裂區
m.ellipse(28, 10, 4.6, 4.4, 'x')
for p in [(24, 12), (25, 12), (25, 11), (26, 11), (26, 10)]: m.set(p[0], p[1], '"')   # 還活著的落腳點
m.set(27, 10, 'x')
# 鐘管草籬（西半與東半的界線，只在小徑留口）
for y in range(1, 29):
    if y in (8,): continue
    m.set(14, y, 't' if y % 3 else 'b', 'o')
m.set(14, 7, 't', 'o'); m.set(14, 9, 't', 'o')
m.pts([(13, 6), (15, 6), (13, 10), (15, 10), (12, 5), (16, 11)], 't')   # 健康的鐘管草叢
# 小池
m.ellipse(31, 27, 4.5, 1.6, '~'); m.ellipse(31, 27.4, 2.4, 0.9, 'W')
m.set(34, 18, '!')
m.pts([(30, 1), (34, 2), (27, 3), (36, 5)], 'f')
m.pts([(4, 11), (9, 26), (22, 4), (38, 13), (21, 26), (35, 9)], 'b')
m.pts([(2, 14), (39, 2), (8, 2), (22, 20), (39, 26)], 'Y')
maps['map.miststep.soilflat'] = m

# ---------------------------------------------------------------- 脈橋 48×20
m = M(48, 20, 'W')
m.rect(0, 5, 5, 15, '.'); m.rect(42, 5, 47, 15, '.')
m.rect(0, 0, 3, 4, 'R'); m.rect(0, 16, 3, 19, 'R'); m.rect(44, 0, 47, 4, 'R'); m.rect(44, 16, 47, 19, 'R')
m.rect(0, 5, 0, 15, 'R'); m.rect(47, 5, 47, 15, 'R')
for (x0, x1) in ((4, 8), (39, 43)):
    m.rect(x0, 3, x1, 4, '~'); m.rect(x0, 16, x1, 17, '~')
m.rect(4, 5, 7, 7, '~'); m.rect(4, 13, 7, 15, '~'); m.rect(40, 5, 43, 7, '~'); m.rect(40, 13, 43, 15, '~')
m.rect(1, 5, 4, 15, '.')
m.rect(43, 5, 46, 15, '.')
m.rect(4, 8, 43, 12, '=')
m.set(0, 10, ','); m.hline(1, 4, 10, ','); m.hline(43, 46, 10, ','); m.set(47, 10, '^')
# 長到橋面上的高草（沒人修剪）
import random
random.seed(7)
for _ in range(46):
    x = random.randint(6, 41); y = random.randint(8, 12)
    m.set(x, y, '"')
m.pts([(2, 6), (45, 6), (2, 14)], 't'); m.pts([(3, 7), (44, 13)], 'b'); m.pts([(1, 12), (46, 12)], 'Y')
m.pts([(10, 8), (31, 12), (21, 8), (37, 8)], 'f')
maps['map.miststep.bridge'] = m

# ---------------------------------------------------------------- 橋腹導管洞·上層 36×28
m = M(36, 28, '#')
m.hline(1, 30, 2, '_')                        # 上廊（入口→東支死路）
m.vline(10, 3, 8, '_')                        # 南支管
m.hline(3, 31, 8, '_')                        # 岔口乙橫廊
m.rect(2, 11, 8, 15, '_'); m.vline(3, 9, 10, '_')    # 西支小室
m.set(7, 9, '_')                              # 橫廊左的滴口
m.vline(17, 9, 16, '_')                       # 中支管（死潮）
m.rect(13, 17, 21, 23, '_')                   # 淹水階梯室
m.ellipse(17, 20, 3.2, 2.4, '~'); m.set(17, 20, '>')
m.vline(29, 9, 25, '_')                       # 東支空管斜坡
m.set(29, 14, '!'); m.set(29, 18, '!'); m.set(29, 22, '!')
m.set(29, 25, '>')
m.set(1, 2, '_')
m.pts([(12, 1), (9, 3), (6, 7), (17, 7), (29, 7)], 'a', 'v')   # 洞頂垂下的根管叢（岔口）
m.pts([(4, 1), (20, 1), (25, 1), (3, 7), (22, 7), (14, 16), (24, 1)], 'a', 'v')
m.pts([(3, 12), (7, 14), (13, 22), (21, 18)], 'f')
m.pts([(2, 15), (8, 11)], 'P')
maps['map.miststep.conduit_upper'] = m

# ---------------------------------------------------------------- 橋腹導管洞·下層（舊接口）36×28
m = M(36, 28, '#')
m.rect(1, 2, 4, 6, '_')                       # 入口平台
m.rect(6, 3, 12, 8, '~')                      # 西池（基本地形：淺；依活瓣以 patches 變深）
m.rect(7, 1, 10, 2, '_')                      # 西池北側凹室
m.rect(13, 2, 21, 8, '_')                     # 中島
m.rect(22, 3, 28, 7, '~')                     # 東池
m.set(5, 4, '_'); m.set(5, 5, '_')
m.hline(29, 34, 4, '_')                       # 東通道
m.vline(34, 4, 12, '_')
m.rect(9, 12, 34, 22, '_')                    # 舊接口前廳
m.rect(4, 16, 8, 16, '_')                     # 封死管段（入口處由實體擋住）
m.rect(1, 14, 3, 18, '_')                     # 龕室
m.pts([(12, 14), (14, 13), (16, 14), (12, 19), (14, 20), (16, 19)], 't')   # 枯鐘管草六叢（同一高度）
m.pts([(24, 13), (2, 17), (31, 20)], 'f')
m.set(25, 17, '!')
m.pts([(3, 1), (14, 1), (24, 2), (33, 3), (20, 11), (28, 11)], 'a', 'v')
m.pts([(1, 6), (21, 8)], 'P')
m.set(1, 2, '>'); m.set(1, 4, '>')        # 兩個入口（往上層）
maps['map.miststep.conduit_lower'] = m

# ---------------------------------------------------------------- 輸出
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '..', 'js', 'data', 'maps-tiles.js')
lines = ['/*', ' * 序章〈味變〉地圖圖塊（由 tools/gen-prologue-maps.py 產生，請勿手改；改產生器後重新執行）。',
         ' * 只含 ground／objects／overlay 三層；名稱、實體、patches 在 js/data/maps-*.js。', ' */',
         '(function (V) {', "  'use strict';", '  var D = V.data;']
for mid, mm in maps.items():
    lines.append('  D.maps[%s] = D.maps[%s] || {};' % (json.dumps(mid), json.dumps(mid)))
    for key, layer in (('ground', 'g'), ('objects', 'o'), ('overlay', 'v')):
        rows = mm.rows(layer)
        if layer != 'g' and all(r.strip() == '' for r in rows):
            continue
        lines.append('  D.maps[%s].%s = [' % (json.dumps(mid), key))
        lines.append(',\n'.join('    ' + json.dumps(r, ensure_ascii=False) for r in rows))
        lines.append('  ];')
lines.append('})(window.VELLORA);')
open(out, 'w', encoding='utf8').write('\n'.join(lines) + '\n')
print('寫入', os.path.normpath(out))
for mid, mm in maps.items():
    print(mid, mm.w, 'x', mm.h)
