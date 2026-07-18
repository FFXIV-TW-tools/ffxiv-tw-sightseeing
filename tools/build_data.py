# -*- coding: utf-8 -*-
"""
build_data.py — 建 data/sightseeing-data.js（340 筆探索日誌權威資料）

主軸＝遊戲原生 Adventure sheet（官方繁中名 + 時間窗 + emote + placename，全 340 筆）
座標 X/Y＝遊戲原生 Level sheet（Adventure.Level → Level X/Z + Map SizeFactor 換算，全 340 筆權威、1 位小數）
  · 對標社群源驗證：HW–DT 與 babelin 差 mean 0.08；ARR 補齊 74 筆整數→小數；Google Sheet 交叉驗證 18/20 差<0.1
天氣＝cycleapple(ARR)；zoneKey＝cycleapple region(ARR) / babelin zone(HW–DT)，交叉核對 Adventure placeName
高度 z＝babelin(HW–DT 留用)：遊戲 Level.Y 無穩定「world→顯示」換算公式（同 z 值對應迥異 Level.Y），不強套
"""
import csv, json, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))            # tools/
REPO = os.path.dirname(HERE)                                 # repo root
MONO = os.path.abspath(os.path.join(REPO, "..", ".."))       # monorepo root
sys.path.insert(0, HERE)
from build_zones import ZONES  # 共用 zone 主表

# ---- source→zoneKey 對照 ----
region2key = {}   # cycleapple region(英) -> zoneKey
bzone2key = {}    # babelin zone(繁中) -> zoneKey
for zoneKey, tc, wz, exp, src_arr, src_late in ZONES:
    for s in src_arr:
        region2key[s] = zoneKey
    for s in src_late:
        bzone2key[s] = zoneKey
zone_tc = {zoneKey: tc for zoneKey, tc, *_ in ZONES}

# ---- tc_PlaceName: id->tc ----
pn_tc = {}
for r in list(csv.reader(open(f"{MONO}/data/item_dict/datamining_tc/tc_PlaceName.csv", encoding="utf-8")))[3:]:
    if len(r) >= 2:
        try: pn_tc[int(r[0])] = r[1].strip()
        except ValueError: pass

# ---- Adventure sheet: 340 rows ----
adv_rows = list(csv.reader(open(f"{HERE}/sources/tc_Adventure.csv", encoding="utf-8-sig")))[4:]
adv = []
for r in adv_rows:
    if len(r) < 14 or not r[12].strip():
        continue
    adv.append({
        "adventureId": int(r[0]),
        "levelId": int(r[1]),        # Adventure.Level → tc_Level.csv key（座標權威源）
        "emoteId": int(r[4]),
        "minTime": int(r[5]),
        "maxTime": int(r[6]),
        "placeNameId": int(r[7]),
        "name": r[12].strip(),
    })
assert len(adv) == 340, f"Adventure 應 340 筆，實 {len(adv)}"

# ---- 遊戲原生座標：Adventure.Level → Level(X/Y/Z + Map) → Map(SizeFactor/Offset) 換算地圖座標(1~42) ----
def _load_keyed(path):
    return {r[0]: r for r in list(csv.reader(open(path, encoding="utf-8")))[3:] if r and r[0]}
LEVEL = _load_keyed(f"{MONO}/data/item_dict/datamining_tc/tc_Level.csv")  # key,X,Y,Z,Yaw,Radius,Type,Object,Map,...
MAPS  = _load_keyed(f"{MONO}/data/item_dict/datamining_tc/tc_Map.csv")    # key,...,SizeFactor(8),Offset{X}(9),Offset{Y}(10)

def _to_map(world, offset, sf):  # 標準 FFXIV world→map 座標公式（已對標 reference 站驗證）
    c = sf / 100.0
    return (41.0 / c) * (((world + offset) * c + 1024.0) / 2048.0) + 1.0

def level_coords(level_id):
    """Adventure.Level → 地圖座標 (x, y)，1~42、四捨五入 1 位小數；查無回 None。"""
    lv = LEVEL.get(str(level_id))
    if not lv:
        return None
    mp = MAPS.get(lv[8])  # Level.Map
    if not mp:
        return None
    sf, offx, offy = float(mp[8]), float(mp[9]), float(mp[10])
    x = _to_map(float(lv[1]), offx, sf)  # Level.X → 地圖 X
    y = _to_map(float(lv[3]), offy, sf)  # Level.Z → 地圖 Y（遊戲 Z 軸＝地圖縱軸）
    return (round(x, 1), round(y, 1))

# ---- cycleapple + babelin（node 已抽成 JSON）----
src = json.load(open(f"{HERE}/sources/extracted.json", encoding="utf-8"))
ca = src["cycleapple_arr"]                 # 80，index=idx
bab = src["babelin"]                        # {hw:[...],...}
ca_by_advid = {e["adventureId"]: e for e in ca}

# ---- 版本邊界（Adventure/babelin 同序）----
BOUNDS = [("arr", 0, 80), ("hw", 80, 142), ("sb", 142, 204),
          ("shb", 204, 249), ("ew", 249, 295), ("dt", 295, 340)]

# ---- emoteId -> 官方繁中（遊戲 Emote sheet，權威）----
emoteid_tc = {}
for r in list(csv.reader(open(f"{HERE}/sources/tc_Emote.csv", encoding="utf-8-sig")))[4:]:
    if len(r) >= 2:
        try: emoteid_tc[int(r[0])] = r[1].strip()
        except ValueError: pass

