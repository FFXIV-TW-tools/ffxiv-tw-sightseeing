# -*- coding: utf-8 -*-
"""
build_zones.py — 建 data/zones.js（探索筆記 zone metadata 權威）

輸入（本地遊戲資料，繁中服正名鐵則）：
  - data/item_dict/datamining_tc/tc_PlaceName.csv  (placename_id -> 繁中 Name)
  - data/item_dict/lspl/maps.json                  (mapId -> placename_id, image, size_factor)

輸出：
  - data/zones.js        window.SIGHTSEEING_ZONES = { zoneKey: {tc, image, sf, weatherZone, exp} }
  - tmp/zone-mapping.md  給 grok 的「來源 zone 值 -> zoneKey」對照表
  - stdout: 覆蓋率報告（未解析的 zone 標紅，需人工繁中校對）

zoneKey 粒度＝map 正確層級（limsa 上/下層甲板分開）。
weatherZone＝cycleapple weather.js ZONE_WEATHER 的英文 key（ARR gating 用；HW-DT 為資訊性）。
"""
import csv, json, sys, io, os

HERE = os.path.dirname(os.path.abspath(__file__))            # tools/
REPO = os.path.dirname(HERE)                                 # repo root
ROOT = os.path.abspath(os.path.join(REPO, "..", ".."))       # monorepo root（需 monorepo context 才有遊戲資料）
OUT_JS = os.path.join(REPO, "data", "zones.js")
OUT_MAP = os.path.join(HERE, "zone-mapping.md")

# ---- 1. 載 tc_PlaceName: 繁中name -> placename_id（正向）+ id->name ----
pn_by_name = {}   # 繁中name -> [id, ...]（同名多 id：城市/子區都可能重名，全收）
pn_by_id = {}     # id -> 繁中name
with open(f"{ROOT}/data/item_dict/datamining_tc/tc_PlaceName.csv", encoding="utf-8") as f:
    r = csv.reader(f)
    rows = list(r)
# header 3 行：#/offset 等；資料從第 4 行起，col0=key(id), col1=Name
for row in rows[3:]:
    if len(row) < 2:
        continue
    try:
        pid = int(row[0])
    except ValueError:
        continue
    name = row[1].strip()
    if name:
        pn_by_id[pid] = name
        pn_by_name.setdefault(name, []).append(pid)

# ---- 2. 載 maps.json: placename_id -> 最佳 map（image, sf）----
with open(f"{ROOT}/data/item_dict/lspl/maps.json", encoding="utf-8") as f:
    maps = json.load(f)

# placename_id -> list of map dicts（過濾掉 default / dungeon / housing）
maps_by_pid = {}
for mid, m in maps.items():
    if m.get("dungeon") or m.get("housing"):
        continue
    img = m.get("image") or ""
    if not img or "default" in img:
        continue
    pid = m.get("placename_id")
    maps_by_pid.setdefault(pid, []).append(m)

import re
_CODE_RE = re.compile(r"^[a-z]\d[ft]\d$")  # 主場景圖：第3碼 f=field / t=town；排除 e=事件圖 / region / default

def _code(m):
    img = m.get("image") or ""
    return img.split("/m/")[1].split("/")[0] if "/m/" in img else ""

def _valid(m):
    """只收主場景圖（field/town）；排除事件圖(f1e6)/region 概覽/default/空。"""
    return bool(_CODE_RE.match(_code(m)))

def resolve(tc_name):
    """繁中 zone 名 -> (image, sf, placename_id) 或 None。
    跨同名全 pid 收集合法主場景圖，取 map id 最小（＝基準圖，非放大子圖）。"""
    pids = pn_by_name.get(tc_name) or []
    cands = []
    for pid in pids:
        for m in (maps_by_pid.get(pid) or []):
            if _valid(m):
                cands.append((pid, m))
    if not cands:
        return None
    pid, m = sorted(cands, key=lambda pm: pm[1].get("id", 0))[0]
    return (m["image"], m.get("size_factor", 100), pid)

