"""
Gerador dos itens VISUAIS do banco de QI da NURA.
Produz SVG line-art minimalista (preto sobre branco), estilo myIQ, mas 100% original
e gerado por regra — cada item tem lógica válida e distratores plausíveis.

Dimensões geradas aqui:
  - raciocinio_abstrato  (matrizes 3x3 estilo Raven, por regra)
  - orientacao_espacial  (rotação mental de polígono assimétrico)
  - percepcao_visual     (odd-one-out + completar grade)

Cada item retorna um dict no schema do banco, com 6 alternativas (SVG cada) e o índice correto.
"""
import math, random, json

random.seed(20260827)

STROKE = 'stroke="#111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"'
STROKE_FILL = 'stroke="#111" stroke-width="2" fill="#111"'
VB = 120  # viewBox base

def svg(inner, w=VB, h=VB):
    return (f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">'
            f'<rect x="0" y="0" width="{w}" height="{h}" fill="#fff"/>{inner}</svg>')

# ---------- primitives ----------
def poly(pts, closed=True, fill=False):
    d = " ".join(f"{x:.1f},{y:.1f}" for x,y in pts)
    tag = "polygon" if closed else "polyline"
    st = STROKE_FILL if fill else STROKE
    return f'<{tag} points="{d}" {st}/>'

def circle(cx,cy,r,fill=False):
    st = STROKE_FILL if fill else STROKE
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" {st}/>'

def line(x1,y1,x2,y2):
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" {STROKE}/>'

def ngon(cx,cy,r,n,rot=0,fill=False):
    pts=[]
    for i in range(n):
        a = rot + i*2*math.pi/n - math.pi/2
        pts.append((cx+r*math.cos(a), cy+r*math.sin(a)))
    return poly(pts, closed=True, fill=fill)

# ============================================================
# RACIOCÍNIO ABSTRATO — matriz 3x3 de contagem de elementos
# Regra: nº de pontos = f(linha, coluna). Falta a célula (3,3).
# ============================================================
def cell(dots):
    # desenha 'dots' pontinhos numa mini-grade dentro de um quadro 40x40 (coord local)
    inner = '<rect x="4" y="4" width="32" height="32" stroke="#111" stroke-width="1.5" fill="none"/>'
    positions = [(12,12),(28,12),(12,28),(28,28),(20,20),(20,12),(20,28),(12,20),(28,20)]
    for i in range(dots):
        x,y = positions[i]
        inner += f'<circle cx="{x}" cy="{y}" r="3.5" fill="#111"/>'
    return inner

def matrix_count_item(idx, dif):
    # regra: valor(l,c) = base + l*rstep + c*cstep
    base = random.choice([0,1])
    rstep = random.choice([1,2])
    cstep = random.choice([1,2])
    def val(l,c): return base + l*rstep + c*cstep
    # montar grade 3x3, célula (2,2) é o alvo
    g = ''
    for l in range(3):
        for c in range(3):
            gx, gy = 4 + c*38, 4 + l*38
            if l==2 and c==2:
                g += f'<g transform="translate({gx},{gy})"><rect x="4" y="4" width="32" height="32" stroke="#2563eb" stroke-width="2.5" fill="#eff6ff"/><text x="20" y="28" font-size="24" fill="#2563eb" text-anchor="middle" font-family="Arial" font-weight="bold">?</text></g>'
            else:
                g += f'<g transform="translate({gx},{gy})">{cell(val(l,c))}</g>'
    stim = svg(g, w=120, h=120)
    correct = val(2,2)
    # distratores: valores próximos e plausíveis
    cands = {correct}
    opts_vals = [correct]
    for delta in [1,-1,2,-2,3,rstep+cstep]:
        v = correct+delta
        if v>=0 and v<=9 and v not in cands:
            cands.add(v); opts_vals.append(v)
        if len(opts_vals)==6: break
    while len(opts_vals)<6:
        v=random.randint(0,9)
        if v not in cands: cands.add(v); opts_vals.append(v)
    random.shuffle(opts_vals)
    alts = [svg(f'<g transform="translate(40,40)">{cell(v)}</g>', w=120,h=120) for v in opts_vals]
    return {
        "id": f"ABS-{idx:02d}", "dimensao":"raciocinio_abstrato","tipo":"matriz_contagem","dificuldade":dif,
        "enunciado":"Qual figura completa a matriz?","estimulo":stim,"formato_estimulo":"svg",
        "alternativas":alts,"formato_alternativas":"svg","correta":opts_vals.index(correct),
        "regra":f"Matriz 3x3, contagem de pontos = {base}+linha*{rstep}+coluna*{cstep}. Alvo(2,2)={correct}."
    }

