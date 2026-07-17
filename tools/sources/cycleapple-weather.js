/**
 * FFXIV Weather System
 * 天氣預測系統
 *
 * 天氣變化：每 8 艾歐澤亞小時 (現實 23 分 20 秒)
 * 天氣時段：00:00-07:59, 08:00-15:59, 16:00-23:59
 */

const Weather = (function() {
    // 天氣週期長度 (毫秒) - 8 艾歐澤亞小時
    const WEATHER_PERIOD = 1400000; // 23分20秒 = 1,400,000ms

    // 區域別名映射 (子區域 -> 主區域)
    const ZONE_ALIASES = {
        "Limsa Lominsa Upper Decks": "Limsa Lominsa",
        "Limsa Lominsa Lower Decks": "Limsa Lominsa",
        "Ul'dah - Steps of Nald": "Ul'dah",
        "Ul'dah - Steps of Thal": "Ul'dah",
        "Old Gridania": "Gridania",
        "New Gridania": "Gridania"
    };

    /**
     * 取得區域的主要名稱（用於天氣查詢）
     * @param {string} zone - 區域名稱
     * @returns {string} 主區域名稱
     */
    function getMainZone(zone) {
        return ZONE_ALIASES[zone] || zone;
    }

    // 天氣圖示 ID
    const WEATHER_ICONS = {
        'Clear Skies': 60201,
        'Fair Skies': 60202,
        'Clouds': 60203,
        'Fog': 60204,
        'Wind': 60205,
        'Gales': 60206,
        'Rain': 60207,
        'Showers': 60208,
        'Thunder': 60209,
        'Thunderstorms': 60210,
        'Dust Storms': 60211,
        'Heat Waves': 60212,
        'Snow': 60213,
        'Blizzards': 60214,
        'Gloom': 60215,
        'Auroras': 60216,
        'Darkness': 60217,
        'Umbral Wind': 60218,
        'Umbral Static': 60219,
        'Moon Dust': 60220,
        'Astromagnetic Storm': 60221,
        'Everlasting Light': 60222,
        'Termination': 60223
    };

    // 區域天氣機率表
    // 格式: [[機率上限, 天氣], ...]，機率累積計算
    const ZONE_WEATHER = {
        // 拉諾西亞
        "Limsa Lominsa": [
            [20, "Clouds"], [50, "Clear Skies"], [80, "Fair Skies"],
            [90, "Fog"], [100, "Rain"]
        ],
        "Middle La Noscea": [
            [20, "Clouds"], [50, "Clear Skies"], [70, "Fair Skies"],
            [80, "Wind"], [90, "Fog"], [100, "Rain"]
        ],
        "Lower La Noscea": [
            [20, "Clouds"], [50, "Clear Skies"], [70, "Fair Skies"],
            [80, "Wind"], [90, "Fog"], [100, "Rain"]
        ],
        "Eastern La Noscea": [
            [5, "Fog"], [50, "Clear Skies"], [80, "Fair Skies"],
            [90, "Clouds"], [95, "Rain"], [100, "Showers"]
        ],
        "Western La Noscea": [
            [10, "Fog"], [40, "Clear Skies"], [60, "Fair Skies"],
            [80, "Clouds"], [90, "Wind"], [100, "Gales"]
        ],
        "Upper La Noscea": [
            [30, "Clear Skies"], [50, "Fair Skies"], [70, "Clouds"],
            [80, "Fog"], [90, "Thunder"], [100, "Thunderstorms"]
        ],
        "Outer La Noscea": [
            [30, "Clear Skies"], [50, "Fair Skies"], [70, "Clouds"],
            [85, "Fog"], [100, "Rain"]
        ],
        "Mist": [
            [20, "Clouds"], [50, "Clear Skies"], [70, "Fair Skies"],
            [80, "Fog"], [90, "Rain"], [100, "Wind"]
        ],

        // 黑衣森林
        "Gridania": [
            [5, "Rain"], [20, "Rain"], [30, "Fog"],
            [40, "Clouds"], [55, "Fair Skies"], [85, "Clear Skies"],
            [100, "Fair Skies"]
        ],
        "Central Shroud": [
            [5, "Thunder"], [20, "Rain"], [30, "Fog"],
            [40, "Clouds"], [55, "Fair Skies"], [85, "Clear Skies"],
            [100, "Fair Skies"]
        ],
        "East Shroud": [
            [5, "Thunder"], [20, "Rain"], [30, "Fog"],
            [40, "Clouds"], [55, "Fair Skies"], [85, "Clear Skies"],
            [100, "Fair Skies"]
        ],
        "South Shroud": [
            [5, "Fog"], [10, "Thunderstorms"], [25, "Thunder"],
            [30, "Fog"], [40, "Clouds"], [70, "Fair Skies"],
            [100, "Clear Skies"]
        ],
        "North Shroud": [
            [5, "Fog"], [10, "Showers"], [25, "Rain"],
            [30, "Fog"], [40, "Clouds"], [70, "Fair Skies"],
            [100, "Clear Skies"]
        ],
        "The Lavender Beds": [
            [5, "Clouds"], [20, "Rain"], [30, "Fog"],
            [40, "Clouds"], [55, "Fair Skies"], [85, "Clear Skies"],
            [100, "Fair Skies"]
        ],

        // 薩納蘭
        "Ul'dah": [
            [40, "Clear Skies"], [60, "Fair Skies"], [85, "Clouds"],
            [95, "Fog"], [100, "Rain"]
        ],
        "Western Thanalan": [
            [40, "Clear Skies"], [60, "Fair Skies"], [85, "Clouds"],
            [95, "Fog"], [100, "Rain"]
        ],
        "Central Thanalan": [
            [15, "Dust Storms"], [55, "Clear Skies"], [75, "Fair Skies"],
            [85, "Clouds"], [95, "Fog"], [100, "Rain"]
        ],
        "Eastern Thanalan": [
            [40, "Clear Skies"], [60, "Fair Skies"], [70, "Clouds"],
            [80, "Fog"], [85, "Rain"], [100, "Showers"]
        ],
        "Southern Thanalan": [
            [20, "Heat Waves"], [60, "Clear Skies"], [80, "Fair Skies"],
            [90, "Clouds"], [100, "Fog"]
        ],
        "Northern Thanalan": [
            [5, "Clear Skies"], [20, "Fair Skies"], [50, "Clouds"],
            [100, "Fog"]
        ],
        "The Goblet": [
            [40, "Clear Skies"], [60, "Fair Skies"], [85, "Clouds"],
            [95, "Fog"], [100, "Rain"]
        ],

        // 摩杜納
        "Mor Dhona": [
            [15, "Clouds"], [30, "Fog"], [60, "Gloom"],
            [75, "Clear Skies"], [100, "Fair Skies"]
        ],

        // 庫爾札斯
        "Coerthas Central Highlands": [
            [20, "Blizzards"], [60, "Snow"], [70, "Fair Skies"],
            [75, "Clear Skies"], [90, "Clouds"], [100, "Fog"]
        ],
        "Coerthas Western Highlands": [
            [20, "Blizzards"], [60, "Snow"], [70, "Fair Skies"],
            [75, "Clear Skies"], [90, "Clouds"], [100, "Fog"]
        ],

        // 龍堡
        "Ishgard": [
            [60, "Snow"], [70, "Fair Skies"], [75, "Clear Skies"],
            [90, "Clouds"], [100, "Fog"]
        ],
        "The Sea of Clouds": [
            [30, "Clear Skies"], [60, "Fair Skies"], [70, "Clouds"],
            [80, "Fog"], [90, "Wind"], [100, "Umbral Wind"]
        ],
        "Azys Lla": [
            [35, "Fair Skies"], [70, "Clouds"], [100, "Thunder"]
        ],
        "The Dravanian Forelands": [
            [10, "Clouds"], [20, "Fog"], [30, "Thunder"],
            [40, "Dust Storms"], [70, "Clear Skies"], [100, "Fair Skies"]
        ],
        "The Dravanian Hinterlands": [
            [10, "Clouds"], [20, "Fog"], [30, "Rain"],
            [40, "Showers"], [70, "Clear Skies"], [100, "Fair Skies"]
        ],
        "The Churning Mists": [
            [10, "Clouds"], [20, "Gales"], [40, "Umbral Static"],
            [70, "Clear Skies"], [100, "Fair Skies"]
        ],
        "Idyllshire": [
            [10, "Clouds"], [20, "Fog"], [30, "Rain"],
            [40, "Showers"], [70, "Clear Skies"], [100, "Fair Skies"]
        ],

        // 阿拉米格
        "Rhalgr's Reach": [
            [15, "Clear Skies"], [60, "Fair Skies"], [80, "Clouds"],
            [90, "Fog"], [100, "Thunder"]
        ],
        "The Fringes": [
            [15, "Clear Skies"], [60, "Fair Skies"], [80, "Clouds"],
            [90, "Fog"], [100, "Thunder"]
        ],
        "The Peaks": [
            [10, "Clear Skies"], [60, "Fair Skies"], [75, "Clouds"],
            [85, "Fog"], [95, "Wind"], [100, "Dust Storms"]
        ],
        "The Lochs": [
            [20, "Clear Skies"], [60, "Fair Skies"], [80, "Clouds"],
            [90, "Fog"], [100, "Thunderstorms"]
        ],

        // 多瑪
        "Kugane": [
            [10, "Rain"], [20, "Fog"], [40, "Clouds"],
            [80, "Fair Skies"], [100, "Clear Skies"]
        ],
        "Shirogane": [
            [10, "Rain"], [20, "Fog"], [40, "Clouds"],
            [80, "Fair Skies"], [100, "Clear Skies"]
        ],
        "The Ruby Sea": [
            [10, "Thunder"], [20, "Wind"], [35, "Clouds"],
            [75, "Fair Skies"], [100, "Clear Skies"]
        ],
        "Yanxia": [
            [5, "Showers"], [15, "Rain"], [25, "Fog"],
            [40, "Clouds"], [80, "Fair Skies"], [100, "Clear Skies"]
        ],
        "The Azim Steppe": [
            [5, "Gales"], [10, "Wind"], [17, "Rain"],
            [25, "Fog"], [35, "Clouds"], [75, "Fair Skies"],
            [100, "Clear Skies"]
        ],

        // 水晶都/諾弗蘭特
        "The Crystarium": [
            [20, "Clear Skies"], [60, "Fair Skies"], [75, "Clouds"],
            [85, "Fog"], [95, "Rain"], [100, "Thunderstorms"]
        ],
        "Eulmore": [
            [10, "Gales"], [20, "Rain"], [30, "Fog"],
            [45, "Clouds"], [85, "Fair Skies"], [100, "Clear Skies"]
        ],
        "Lakeland": [
            [20, "Clear Skies"], [60, "Fair Skies"], [75, "Clouds"],
            [85, "Fog"], [95, "Rain"], [100, "Thunderstorms"]
        ],
        "Kholusia": [
            [10, "Gales"], [20, "Rain"], [30, "Fog"],
            [45, "Clouds"], [85, "Fair Skies"], [100, "Clear Skies"]
        ],
        "Amh Araeng": [
            [45, "Fair Skies"], [60, "Clouds"], [70, "Dust Storms"],
            [80, "Heat Waves"], [100, "Clear Skies"]
        ],
        "Il Mheg": [
            [10, "Rain"], [20, "Fog"], [35, "Clouds"],
            [70, "Fair Skies"], [100, "Clear Skies"]
        ],
        "The Rak'tika Greatwood": [
            [10, "Fog"], [20, "Rain"], [30, "Umbral Wind"],
            [45, "Clouds"], [85, "Fair Skies"], [100, "Clear Skies"]
        ],
        "The Tempest": [
            [20, "Clouds"], [80, "Fair Skies"], [100, "Clear Skies"]
        ],

        // 黃金鄉/艾爾庇斯
        "Old Sharlayan": [
            [10, "Clear Skies"], [50, "Fair Skies"], [70, "Clouds"],
            [85, "Fog"], [100, "Snow"]
        ],
        "Labyrinthos": [
            [15, "Clear Skies"], [60, "Fair Skies"], [85, "Clouds"],
            [100, "Rain"]
        ],
        "Thavnair": [
            [10, "Fog"], [20, "Rain"], [30, "Showers"],
            [45, "Clouds"], [80, "Fair Skies"], [100, "Clear Skies"]
        ],
        "Garlemald": [
            [15, "Snow"], [30, "Thunder"], [35, "Rain"],
            [50, "Fog"], [70, "Clouds"], [85, "Fair Skies"],
            [100, "Clear Skies"]
        ],
        "Mare Lamentorum": [
            [15, "Umbral Wind"], [30, "Moon Dust"],
            [60, "Fair Skies"], [100, "Clear Skies"]
        ],
        "Elpis": [
            [25, "Clouds"], [45, "Umbral Wind"], [60, "Umbral Static"],
            [80, "Fair Skies"], [100, "Clear Skies"]
        ],
        "Ultima Thule": [
            [10, "Astromagnetic Storm"], [25, "Umbral Wind"],
            [60, "Fair Skies"], [100, "Clear Skies"]
        ]
    };

    /**
     * 計算天氣種子值
     * @param {number} timestamp - Unix timestamp (秒)
     * @returns {number} 天氣種子值 (0-99)
     */
    function calculateWeatherSeed(timestamp) {
        // 計算艾歐澤亞時間
        const unixTime = Math.floor(timestamp);

        // 獲取 8 小時週期的基準時間
        const bell = Math.floor(unixTime / 175);
        const increment = (bell + 8 - (bell % 8)) % 24;

        // 計算天氣週期
        const totalDays = Math.floor(unixTime / 4200);

        // 使用雜湊函數計算種子
        const base = totalDays * 100 + increment;
        const step1 = ((base << 11) ^ base) >>> 0;
        const step2 = ((step1 >>> 8) ^ step1) >>> 0;

        return step2 % 100;
    }

    /**
     * 獲取指定區域的天氣
     * @param {string} zone - 區域名稱
     * @param {number} timestamp - Unix timestamp (秒)
     * @returns {string} 天氣名稱
     */
    function getWeatherForZone(zone, timestamp = Math.floor(Date.now() / 1000)) {
        const mainZone = getMainZone(zone);
        const weatherTable = ZONE_WEATHER[mainZone];
        if (!weatherTable) {
            return 'Unknown';
        }

        const seed = calculateWeatherSeed(timestamp);

        for (const [threshold, weather] of weatherTable) {
            if (seed < threshold) {
                return weather;
            }
        }

        return weatherTable[weatherTable.length - 1][1];
    }

    /**
     * 獲取天氣的本地化名稱
     * @param {string} weather - 英文天氣名稱
     * @returns {string} 本地化名稱
     */
    function getWeatherNameTC(weather) {
        return NamesTW.getWeatherName(weather);
    }

    /**
     * 獲取天氣圖示 URL
     * @param {string} weather - 天氣名稱
     * @returns {string} 圖示 URL
     */
    function getWeatherIconUrl(weather) {
        const iconId = WEATHER_ICONS[weather] || 60201;
        const folder = Math.floor(iconId / 1000) * 1000;
        return `https://xivapi.com/i/${folder.toString().padStart(6, '0')}/${iconId.toString().padStart(6, '0')}.png`;
    }

    /**
     * 預測未來天氣
     * @param {string} zone - 區域名稱
     * @param {number} count - 預測數量
     * @param {number} startTime - 起始時間 (Unix timestamp 秒)
     * @returns {Array} 天氣預測陣列
     */
    function forecastWeather(zone, count = 10, startTime = Math.floor(Date.now() / 1000)) {
        const forecast = [];
        const periodSeconds = 1400; // 23分20秒
        const mainZone = getMainZone(zone);

        // 對齊到當前天氣週期開始
        const currentPeriod = Math.floor(startTime / periodSeconds);
        let time = currentPeriod * periodSeconds;

        for (let i = 0; i < count; i++) {
            const weather = getWeatherForZone(mainZone, time);
            forecast.push({
                time: time * 1000, // 轉為毫秒
                weather: weather,
                weatherTC: getWeatherNameTC(weather),
                iconUrl: getWeatherIconUrl(weather)
            });
            time += periodSeconds;
        }

        return forecast;
    }

    /**
     * 尋找下一個符合條件的天氣
     * @param {string} zone - 區域名稱
     * @param {Array} targetWeathers - 目標天氣列表
     * @param {number} maxPeriods - 最大搜尋週期數
     * @returns {Object|null} 找到的天氣資訊或 null
     */
    function findNextWeather(zone, targetWeathers, maxPeriods = 100) {
        const periodSeconds = 1400;
        const now = Math.floor(Date.now() / 1000);
        const currentPeriod = Math.floor(now / periodSeconds);
        const mainZone = getMainZone(zone);

        for (let i = 0; i < maxPeriods; i++) {
            const time = (currentPeriod + i) * periodSeconds;
            const weather = getWeatherForZone(mainZone, time);

            if (targetWeathers.includes(weather)) {
                return {
                    time: time * 1000,
                    weather: weather,
                    weatherTC: getWeatherNameTC(weather),
                    periodsUntil: i,
                    msUntil: (time - now) * 1000
                };
            }
        }

        return null;
    }

    /**
     * 獲取所有可用區域列表
     * @returns {Array} 區域名稱列表
     */
    function getAvailableZones() {
        return Object.keys(ZONE_WEATHER);
    }

    // 公開 API
    return {
        WEATHER_ICONS,
        ZONE_WEATHER,
        ZONE_ALIASES,
        getMainZone,
        calculateWeatherSeed,
        getWeatherForZone,
        getWeatherNameTC,
        getWeatherIconUrl,
        forecastWeather,
        findNextWeather,
        getAvailableZones
    };
})();

// 如果在 Node.js 環境中，導出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Weather;
}