# ---- 3. Zone 主表（zoneKey, 繁中name, weatherZone(英), exp, 來源 zone 值）----
# tc = 對 tc_PlaceName 校過的繁中服正名（若與 babelin/cycleapple 不同，以官方為準）
# src_arr = cycleapple region(英文) / babelin arr slug ; src_late = babelin 繁中 zone
ZONES = [
    # === ARR（cycleapple region 英文 → 繁中；weatherZone 英文 gating）===
    ("limsa_upper", "利姆薩·羅敏薩上層甲板", "Limsa Lominsa", "arr", ["Limsa Lominsa Upper Decks"], ["limsa"]),
    ("limsa_lower", "利姆薩·羅敏薩下層甲板", "Limsa Lominsa", "arr", ["Limsa Lominsa Lower Decks"], []),
    ("middle_la",   "中拉諾西亞",         "Middle La Noscea", "arr", ["Middle La Noscea"], ["middle_la"]),
    ("lower_la",    "拉諾西亞低地",       "Lower La Noscea", "arr", ["Lower La Noscea"], ["lower_la"]),
    ("eastern_la",  "東拉諾西亞",         "Eastern La Noscea", "arr", ["Eastern La Noscea"], ["eastern_la"]),
    ("western_la",  "西拉諾西亞",         "Western La Noscea", "arr", ["Western La Noscea"], ["western_la"]),
    ("upper_la",    "拉諾西亞高地",       "Upper La Noscea", "arr", ["Upper La Noscea"], ["upper_la"]),
    ("outer_la",    "拉諾西亞外地",       "Outer La Noscea", "arr", ["Outer La Noscea"], ["outer_la"]),
    ("new_gridania","格里達尼亞新街",     "Gridania", "arr", ["New Gridania"], []),
    ("old_gridania","格里達尼亞舊街",     "Gridania", "arr", ["Old Gridania"], ["gridania"]),
    ("central_shroud","黑衣森林中央林區", "Central Shroud", "arr", ["Central Shroud"], ["central_shroud"]),
    ("east_shroud", "黑衣森林東部林區",   "East Shroud", "arr", ["East Shroud"], ["east_shroud"]),
    ("south_shroud","黑衣森林南部林區",   "South Shroud", "arr", ["South Shroud"], ["south_shroud"]),
    ("north_shroud","黑衣森林北部林區",   "North Shroud", "arr", ["North Shroud"], ["north_shroud"]),
    ("uldah_thal",  "烏爾達哈來生回廊",   "Ul'dah", "arr", ["Ul'dah - Steps of Thal"], ["uldah"]),
    ("western_thanalan","西薩納蘭",       "Western Thanalan", "arr", ["Western Thanalan"], ["western_thanalan"]),
    ("central_thanalan","中薩納蘭",       "Central Thanalan", "arr", ["Central Thanalan"], ["central_thanalan"]),
    ("eastern_thanalan","東薩納蘭",       "Eastern Thanalan", "arr", ["Eastern Thanalan"], ["eastern_thanalan"]),
    ("southern_thanalan","南薩納蘭",      "Southern Thanalan", "arr", ["Southern Thanalan"], ["southern_thanalan"]),
    ("northern_thanalan","北薩納蘭",      "Northern Thanalan", "arr", ["Northern Thanalan"], ["northern_thanalan"]),
    ("coerthas_central","庫爾札斯中央高地","Coerthas Central Highlands", "arr", ["Coerthas Central Highlands"], ["coerthas_central"]),
    ("mor_dhona",   "摩杜納",             "Mor Dhona", "arr", ["Mor Dhona"], ["mor_dhona"]),

    # === HW（babelin 繁中 zone → weatherZone 英文）===
    ("coerthas_west","庫爾札斯西部高地",  "Coerthas Western Highlands", "hw", [], ["庫爾札斯西部高地"]),
    ("dravania_forelands","德拉瓦尼亞山麓地","The Dravanian Forelands", "hw", [], ["德拉瓦尼亞山麓地"]),
    ("dravania_hinterlands","德拉瓦尼亞河谷地","The Dravanian Hinterlands", "hw", [], ["德拉瓦尼亞河谷地"]),
    ("churning_mists","德拉瓦尼亞雲海",   "The Churning Mists", "hw", [], ["德拉瓦尼亞雲海"]),
    ("sea_of_clouds","阿巴拉提亞雲海",    "The Sea of Clouds", "hw", [], ["阿巴拉提亞雲海"]),
    ("azys_lla",    "魔大陸阿濟茲拉",     "Azys Lla", "hw", [], ["魔大陸阿濟茲拉"]),

    # === SB ===
    ("fringes",     "基拉巴尼亞邊區",     "The Fringes", "sb", [], ["基拉巴尼亞邊區"]),
    ("peaks",       "基拉巴尼亞山區",     "The Peaks", "sb", [], ["基拉巴尼亞山區"]),
    ("lochs",       "基拉巴尼亞湖區",     "The Lochs", "sb", [], ["基拉巴尼亞湖區"]),
    ("ruby_sea",    "紅玉海",             "The Ruby Sea", "sb", [], ["紅玉海"]),
    ("yanxia",      "延夏",               "Yanxia", "sb", [], ["延夏"]),
    ("azim_steppe", "太陽神草原",         "The Azim Steppe", "sb", [], ["太陽神草原"]),
    ("kugane",      "黃金港",             "Kugane", "sb", [], ["黃金港"]),
    ("gyr_reach",   "神拳痕",             "Rhalgr's Reach", "sb", [], ["神拳痕"]),

    # === ShB ===
    ("crystarium",  "水晶都",             "The Crystarium", "shb", [], ["水晶都"]),
    ("eulmore",     "遊末邦",             "Eulmore", "shb", [], ["遊末邦"]),
    ("lakeland",    "雷克蘭德",           "Lakeland", "shb", [], ["雷克蘭德"]),
    ("kholusia",    "珂露西亞島",         "Kholusia", "shb", [], ["珂露西亞島"]),
    ("amh_araeng",  "安穆·艾蘭",          "Amh Araeng", "shb", [], ["安穆·艾蘭"]),
    ("il_mheg",     "伊爾美格",           "Il Mheg", "shb", [], ["伊爾美格"]),
    ("raktika",     "拉凱提卡大森林",     "The Rak'tika Greatwood", "shb", [], ["拉凱提卡大森林"]),
    ("tempest",     "黑風海",             "The Tempest", "shb", [], ["黑風海"]),

    # === EW ===
    ("old_sharlayan","舊薩雷安",          "Old Sharlayan", "ew", [], ["舊薩雷安"]),
    ("radz_at_han", "拉札漢",             "Radz-at-Han", "ew", [], ["拉札罕", "拉札漢"]),
    ("labyrinthos", "迷津",               "Labyrinthos", "ew", [], ["迷津"]),
    ("thavnair",    "薩維奈島",           "Thavnair", "ew", [], ["薩維奈島"]),
    ("garlemald",   "加雷馬",             "Garlemald", "ew", [], ["加雷馬"]),
    ("mare_lamentorum","嘆息海",          "Mare Lamentorum", "ew", [], ["嘆息海"]),
    ("elpis",       "厄爾庇斯",           "Elpis", "ew", [], ["厄爾庇斯"]),
    ("ultima_thule","天外天垓",           "Ultima Thule", "ew", [], ["天外天垓"]),

    # === DT（weatherZone 暫無 cycleapple 表；資訊性天氣先留空）===
    ("tuliyollal",  "圖萊尤拉",           "", "dt", [], ["圖萊尤拉"]),
    ("solution_nine","九號解決方案",      "", "dt", [], ["九號解決方案"]),
    ("urqopacha",   "奧闊帕恰山",         "", "dt", [], ["奧闊帕恰山"]),
    ("kozamauka",   "克扎瑪烏卡濕地",     "", "dt", [], ["克札瑪烏卡濕地", "克扎瑪烏卡濕地"]),
    ("yak_tel",     "亞克特爾樹海",       "", "dt", [], ["亞克特爾樹海"]),
    ("shaaloani",   "夏勞尼荒野",         "", "dt", [], ["夏勞尼荒野"]),
    ("heritage_found","遺產之地",         "", "dt", [], ["遺產之地"]),
    ("living_memory","憶想之地",          "", "dt", [], ["憶想之地"]),
]