# ============================================================
# RACIOCÍNIO ABSTRATO — matriz de rotação (seta gira passo fixo)
# ============================================================
def arrow(cx,cy,ang):
    # seta apontando, girada por 'ang' rad
    L=16
    dx,dy = math.cos(ang), math.sin(ang)
    x2,y2 = cx+L*dx, cy+L*dy
    x1,y1 = cx-L*dx, cy-L*dy
    # cabeça
    a1 = ang+math.radians(150); a2 = ang-math.radians(150)
    h=8
    hx1,hy1 = x2+h*math.cos(a1), y2+h*math.sin(a1)
    hx2,hy2 = x2+h*math.cos(a2), y2+h*math.sin(a2)
    return line(x1,y1,x2,y2)+line(x2,y2,hx1,hy1)+line(x2,y2,hx2,hy2)

def matrix_rotation_item(idx, dif):
    step = random.choice([45,90])  # graus por célula
    start = random.choice([0,45,90])
    def ang(l,c):
        k = l*3+c
        return math.radians(start + k*step)
    g=''
    for l in range(3):
        for c in range(3):
            gx,gy = 20+c*38, 20+l*38
            if l==2 and c==2:
                g += f'<rect x="{gx-18}" y="{gy-18}" width="36" height="36" stroke="#2563eb" stroke-width="2.5" fill="#eff6ff"/><text x="{gx}" y="{gy+8}" font-size="22" fill="#2563eb" text-anchor="middle" font-family="Arial" font-weight="bold">?</text>'
            else:
                g += f'<rect x="{gx-18}" y="{gy-18}" width="36" height="36" stroke="#111" stroke-width="1.2" fill="none"/>'+arrow(gx,gy,ang(l,c))
    stim = svg(g,w=120,h=120)
    correct_ang = start + 8*step
    # opções: ângulo certo + rotações erradas
    angs=[correct_ang]
    for d in [step, -step, 2*step, 180, -2*step]:
        a=correct_ang+d
        if a%360 not in [x%360 for x in angs]:
            angs.append(a)
        if len(angs)==6: break
    while len(angs)<6:
        a=random.choice([0,45,90,135,180,225,270,315])
        if a%360 not in [x%360 for x in angs]: angs.append(a)
    random.shuffle(angs)
    alts=[svg(arrow(60,60,math.radians(a)),w=120,h=120) for a in angs]
    ci = next(i for i,a in enumerate(angs) if a%360==correct_ang%360)
    return {
        "id":f"ABS-{idx:02d}","dimensao":"raciocinio_abstrato","tipo":"matriz_rotacao","dificuldade":dif,
        "enunciado":"Qual figura completa a matriz?","estimulo":stim,"formato_estimulo":"svg",
        "alternativas":alts,"formato_alternativas":"svg","correta":ci,
        "regra":f"Seta gira {step}° por célula (início {start}°). Alvo={correct_ang%360}°."
    }

# ============================================================
# ORIENTAÇÃO ESPACIAL — rotação mental de polígono assimétrico
# Mostra figura-base; opção correta = mesma figura rotacionada; distratores = espelhada/deformada
# ============================================================
def blob_points(seed):
    rnd = random.Random(seed)
    n = rnd.choice([5,6,7])
    pts=[]
    for i in range(n):
        a = i*2*math.pi/n
        r = rnd.uniform(20,42)
        pts.append((60+r*math.cos(a), 60+r*math.sin(a)))
    return pts

def rotate_pts(pts, deg, cx=60, cy=60):
    a=math.radians(deg); out=[]
    for x,y in pts:
        dx,dy=x-cx,y-cy
        out.append((cx+dx*math.cos(a)-dy*math.sin(a), cy+dx*math.sin(a)+dy*math.cos(a)))
    return out

def mirror_pts(pts, cx=60):
    return [(2*cx-x, y) for x,y in pts]

def spatial_item(idx, dif):
    seed = 1000+idx
    base = blob_points(seed)
    rot = random.choice([90,120,150,210,240])
    correct = rotate_pts(base, rot)
    stim = svg(poly(base))
    opts=[poly(correct)]
    # distratores: espelhada, espelhada+rot, outra rotação de blob diferente, deformada
    opts.append(poly(mirror_pts(rotate_pts(base, rot))))       # espelho da correta
    opts.append(poly(mirror_pts(base)))                         # espelho da base
    opts.append(poly(rotate_pts(blob_points(seed+7), random.choice([60,180]))))  # figura diferente
    # deformada: escala não-uniforme
    defo=[(60+(x-60)*1.35,60+(y-60)*0.7) for x,y in rotate_pts(base,rot)]
    opts.append(poly(defo))
    opts.append(poly(rotate_pts(blob_points(seed+13), 90)))     # outra figura diferente
    alts=[svg(o) for o in opts]
    order=list(range(6)); random.shuffle(order)
    alts=[alts[i] for i in order]; ci=order.index(0)
    return {
        "id":f"ESP-{idx:02d}","dimensao":"orientacao_espacial","tipo":"rotacao_mental","dificuldade":dif,
        "enunciado":"Qual das figuras é a figura acima girada (sem espelhar)?","estimulo":stim,"formato_estimulo":"svg",
        "alternativas":alts,"formato_alternativas":"svg","correta":ci,
        "regra":f"Correta = base rotacionada {rot}°. Distratores: espelhamentos, figuras distintas e deformação não-uniforme."
    }

