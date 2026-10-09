# B4 地圖排除規則核對

日期：2026-10-09。只處理原 B4 的 dungeon／housing 承接疑問，不改設計或 runtime code。

- 原 `tools/build_zones.py:172-178` 先排除 `dungeon`／`housing`，`resolve()` 再用 `_valid()` 收 `^[a-z]\d[ft]\d$` 主場景圖碼。
- 現行舊輸入 `C:/FFXIVProject/data/item_dict/lspl/maps.json` 的實際 bytes SHA-256：`84968cd002cbb6c1ea4f0fd4f5073a7a53593be216d9ad1ecec8835e104a4231`（bash `sha256sum` 實跑）。
- read JSON query：`{total:(keys|length),flagged:([to_entries[]|select(.value.dungeon or .value.housing)]|length),flagged_field_town:([to_entries[]|select(.value.dungeon or .value.housing)|select((.value.image // "")|test("/[a-z][0-9][ft][0-9]/"))]|length)}`。
- 實際輸出：`{"total":1267,"flagged":10,"flagged_field_town":0}`。另以同一條件輸出候選明細，實際為 `[]`。

對目前輸入，任何 dungeon／housing flagged map 都不會通過現有 f／t 主場景正則；先做 flags 過濾對最小 map ID 候選集合沒有影響。新流程從 native `Map.Id` 的第一段取同一圖碼、組相同 v2 URL，沿用這個正則；不用把非 native 的社群 flags 混進同版 snapshot，亦不需為不存在的候選擴解兩張 Territory sheet。

界線：這是現行資料的等價證據，不承諾未來任意 client 改變圖碼分類仍等價。本輪 pinned native 生成後，另逐欄對帳全部 zone image／sf 與 340 筆，任何無法解釋的地圖差異不接受。未來 native layout／資料基線改變必須重新核對；本文不充當未來版本證據。