out = {}
mapping_rows = []
unresolved = []
for zoneKey, tc, weatherZone, exp, src_arr, src_late in ZONES:
    r = resolve(tc)
    if r is None:
        unresolved.append((zoneKey, tc))
        image, sf, pid = "", 100, None
    else:
        image, sf, pid = r
    out[zoneKey] = {"tc": tc, "image": image, "sf": sf, "weatherZone": weatherZone, "exp": exp}
    for s in src_arr:
        mapping_rows.append((exp, f"cycleapple region: {s}", zoneKey))
    for s in src_late:
        mapping_rows.append((exp, f"babelin zone: {s}", zoneKey))

# ---- 4. 寫 zones.js ----
os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)
with open(OUT_JS, "w", encoding="utf-8") as f:
    f.write("/**\n")
    f.write(" * zones.js — 探索筆記 zone metadata（AUTO-GEN by tools/build_zones.py，勿手改）\n")
    f.write(" * tc=繁中服正名(tc_PlaceName) · image/sf=xivapi 底圖(maps.json) · weatherZone=cycleapple weather.js key\n")
    f.write(" */\n")
    f.write("window.SIGHTSEEING_ZONES = ")
    f.write(json.dumps(out, ensure_ascii=False, indent=2))
    f.write(";\n")

# ---- 5. 寫 zone-mapping.md（給 grok）----
with open(OUT_MAP, "w", encoding="utf-8") as f:
    f.write("# 來源 zone 值 → zoneKey 對照（grok 用）\n\n")
    f.write("| exp | 來源 zone 值 | zoneKey |\n|---|---|---|\n")
    for exp, src, zk in mapping_rows:
        f.write(f"| {exp} | {src} | `{zk}` |\n")

# ---- 6. 報告 ----
print(f"zones total: {len(out)}")
resolved = sum(1 for z in out.values() if z['image'])
print(f"resolved map image: {resolved}/{len(out)}")
if unresolved:
    print("\n⚠️ UNRESOLVED（繁中名對不上 tc_PlaceName，需人工校對）:")
    for zk, tc in unresolved:
        print(f"   {zk}: {tc}")
else:
    print("✓ all zones resolved")