# ============================================================
# PERCEPÇÃO VISUAL — odd-one-out (5 seguem regra, 1 quebra)
# ============================================================
def perception_odd_item(idx, dif):
    # regra: mesma forma repetida; a diferente muda 1 atributo (lados, rotação, ou preenchimento)
    kind = random.choice(["lados","preenchimento","rotacao"])
    n = random.choice([4,5,6])
    if kind=="lados":
        normal = svg(ngon(60,60,34,n))
        odd    = svg(ngon(60,60,34,n+1))
        regra=f"5 polígonos de {n} lados; o intruso tem {n+1} lados."
    elif kind=="preenchimento":
        normal = svg(ngon(60,60,34,n))
        odd    = svg(ngon(60,60,34,n,fill=True))
        regra=f"5 polígonos vazados; o intruso é preenchido."
    else:
        normal = svg(ngon(60,60,34,n,rot=0))
        odd    = svg(ngon(60,60,34,n,rot=math.radians(180/n)))
        regra=f"5 polígonos na mesma orientação; o intruso está girado."
    alts=[normal]*5+[odd]
    order=list(range(6)); random.shuffle(order)
    alts=[alts[i] for i in order]; ci=order.index(5)
    return {
        "id":f"PER-{idx:02d}","dimensao":"percepcao_visual","tipo":"odd_one_out","dificuldade":dif,
        "enunciado":"Qual figura é diferente das demais?","estimulo":None,"formato_estimulo":"none",
        "alternativas":alts,"formato_alternativas":"svg","correta":ci,"regra":regra
    }

# ============================================================
# PERCEPÇÃO VISUAL — completar grade (densidade/orientação corretas)
# ============================================================
def grid_svg(cols, rows, ang=0):
    inner='<rect x="8" y="8" width="104" height="104" stroke="#111" stroke-width="1" fill="none"/>'
    g=f'<g transform="rotate({ang} 60 60)">'
    for i in range(1,cols):
        x=8+i*(104/cols); g+=line(x,8,x,112)
    for j in range(1,rows):
        y=8+j*(104/rows); g+=line(8,y,112,y)
    g+='</g>'
    return svg(inner+g)

def perception_grid_item(idx, dif):
    cols=random.choice([5,6,7]); rows=cols
    correct=grid_svg(cols,rows,0)
    stim_note="A malha do quadro grande segue uma densidade e orientação regulares."
    opts=[correct,
          grid_svg(cols+2,rows+2,0),   # mais densa
          grid_svg(cols-2,rows-2,0),   # menos densa
          grid_svg(cols,rows,20),      # girada
          grid_svg(cols,rows-2,0),     # retangular
          grid_svg(cols+2,rows,0)]     # anisotrópica
    order=list(range(6)); random.shuffle(order)
    opts=[opts[i] for i in order]; ci=order.index(0)
    # estímulo: a mesma grade correta como referência de padrão
    return {
        "id":f"PER-{idx:02d}","dimensao":"percepcao_visual","tipo":"completar_grade","dificuldade":dif,
        "enunciado":"Qual peça continua o padrão da malha mantendo densidade e orientação?",
        "estimulo":grid_svg(cols,rows,0),"formato_estimulo":"svg",
        "alternativas":opts,"formato_alternativas":"svg","correta":ci,
        "regra":f"Malha {cols}x{rows} reta. Distratores mudam densidade, proporção ou ângulo."
    }

# ---------- montar dimensões visuais ----------
def build_visual():
    items=[]
    # Raciocínio Abstrato: 8 (4 contagem + 4 rotação), dif 1..5
    difs=[1,2,2,3,3,4,4,5]
    for i in range(8):
        if i%2==0: items.append(matrix_count_item(i+1, difs[i]))
        else:      items.append(matrix_rotation_item(i+1, difs[i]))
    # Orientação Espacial: 7, dif 1..5
    difs=[1,2,2,3,4,4,5]
    for i in range(7):
        items.append(spatial_item(i+1, difs[i]))
    # Percepção Visual: 7 (4 odd + 3 grade)
    difs=[1,1,2,2,3,4,5]
    pv=[]
    for i in range(7):
        if i<4: pv.append(perception_odd_item(i+1, difs[i]))
        else:   pv.append(perception_grid_item(i+1, difs[i]))
    items.extend(pv)
    return items

if __name__=="__main__":
    vis = build_visual()
    json.dump(vis, open("/home/claude/nura/visual_items.json","w"), ensure_ascii=False, indent=2)
    from collections import Counter
    print("visual items:", len(vis))
    print(Counter(i["dimensao"] for i in vis))
    print("sample ids:", [i["id"] for i in vis])
