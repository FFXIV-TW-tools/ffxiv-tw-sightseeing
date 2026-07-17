/**
 * Eorzea Time Calculator
 * 艾歐澤亞時間計算模組
 *
 * 時間換算：
 * - 1 艾歐澤亞日 = 70 分鐘現實時間
 * - 1 艾歐澤亞小時 = 175 秒現實時間
 * - 倍率 = 3600/175 = 20.571428...
 */

const EorzeaTime = (function() {
    // 艾歐澤亞時間倍率 (1 艾歐澤亞秒 = 1/20.571428 現實秒)
    const EORZEA_MULTIPLIER = 3600 / 175;

    // 一個艾歐澤亞日的毫秒數 (70 分鐘)
    const MS_PER_EORZEA_DAY = 70 * 60 * 1000;

    // 一個艾歐澤亞小時的毫秒數 (175 秒)
    const MS_PER_EORZEA_HOUR = 175 * 1000;

    // 天氣週期長度 (8 艾歐澤亞小時 = 23分20秒)
    const WEATHER_PERIOD_MS = 8 * MS_PER_EORZEA_HOUR;

    /**
     * 取得當前艾歐澤亞時間
     * @param {number} timestamp - Unix timestamp (毫秒), 預設為當前時間
     * @returns {Object} 包含小時、分鐘、秒的物件
     */
    function getCurrentEorzeaTime(timestamp = Date.now()) {
        // 計算艾歐澤亞毫秒
        const eorzeaMs = timestamp * EORZEA_MULTIPLIER;

        // 計算當天已過的毫秒數
        const dayMs = eorzeaMs % (24 * 60 * 60 * 1000);

        const hours = Math.floor(dayMs / (60 * 60 * 1000)) % 24;
        const minutes = Math.floor(dayMs / (60 * 1000)) % 60;
        const seconds = Math.floor(dayMs / 1000) % 60;

        return { hours, minutes, seconds };
    }

    /**
     * 格式化艾歐澤亞時間為字串
     * @param {Object} time - 時間物件
     * @param {boolean} showSeconds - 是否顯示秒
     * @returns {string} 格式化的時間字串
     */
    function formatTime(time, showSeconds = false) {
        const h = time.hours.toString().padStart(2, '0');
        const m = time.minutes.toString().padStart(2, '0');

        if (showSeconds) {
            const s = time.seconds.toString().padStart(2, '0');
            return `${h}:${m}:${s}`;
        }

        return `${h}:${m}`;
    }

    /**
     * 取得當前天氣週期索引
     * 天氣在 00:00, 08:00, 16:00 變化 (艾歐澤亞時間)
     * @param {number} timestamp - Unix timestamp (毫秒)
     * @returns {number} 天氣週期索引 (0-2)
     */
    function getWeatherPeriod(timestamp = Date.now()) {
        const time = getCurrentEorzeaTime(timestamp);
        return Math.floor(time.hours / 8);
    }

    /**
     * 取得當前天氣時段名稱
     * @param {number} timestamp - Unix timestamp
     * @returns {string} 時段名稱
     */
    function getWeatherPeriodName(timestamp = Date.now()) {
        const period = getWeatherPeriod(timestamp);
        const names = ['00:00-07:59', '08:00-15:59', '16:00-23:59'];
        return names[period];
    }

    /**
     * 計算到下一個天氣變化的剩餘時間
     * @param {number} timestamp - Unix timestamp (毫秒)
     * @returns {Object} 包含毫秒數和格式化字串
     */
    function getTimeUntilNextWeather(timestamp = Date.now()) {
        const time = getCurrentEorzeaTime(timestamp);

        // 計算當前時段已經過的艾歐澤亞小時數
        const hoursInPeriod = time.hours % 8;
        const minutesInPeriod = time.minutes;
        const secondsInPeriod = time.seconds;

        // 計算剩餘的艾歐澤亞時間
        const remainingHours = 7 - hoursInPeriod;
        const remainingMinutes = 59 - minutesInPeriod;
        const remainingSeconds = 59 - secondsInPeriod;

        // 轉換為現實時間毫秒
        const remainingEorzeaMs = (remainingHours * 60 * 60 + remainingMinutes * 60 + remainingSeconds) * 1000;
        const remainingRealMs = remainingEorzeaMs / EORZEA_MULTIPLIER;

        // 格式化為 MM:SS
        const totalRealSeconds = Math.floor(remainingRealMs / 1000);
        const realMinutes = Math.floor(totalRealSeconds / 60);
        const realSeconds = totalRealSeconds % 60;

        return {
            ms: remainingRealMs,
            formatted: `${realMinutes.toString().padStart(2, '0')}:${realSeconds.toString().padStart(2, '0')}`
        };
    }

    /**
     * 檢查指定的艾歐澤亞時間是否在指定範圍內
     * @param {number} currentHour - 當前艾歐澤亞小時 (0-23)
     * @param {number} startTime - 開始時間 (格式: 800 表示 8:00)
     * @param {number} endTime - 結束時間 (格式: 1200 表示 12:00)
     * @returns {boolean} 是否在範圍內
     */
    function isTimeInRange(currentHour, startTime, endTime) {
        // 轉換為小時
        const startHour = Math.floor(startTime / 100);
        const endHour = Math.floor(endTime / 100);
        const currentMinute = getCurrentEorzeaTime().minutes;
        const currentTimeValue = currentHour * 100 + currentMinute;

        // 處理跨越午夜的情況
        if (startTime > endTime) {
            // 例如 18:00 - 05:00
            return currentTimeValue >= startTime || currentTimeValue <= endTime;
        } else {
            return currentTimeValue >= startTime && currentTimeValue <= endTime;
        }
    }

    /**
     * 計算從當前時間到指定時間範圍的等待時間
     * @param {number} startTime - 開始時間 (格式: 800)
     * @param {number} endTime - 結束時間 (格式: 1200)
     * @param {number} timestamp - 當前 Unix timestamp
     * @returns {Object} 包含等待毫秒數和是否正在進行
     */
    function getTimeUntilRange(startTime, endTime, timestamp = Date.now()) {
        const time = getCurrentEorzeaTime(timestamp);
        const currentTimeValue = time.hours * 100 + time.minutes;

        // 檢查是否在範圍內
        let inRange = false;
        if (startTime > endTime) {
            inRange = currentTimeValue >= startTime || currentTimeValue <= endTime;
        } else {
            inRange = currentTimeValue >= startTime && currentTimeValue <= endTime;
        }

        if (inRange) {
            return { waitMs: 0, inRange: true };
        }

        // 計算等待時間
        const startHour = Math.floor(startTime / 100);
        const startMinute = startTime % 100;

        let hoursUntil, minutesUntil;

        if (currentTimeValue < startTime) {
            // 今天稍後
            hoursUntil = startHour - time.hours;
            minutesUntil = startMinute - time.minutes;
        } else {
            // 明天
            hoursUntil = 24 - time.hours + startHour;
            minutesUntil = startMinute - time.minutes;
        }

        if (minutesUntil < 0) {
            hoursUntil--;
            minutesUntil += 60;
        }

        // 轉換為現實時間毫秒
        const waitEorzeaMs = (hoursUntil * 60 + minutesUntil) * 60 * 1000;
        const waitRealMs = waitEorzeaMs / EORZEA_MULTIPLIER;

        return { waitMs: waitRealMs, inRange: false };
    }

    /**
     * 格式化等待時間
     * @param {number} ms - 毫秒數
     * @returns {string} 格式化字串
     */
    function formatWaitTime(ms) {
        // 安全檢查
        if (ms === null || ms === undefined || isNaN(ms)) {
            return '計算中...';
        }

        if (ms <= 0) return '現在';

        // 如果超過 24 小時，顯示特殊文字
        if (ms > 24 * 60 * 60 * 1000) {
            return '> 24 小時';
        }

        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // 公開 API
    return {
        EORZEA_MULTIPLIER,
        MS_PER_EORZEA_DAY,
        MS_PER_EORZEA_HOUR,
        WEATHER_PERIOD_MS,
        getCurrentEorzeaTime,
        formatTime,
        getWeatherPeriod,
        getWeatherPeriodName,
        getTimeUntilNextWeather,
        isTimeInRange,
        getTimeUntilRange,
        formatWaitTime
    };
})();

// 如果在 Node.js 環境中，導出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EorzeaTime;
}