# ---- emoteId -> emoteCmd（標準 FFXIV 表情指令）----
EMOTEID_CMD = {22: "lookout", 58: "pray", 50: "sit", 52: "groundsit", 31: "salute",
               27: "point", 30: "psych", 13: "doze", 9: "comfort", 23: "showoff", 34: "cheer"}

def time_of(a):
    if a["minTime"] == 0 and a["maxTime"] == 0:
        return (None, None)
    return (a["minTime"] // 100, a["maxTime"] // 100 + 1)

# ---- 合併 ----
DATA = {}
warns = []
for exp, s, e in BOUNDS:
    lst = []
    for idx in range(s, e):
        a = adv[idx]
        no = idx - s + 1
        ts, te = time_of(a)
        eid = a["emoteId"]
        emote_tc = emoteid_tc.get(eid, "")
        emote_cmd = EMOTEID_CMD.get(eid, "")
        adv_pn_tc = pn_tc.get(a["placeNameId"], "")
        entry = {"no": no, "name": a["name"]}
        gc = level_coords(a["levelId"])   # 遊戲原生座標（權威、取代社群源 x/y）
        if exp == "arr":
            c = ca_by_advid[a["adventureId"]]
            zoneKey = region2key.get(c["region"])
            if not zoneKey: warns.append(f"arr#{no}: region '{c['region']}' 無 zoneKey")
            entry["zoneKey"] = zoneKey
            sx, sy = c["x"], c["y"]
            entry["x"], entry["y"] = gc if gc else (sx, sy)
            entry["weathers"] = list(c["weather"])
            entry["timeStart"] = ts; entry["timeEnd"] = te
        else:
            b = bab[exp][no - 1]
            zoneKey = bzone2key.get(b["zone"])
            if not zoneKey: warns.append(f"{exp}#{no}: babelin zone '{b['zone']}' 無 zoneKey")
            entry["zoneKey"] = zoneKey
            sx, sy = b["x"], b["y"]
            entry["x"], entry["y"] = gc if gc else (sx, sy)
            if b.get("z") is not None: entry["z"] = b["z"]   # 高度留 babelin（遊戲 Level.Y 無穩定顯示換算）
            entry["weathers"] = []
            entry["timeStart"] = ts; entry["timeEnd"] = te
            # 交叉核對：Adventure placeName tc 應對上 zone tc（zone 級才比對，城市 pn 可能同名）
            if zoneKey and adv_pn_tc and adv_pn_tc != zone_tc.get(zoneKey):
                warns.append(f"{exp}#{no}: Adventure地名'{adv_pn_tc}' ≠ zone tc'{zone_tc.get(zoneKey)}' (babelin zone '{b['zone']}')")
        # 座標源安全檢：遊戲換算與社群源差 >3 = Level.Map 可能對到子圖/sf 不符，需人工查
        if not gc:
            warns.append(f"{exp}#{no} {a['name']}: Level {a['levelId']} 查無座標，沿用社群源 ({sx},{sy})")
        elif abs(gc[0] - sx) > 3 or abs(gc[1] - sy) > 3:
            warns.append(f"{exp}#{no} {a['name']}: 遊戲座標{gc} vs 社群源({sx},{sy}) 差>3，查 Level.Map/sf")
        entry["emote"] = emote_tc
        entry["emoteCmd"] = emote_cmd
        # note：極短時間窗（≤1 遊戲小時）
        if ts is not None and te is not None:
            span = (te - ts) % 24
            if span <= 1:
                entry["note"] = "⚠ 時間窗極短（1 遊戲小時）"
        lst.append(entry)
    DATA[exp] = lst

# ---- 寫 data/sightseeing-data.js ----
OUT = f"{REPO}/data/sightseeing-data.js"
with open(OUT, "w", encoding="utf-8") as f:
    f.write("/**\n")
    f.write(" * sightseeing-data.js — 探索筆記全 340 筆（AUTO-GEN by tools/build_data.py，勿手改）\n")
    f.write(" * 名稱/時間/emote/座標 X/Y＝遊戲原生 sheet（Adventure + Level/Map 換算，官方繁中、1 位小數）· 高度 z=babelin(HW–DT)\n")
    f.write(" */\n")
    f.write("window.SIGHTSEEING_DATA = ")
    f.write(json.dumps(DATA, ensure_ascii=False, indent=1))
    f.write(";\n")

# ---- 報告 ----
counts = {k: len(v) for k, v in DATA.items()}
print("筆數:", counts, "總:", sum(counts.values()))
print("emoteId->繁中:", {k: emoteid_tc[k] for k in sorted(emoteid_tc)})
# HW-DT 有時間窗的筆數
late_timed = sum(1 for exp,_,_ in BOUNDS[1:] for x in DATA[exp] if x["timeStart"] is not None)
print(f"HW–DT 有時間窗: {late_timed} 筆")
empty_cmd = [f"{exp}#{x['no']}({x['emote']})" for exp in DATA for x in DATA[exp] if not x["emoteCmd"]]
print(f"emoteCmd 空（非標準 emote）: {empty_cmd}")
if warns:
    print(f"\n⚠️ {len(warns)} 警告:")
    for w in warns[:40]: print("  " + w)
else:
    print("\n✓ 無警告（zoneKey 全解析、HW–DT 地區交叉核對一致）")
