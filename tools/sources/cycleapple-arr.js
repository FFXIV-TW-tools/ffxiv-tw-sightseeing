/**
 * FFXIV Sightseeing Log Data
 * 探索筆記資料
 *
 * 資料來源：
 * - 時間/座標/天氣：https://github.com/AnnAngela/FFXIVSightseeingGuide
 * - 繁體中文名稱：https://github.com/miaki3457/ffxiv-datamining-tc
 * - 英文名稱：https://github.com/xivapi/ffxiv-datamining
 *
 * 時間格式：HHMM (例如 800 = 08:00, 1200 = 12:00)
 * 天氣：英文名稱，對應 weather.js 中的定義
 */

const SightseeingData = (function() {
    'use strict';

    // 天氣對照表 (英文 -> 繁中)
    const weatherNames = {
        "Clear Skies": "碧空",
        "Fair Skies": "晴朗",
        "Clouds": "陰雲",
        "Fog": "薄霧",
        "Wind": "微風",
        "Gales": "強風",
        "Rain": "小雨",
        "Showers": "暴雨",
        "Thunder": "打雷",
        "Thunderstorms": "雷雨",
        "Dust Storms": "揚沙",
        "Heat Waves": "熱浪",
        "Snow": "小雪",
        "Blizzards": "暴雪",
        "Gloom": "妖霧"
    };

    // 表情對照表 (英文 -> 繁中)
    const emoteNames = {
        "lookout": "張望",
        "pray": "祈禱",
        "sit": "坐下",
        "salute": "敬禮",
        "point": "指向",
        "psych": "激勵",
        "doze": "打盹",
        "kneel": "下跪",
        "comfort": "安慰"
    };

    // 區域對照表 (英文 -> 繁中)
    const regionNames = {
        "Limsa Lominsa": "利姆薩·羅敏薩",
        "Limsa Lominsa Upper Decks": "利姆薩·羅敏薩上層甲板",
        "Limsa Lominsa Lower Decks": "利姆薩·羅敏薩下層甲板",
        "Middle La Noscea": "中拉諾西亞",
        "Lower La Noscea": "拉諾西亞低地",
        "Eastern La Noscea": "東拉諾西亞",
        "Western La Noscea": "西拉諾西亞",
        "Upper La Noscea": "拉諾西亞高地",
        "Outer La Noscea": "拉諾西亞外地",
        "Gridania": "格里達尼亞",
        "New Gridania": "格里達尼亞新街",
        "Old Gridania": "格里達尼亞舊街",
        "Central Shroud": "黑衣森林中央林區",
        "East Shroud": "黑衣森林東部林區",
        "South Shroud": "黑衣森林南部林區",
        "North Shroud": "黑衣森林北部林區",
        "Ul'dah": "烏爾達哈",
        "Ul'dah - Steps of Nald": "烏爾達哈現世回廊",
        "Ul'dah - Steps of Thal": "烏爾達哈來生回廊",
        "Western Thanalan": "西薩納蘭",
        "Central Thanalan": "中薩納蘭",
        "Eastern Thanalan": "東薩納蘭",
        "Southern Thanalan": "南薩納蘭",
        "Northern Thanalan": "北薩納蘭",
        "Coerthas Central Highlands": "庫爾札斯中央高地",
        "Mor Dhona": "摩杜納"
    };

    // 探索筆記資料 (編號 1-80: 新生時代 ARR)
    // 資料來源：AnnAngela/FFXIVSightseeingGuide + miaki3457/ffxiv-datamining-tc
    const logs = [
        // === 新生時代 探索筆記 001-020 ===
        {
            id: 1,
            adventureId: 2162688,
            name: "梭魚碼頭",
            region: "Limsa Lominsa Upper Decks",
            location: "利姆薩·羅敏薩上層甲板",
            x: 9.7,
            y: 7.7,
            time: { start: 800, end: 1200 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 2,
            adventureId: 2162689,
            name: "阿斯塔利西亞號海盜船",
            region: "Limsa Lominsa Lower Decks",
            location: "利姆薩·羅敏薩下層甲板",
            x: 7,
            y: 15.1,
            time: { start: 1800, end: 500 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 3,
            adventureId: 2162690,
            name: "海詞石窟的紀念碑",
            region: "Middle La Noscea",
            location: "中拉諾西亞",
            x: 20,
            y: 19,
            time: { start: 500, end: 800 },
            weather: ["Rain", "Showers"],
            emote: "pray",
            expansion: "arr"
        },
        {
            id: 4,
            adventureId: 2162691,
            name: "天梯",
            region: "Middle La Noscea",
            location: "中拉諾西亞",
            x: 16,
            y: 17,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 5,
            adventureId: 2162692,
            name: "拉撒格蘭東路",
            region: "Middle La Noscea",
            location: "中拉諾西亞",
            x: 25.3,
            y: 27.5,
            time: { start: 800, end: 1200 },
            weather: ["Clouds"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 6,
            adventureId: 2162693,
            name: "砂鹽海岸",
            region: "Lower La Noscea",
            location: "拉諾西亞低地",
            x: 23,
            y: 40,
            time: { start: 1800, end: 500 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 7,
            adventureId: 2162694,
            name: "赤血雄雞農場的田地",
            region: "Lower La Noscea",
            location: "拉諾西亞低地",
            x: 33,
            y: 19,
            time: { start: 500, end: 800 },
            weather: ["Fog"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 8,
            adventureId: 2162695,
            name: "釀酒師燈塔",
            region: "Western La Noscea",
            location: "西拉諾西亞",
            x: 29.9,
            y: 30.7,
            time: { start: 500, end: 800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 9,
            adventureId: 2162696,
            name: "皮革師行會",
            region: "Old Gridania",
            location: "格里達尼亞舊街",
            x: 12,
            y: 8,
            time: { start: 1200, end: 1700 },
            weather: ["Clouds"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 10,
            adventureId: 2162697,
            name: "碧企鵝瀑布",
            region: "Old Gridania",
            location: "格里達尼亞舊街",
            x: 10,
            y: 6,
            time: { start: 1800, end: 500 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 11,
            adventureId: 2162698,
            name: "彎枝牧場",
            region: "Central Shroud",
            location: "黑衣森林中央林區",
            x: 21.8,
            y: 21.8,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "sit",
            expansion: "arr"
        },
        {
            id: 12,
            adventureId: 2162699,
            name: "十二神大聖堂",
            region: "East Shroud",
            location: "黑衣森林東部林區",
            x: 17,
            y: 18,
            time: { start: 800, end: 1200 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "pray",
            expansion: "arr"
        },
        {
            id: 13,
            adventureId: 2162700,
            name: "風精靈暫留地",
            region: "East Shroud",
            location: "黑衣森林東部林區",
            x: 22,
            y: 26,
            time: { start: 1800, end: 500 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 14,
            adventureId: 2162701,
            name: "御道",
            region: "Ul'dah - Steps of Thal",
            location: "烏爾達哈來生回廊",
            x: 11,
            y: 11,
            time: { start: 500, end: 800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "salute",
            expansion: "arr"
        },
        {
            id: 15,
            adventureId: 2162702,
            name: "黃金廣場",
            region: "Ul'dah - Steps of Thal",
            location: "烏爾達哈來生回廊",
            x: 11,
            y: 11,
            time: { start: 1200, end: 1700 },
            weather: ["Clouds"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 16,
            adventureId: 2162703,
            name: "貿易城邦烏爾達哈",
            region: "Western Thanalan",
            location: "西薩納蘭",
            x: 22,
            y: 22,
            time: { start: 1800, end: 500 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 17,
            adventureId: 2162704,
            name: "希拉狄哈遺跡",
            region: "Central Thanalan",
            location: "中薩納蘭",
            x: 15,
            y: 22,
            time: { start: 800, end: 1200 },
            weather: ["Fog"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 18,
            adventureId: 2162705,
            name: "古卜的遺骸",
            region: "Eastern Thanalan",
            location: "東薩納蘭",
            x: 19,
            y: 24,
            time: { start: 1700, end: 1800 },
            weather: ["Rain", "Showers"],
            emote: "comfort",
            expansion: "arr"
        },
        {
            id: 19,
            adventureId: 2162706,
            name: "消逝王都",
            region: "Eastern Thanalan",
            location: "東薩納蘭",
            x: 14,
            y: 18,
            time: { start: 800, end: 1200 },
            weather: ["Clouds"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 20,
            adventureId: 2162707,
            name: "跨天橋",
            region: "Eastern Thanalan",
            location: "東薩納蘭",
            x: 21,
            y: 20.8,
            time: { start: 500, end: 800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "pray",
            expansion: "arr"
        },

        // === 新生時代 探索筆記 021-040 ===
        {
            id: 21,
            adventureId: 2162708,
            name: "輕聲谷",
            region: "Middle La Noscea",
            location: "中拉諾西亞",
            x: 20,
            y: 13,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 22,
            adventureId: 2162709,
            name: "盛夏農莊",
            region: "Middle La Noscea",
            location: "中拉諾西亞",
            x: 25,
            y: 17,
            time: { start: 500, end: 800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 23,
            adventureId: 2162710,
            name: "灰艦風車群",
            region: "Lower La Noscea",
            location: "拉諾西亞低地",
            x: 31,
            y: 12,
            time: { start: 1200, end: 1700 },
            weather: ["Rain", "Showers"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 24,
            adventureId: 2162711,
            name: "隱密瀑布",
            region: "Eastern La Noscea",
            location: "東拉諾西亞",
            x: 32,
            y: 23,
            time: { start: 800, end: 1200 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "sit",
            expansion: "arr"
        },
        {
            id: 25,
            adventureId: 2162712,
            name: "白鷗塔",
            region: "Eastern La Noscea",
            location: "東拉諾西亞",
            x: 29,
            y: 33,
            time: { start: 1800, end: 500 },
            weather: ["Rain", "Showers"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 26,
            adventureId: 2162713,
            name: "小麥酒港的利姆萊茵像",
            region: "Western La Noscea",
            location: "西拉諾西亞",
            x: 26,
            y: 26,
            time: { start: 1700, end: 1800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "pray",
            expansion: "arr"
        },
        {
            id: 27,
            adventureId: 2162714,
            name: "船舶墓場",
            region: "Western La Noscea",
            location: "西拉諾西亞",
            x: 17,
            y: 36,
            time: { start: 1800, end: 500 },
            weather: ["Gales"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 28,
            adventureId: 2162715,
            name: "骷髏谷營地",
            region: "Western La Noscea",
            location: "西拉諾西亞",
            x: 22,
            y: 22,
            time: { start: 800, end: 1200 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 29,
            adventureId: 2162716,
            name: "南北防波堤",
            region: "Western La Noscea",
            location: "西拉諾西亞",
            x: 19,
            y: 23,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 30,
            adventureId: 2162717,
            name: "石綠湖營地",
            region: "Upper La Noscea",
            location: "拉諾西亞高地",
            x: 30,
            y: 22,
            time: { start: 1700, end: 1800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 31,
            adventureId: 2162718,
            name: "撒拉奧斯的遺骸",
            region: "Upper La Noscea",
            location: "拉諾西亞高地",
            x: 12,
            y: 22,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 32,
            adventureId: 2162719,
            name: "吉吉盧恩交易商店",
            region: "Upper La Noscea",
            location: "拉諾西亞高地",
            x: 29,
            y: 25,
            time: { start: 1800, end: 500 },
            weather: ["Thunderstorms"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 33,
            adventureId: 2162720,
            name: "尼姆浮游遺跡",
            region: "Outer La Noscea",
            location: "拉諾西亞外地",
            x: 12,
            y: 15,
            time: { start: 1800, end: 500 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 34,
            adventureId: 2162721,
            name: "瞭望陣營地",
            region: "Outer La Noscea",
            location: "拉諾西亞外地",
            x: 17,
            y: 16,
            time: { start: 500, end: 800 },
            weather: ["Clouds"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 35,
            adventureId: 2162722,
            name: "武伽瑪羅武裝礦山",
            region: "Outer La Noscea",
            location: "拉諾西亞外地",
            x: 23,
            y: 11,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 36,
            adventureId: 2162723,
            name: "隱者庵",
            region: "Outer La Noscea",
            location: "拉諾西亞外地",
            x: 15,
            y: 10,
            time: { start: 1800, end: 500 },
            weather: ["Rain", "Showers"],
            emote: "sit",
            expansion: "arr"
        },
        {
            id: 37,
            adventureId: 2162724,
            name: "魔女咖啡館和大水車",
            region: "New Gridania",
            location: "格里達尼亞新街",
            x: 14,
            y: 14,
            time: { start: 800, end: 1200 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 38,
            adventureId: 2162725,
            name: "槍術士行會",
            region: "Old Gridania",
            location: "格里達尼亞舊街",
            x: 14,
            y: 5,
            time: { start: 500, end: 800 },
            weather: ["Rain", "Showers"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 39,
            adventureId: 2162726,
            name: "烤餅練兵所",
            region: "Central Shroud",
            location: "黑衣森林中央林區",
            x: 23,
            y: 19,
            time: { start: 500, end: 800 },
            weather: ["Rain", "Showers"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 40,
            adventureId: 2162727,
            name: "靜語莊園",
            region: "Central Shroud",
            location: "黑衣森林中央林區",
            x: 13,
            y: 23,
            time: { start: 1800, end: 500 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },

        // === 新生時代 探索筆記 041-060 ===
        {
            id: 41,
            adventureId: 2162728,
            name: "長老樹",
            region: "Central Shroud",
            location: "黑衣森林中央林區",
            x: 16,
            y: 22,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 42,
            adventureId: 2162729,
            name: "虹橋瀑布",
            region: "Central Shroud",
            location: "黑衣森林中央林區",
            x: 26,
            y: 18,
            time: { start: 1100, end: 1400 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 43,
            adventureId: 2162730,
            name: "搖籃樹",
            region: "East Shroud",
            location: "黑衣森林東部林區",
            x: 21,
            y: 10,
            time: { start: 1800, end: 500 },
            weather: ["Thunder"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 44,
            adventureId: 2162731,
            name: "巴斯卡隆酒家",
            region: "South Shroud",
            location: "黑衣森林南部林區",
            x: 17,
            y: 20,
            time: { start: 800, end: 1200 },
            weather: ["Thunderstorms"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 45,
            adventureId: 2162732,
            name: "森南飛艇坪",
            region: "South Shroud",
            location: "黑衣森林南部林區",
            x: 14,
            y: 33,
            time: { start: 800, end: 1200 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 46,
            adventureId: 2162733,
            name: "兀爾德恩惠地",
            region: "South Shroud",
            location: "黑衣森林南部林區",
            x: 33,
            y: 23,
            time: { start: 1200, end: 1700 },
            weather: ["Fog"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 47,
            adventureId: 2162734,
            name: "石場水車",
            region: "South Shroud",
            location: "黑衣森林南部林區",
            x: 25,
            y: 21,
            time: { start: 500, end: 800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 48,
            adventureId: 2162735,
            name: "鳥人軍採伐所",
            region: "North Shroud",
            location: "黑衣森林北部林區",
            x: 18,
            y: 19,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 49,
            adventureId: 2162736,
            name: "隕石背陰地",
            region: "North Shroud",
            location: "黑衣森林北部林區",
            x: 15,
            y: 32,
            time: { start: 1800, end: 500 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 50,
            adventureId: 2162737,
            name: "榿木泉",
            region: "North Shroud",
            location: "黑衣森林北部林區",
            x: 15,
            y: 27,
            time: { start: 800, end: 1200 },
            weather: ["Clouds"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 51,
            adventureId: 2162738,
            name: "帝國海上基地",
            region: "Western Thanalan",
            location: "西薩納蘭",
            x: 8,
            y: 5,
            time: { start: 1700, end: 1800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 52,
            adventureId: 2162739,
            name: "黃昏灣的羅羅力特像",
            region: "Western Thanalan",
            location: "西薩納蘭",
            x: 12,
            y: 14,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "point",
            expansion: "arr"
        },
        {
            id: 53,
            adventureId: 2162740,
            name: "黑塵驛站",
            region: "Central Thanalan",
            location: "中薩納蘭",
            x: 21,
            y: 17,
            time: { start: 1800, end: 500 },
            weather: ["Dust Storms"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 54,
            adventureId: 2162741,
            name: "納爾之門",
            region: "Central Thanalan",
            location: "中薩納蘭",
            x: 18,
            y: 26,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "sit",
            expansion: "arr"
        },
        {
            id: 55,
            adventureId: 2162742,
            name: "火牆",
            region: "Eastern Thanalan",
            location: "東薩納蘭",
            x: 30,
            y: 26,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 56,
            adventureId: 2162743,
            name: "黃金市集",
            region: "Eastern Thanalan",
            location: "東薩納蘭",
            x: 10,
            y: 16,
            time: { start: 800, end: 1200 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 57,
            adventureId: 2162744,
            name: "札爾神祠",
            region: "Eastern Thanalan",
            location: "東薩納蘭",
            x: 25,
            y: 14,
            time: { start: 1800, end: 500 },
            weather: ["Showers"],
            emote: "pray",
            expansion: "arr"
        },
        {
            id: 58,
            adventureId: 2162745,
            name: "納爾神祠",
            region: "Southern Thanalan",
            location: "南薩納蘭",
            x: 12,
            y: 22,
            time: { start: 500, end: 800 },
            weather: ["Fog"],
            emote: "pray",
            expansion: "arr"
        },
        {
            id: 59,
            adventureId: 2162746,
            name: "不悔戰陣",
            region: "Southern Thanalan",
            location: "南薩納蘭",
            x: 19,
            y: 20,
            time: { start: 500, end: 800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 60,
            adventureId: 2162747,
            name: "工藝神擊",
            region: "Southern Thanalan",
            location: "南薩納蘭",
            x: 21,
            y: 38,
            time: { start: 1200, end: 1700 },
            weather: ["Heat Waves"],
            emote: "lookout",
            expansion: "arr"
        },

        // === 新生時代 探索筆記 061-080 ===
        {
            id: 61,
            adventureId: 2162748,
            name: "喀恩埋沒聖堂",
            region: "Southern Thanalan",
            location: "南薩納蘭",
            x: 23,
            y: 11,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 62,
            adventureId: 2162749,
            name: "米諾陶洛斯里程",
            region: "Southern Thanalan",
            location: "南薩納蘭",
            x: 14,
            y: 26,
            time: { start: 500, end: 800 },
            weather: ["Heat Waves"],
            emote: "psych",
            expansion: "arr"
        },
        {
            id: 63,
            adventureId: 2162750,
            name: "東側監視塔",
            region: "Northern Thanalan",
            location: "北薩納蘭",
            x: 22,
            y: 26,
            time: { start: 500, end: 800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "salute",
            expansion: "arr"
        },
        {
            id: 64,
            adventureId: 2162751,
            name: "青磷水輸送管",
            region: "Northern Thanalan",
            location: "北薩納蘭",
            x: 20,
            y: 29,
            time: { start: 1800, end: 500 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 65,
            adventureId: 2162752,
            name: "藍霧",
            region: "Northern Thanalan",
            location: "北薩納蘭",
            x: 20,
            y: 22,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 66,
            adventureId: 2162753,
            name: "勞班緩衝地",
            region: "Northern Thanalan",
            location: "北薩納蘭",
            x: 19,
            y: 17,
            time: { start: 800, end: 1200 },
            weather: ["Clouds"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 67,
            adventureId: 2162754,
            name: "艾瑪姬娜秘銀廢礦",
            region: "Northern Thanalan",
            location: "北薩納蘭",
            x: 26,
            y: 22,
            time: { start: 1800, end: 500 },
            weather: ["Fog"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 68,
            adventureId: 2162755,
            name: "劍峰",
            region: "Coerthas Central Highlands",
            location: "庫爾札斯中央高地",
            x: 25,
            y: 29,
            time: { start: 1700, end: 1800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 69,
            adventureId: 2162756,
            name: "阿德內爾占星台",
            region: "Coerthas Central Highlands",
            location: "庫爾札斯中央高地",
            x: 25,
            y: 29,
            time: { start: 1800, end: 500 },
            weather: ["Fog"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 70,
            adventureId: 2162757,
            name: "龍族遺骸",
            region: "Coerthas Central Highlands",
            location: "庫爾札斯中央高地",
            x: 11,
            y: 15,
            time: { start: 800, end: 1200 },
            weather: ["Snow", "Blizzards"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 71,
            adventureId: 2162758,
            name: "皇都伊修加爾德",
            region: "Coerthas Central Highlands",
            location: "庫爾札斯中央高地",
            x: 12,
            y: 17,
            time: { start: 500, end: 800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 72,
            adventureId: 2162759,
            name: "巨石丘",
            region: "Coerthas Central Highlands",
            location: "庫爾札斯中央高地",
            x: 7,
            y: 28,
            time: { start: 1700, end: 1800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 73,
            adventureId: 2162760,
            name: "戰爭神秘石",
            region: "Coerthas Central Highlands",
            location: "庫爾札斯中央高地",
            x: 7,
            y: 31,
            time: { start: 1800, end: 500 },
            weather: ["Snow", "Blizzards"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 74,
            adventureId: 2162761,
            name: "披雪大冰壁",
            region: "Coerthas Central Highlands",
            location: "庫爾札斯中央高地",
            x: 2,
            y: 21,
            time: { start: 800, end: 1200 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 75,
            adventureId: 2162762,
            name: "巨龍首營地",
            region: "Coerthas Central Highlands",
            location: "庫爾札斯中央高地",
            x: 26,
            y: 17,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 76,
            adventureId: 2162763,
            name: "鋼衛塔",
            region: "Coerthas Central Highlands",
            location: "庫爾札斯中央高地",
            x: 28,
            y: 10,
            time: { start: 500, end: 800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 77,
            adventureId: 2162764,
            name: "帝國中央堡",
            region: "Mor Dhona",
            location: "摩杜納",
            x: 9,
            y: 13,
            time: { start: 1200, end: 1700 },
            weather: ["Gloom"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 78,
            adventureId: 2162765,
            name: "水晶塔",
            region: "Mor Dhona",
            location: "摩杜納",
            x: 27,
            y: 8,
            time: { start: 1800, end: 500 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 79,
            adventureId: 2162766,
            name: "早霜頂",
            region: "Mor Dhona",
            location: "摩杜納",
            x: 18,
            y: 17,
            time: { start: 1200, end: 1700 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "lookout",
            expansion: "arr"
        },
        {
            id: 80,
            adventureId: 2162767,
            name: "密約之塔",
            region: "Mor Dhona",
            location: "摩杜納",
            x: 26,
            y: 11,
            time: { start: 1700, end: 1800 },
            weather: ["Clear Skies", "Fair Skies"],
            emote: "sit",
            expansion: "arr"
        }
    ];

    /**
     * 獲取探索筆記名稱
     * @param {Object} log - 探索筆記物件
     * @returns {string}
     */
    function getLogName(log) {
        return log.name || `探索筆記 #${log.id}`;
    }

    /**
     * 獲取區域名稱（繁中）
     * @param {string} region - 英文區域名稱
     * @returns {string}
     */
    function getRegionNameTC(region) {
        return regionNames[region] || region;
    }

    /**
     * 獲取天氣名稱（繁中）
     * @param {string} weather - 英文天氣名稱
     * @returns {string}
     */
    function getWeatherNameTC(weather) {
        return weatherNames[weather] || weather;
    }

    /**
     * 獲取表情名稱（繁中）
     * @param {string} emote - 英文表情指令
     * @returns {string}
     */
    function getEmoteNameTC(emote) {
        return emoteNames[emote] || emote;
    }

    /**
     * 獲取表情指令
     * @param {string} emote - 英文表情指令
     * @returns {string}
     */
    function getEmoteCommand(emote) {
        return `/${emote}`;
    }

    /**
     * 獲取所有探索筆記
     * @returns {Array}
     */
    function getAll() {
        return logs;
    }

    /**
     * 依 ID 獲取探索筆記
     * @param {number} id
     * @returns {Object|null}
     */
    function getById(id) {
        return logs.find(log => log.id === id) || null;
    }

    /**
     * 依版本獲取探索筆記
     * @param {string} expansion - arr, hw, sb, shb, ew, dt
     * @returns {Array}
     */
    function getByExpansion(expansion) {
        return logs.filter(log => log.expansion === expansion);
    }

    /**
     * 依區域獲取探索筆記
     * @param {string} region
     * @returns {Array}
     */
    function getByRegion(region) {
        return logs.filter(log => log.region === region);
    }

    /**
     * 獲取所有區域列表
     * @returns {Array}
     */
    function getAllRegions() {
        const regions = [...new Set(logs.map(log => log.region))];
        return regions.sort();
    }

    // 公開 API
    return {
        logs,
        weatherNames,
        emoteNames,
        regionNames,
        getLogName,
        getRegionNameTC,
        getWeatherNameTC,
        getEmoteNameTC,
        getEmoteCommand,
        getAll,
        getById,
        getByExpansion,
        getByRegion,
        getAllRegions
    };
})();

// 如果在 Node.js 環境中，導出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SightseeingData;
}
