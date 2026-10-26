"""
scripts/build_balanced_dataset.py
Builds a leakage-free, class-balanced YOLO dataset from oral_dataset/.

Usage:  python scripts/build_balanced_dataset.py [--src oral_dataset] [--dst oral_dataset_balanced]
Steps are explained in Action.md.
"""
import argparse, os, re, random, shutil, json, zipfile
from collections import defaultdict, Counter

import numpy as np
from PIL import Image

NAMES = ['calculus', 'cancer', 'caries', 'gingivitis', 'ulcer']
SPLIT_SHARE = {'train': 0.76, 'valid': 0.14, 'test': 0.10}      # of every class' images
TRAIN_IMG_CAP = 1000        # max train images per class
TRAIN_BOX_TARGET = 3000     # stop adding train images for a class once it has this many boxes
# valid/test quotas are the same numbers scaled by split share / train share
HASH_DIST = 4                                                      # dHash hamming threshold
SEED = 42


def source_id(fname):
    return re.sub(r'_(jpg|jpeg|png)\.rf\..*$', '', fname)


def dhash(path, size=8):
    im = Image.open(path).convert('L').resize((size + 1, size), Image.BILINEAR)
    a = np.asarray(im, dtype=np.int16)
    bits = (a[:, 1:] > a[:, :-1]).flatten()
    return int(''.join('1' if b else '0' for b in bits), 2)


class DSU:
    def __init__(self): self.p = {}
    def find(self, x):
        self.p.setdefault(x, x)
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x
    def union(self, a, b): self.p[self.find(a)] = self.find(b)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='oral_dataset')
    ap.add_argument('--dst', default='oral_dataset_balanced')
    a = ap.parse_args()
    rnd = random.Random(SEED)

    # 1. Index every image: path, label path, class, box count, hash
    items = []
    for s in ['train', 'valid', 'test']:
        idir, ldir = (os.path.join(a.src, s, d) for d in ('images', 'labels'))
        for f in os.listdir(idir):
            lp = os.path.join(ldir, os.path.splitext(f)[0] + '.txt')
            if not os.path.exists(lp):
                continue
            rows = [l.strip() for l in open(lp) if l.strip()]
            cls = {int(r.split()[0]) for r in rows}
            if len(cls) != 1:
                continue                      # unlabeled / multi-class: ambiguous for balancing
            items.append(dict(img=os.path.join(idir, f), lbl=lp, name=f, sid=source_id(f),
                              cls=cls.pop(), boxes=len(rows)))
    print('indexed images:', len(items))
    for it in items:
        it['h'] = dhash(it['img'])

    # 2. Group: same source id OR near-identical hash  -> one group (never split apart)
    dsu = DSU()
    by_sid = defaultdict(list)
    for i, it in enumerate(items):
        by_sid[it['sid']].append(i)
    for idxs in by_sid.values():
        for j in idxs[1:]: dsu.union(idxs[0], j)
    buckets = defaultdict(list)               # bucket on 16-bit prefix pairs to avoid O(n^2)
    for i, it in enumerate(items):
        h = it['h']
        for k in range(4):                    # pigeonhole: dist<=4 => some 16-bit chunk equal... (approx. via 4 chunks)
            buckets[(k, (h >> (16 * k)) & 0xFFFF)].append(i)
    for idxs in buckets.values():
        if len(idxs) > 60:                    # degenerate flat-image bucket; skip
            continue
        for x in range(len(idxs)):
            for y in range(x + 1, len(idxs)):
                i, j = idxs[x], idxs[y]
                if bin(items[i]['h'] ^ items[j]['h']).count('1') <= HASH_DIST:
                    dsu.union(i, j)
    groups = defaultdict(list)
    for i in range(len(items)):
        groups[dsu.find(i)].append(i)

    # 3. Drop groups whose members carry conflicting class labels (same photo, two diseases)
    clean = {g: m for g, m in groups.items() if len({items[i]['cls'] for i in m}) == 1}
    print(f'groups: {len(groups)}  conflicting(dropped): {len(groups) - len(clean)}')
    per_cls_groups = defaultdict(list)
    for g, m in clean.items():
        per_cls_groups[items[m[0]]['cls']].append(g)
    print('unique groups per class:', {NAMES[c]: len(v) for c, v in sorted(per_cls_groups.items())})

    # 4. Assign whole groups to splits (per class, stratified) -> zero leakage
    split_of = {}
    for c, gs in per_cls_groups.items():
        rnd.shuffle(gs)
        n = len(gs)
        n_tr, n_va = int(n * SPLIT_SHARE['train']), int(n * SPLIT_SHARE['valid'])
        for k, g in enumerate(gs):
            split_of[g] = 'train' if k < n_tr else 'valid' if k < n_tr + n_va else 'test'

    # 5. Per class & split: sample images up to quota, round-robin over groups (diversity first),
    #    weighting toward images with fewer boxes so box-heavy classes do not dominate the loss.
    selected = []
    for c in range(len(NAMES)):
        for s, share in SPLIT_SHARE.items():
            scale = share / SPLIT_SHARE['train']
            quota, box_quota = int(TRAIN_IMG_CAP * scale), TRAIN_BOX_TARGET * scale
            gs = [g for g in per_cls_groups[c] if split_of[g] == s]
            pool = {g: sorted(clean[g], key=lambda i: (items[i]['boxes'] ** 0.5) * rnd.random()) for g in gs}
            picked, boxes = [], 0
            while len(picked) < quota and boxes < box_quota and any(pool.values()):
                # one image per group per round (diversity first), fewest-boxes groups first
                order = sorted([g for g in gs if pool[g]], key=lambda g: items[pool[g][0]]['boxes'] * rnd.random())
                for g in order:
                    if len(picked) >= quota or boxes >= box_quota: break
                    i = pool[g].pop(0)
                    picked.append(i); boxes += items[i]['boxes']
            selected += [(s, i) for i in picked]

    # 6. Write output
    if os.path.exists(a.dst): shutil.rmtree(a.dst)
    for s in SPLIT_SHARE:
        for d in ('images', 'labels'):
            os.makedirs(os.path.join(a.dst, s, d))
    for s, i in selected:
        it = items[i]
        stem = os.path.splitext(it['name'])[0]
        shutil.copy(it['img'], os.path.join(a.dst, s, 'images', it['name']))
        shutil.copy(it['lbl'], os.path.join(a.dst, s, 'labels', stem + '.txt'))

    # 7. Report
    rep = {}
    for s in SPLIT_SHARE:
        img, inst = Counter(), Counter()
        for s2, i in selected:
            if s2 == s:
                img[items[i]['cls']] += 1; inst[items[i]['cls']] += items[i]['boxes']
        rep[s] = {NAMES[c]: {'images': img[c], 'boxes': inst[c]} for c in range(len(NAMES))}
        print(s, rep[s])
    leaks = defaultdict(set)
    for s, i in selected: leaks[dsu.find(i)].add(s)
    print('groups spanning >1 split (must be 0):', sum(len(v) > 1 for v in leaks.values()))
    json.dump(rep, open(os.path.join(a.dst, 'balance_report.json'), 'w'), indent=2)
    print('total images:', len(selected))


if __name__ == '__main__':
    main()
