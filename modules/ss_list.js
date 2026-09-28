// 清單只使用目前結果的既有順序與繁中資料，不重算可進行狀態。
export function formatTimeWindow(entry) {
  const hour = value => String(Math.floor(Number(value) < 24 ? Number(value) : Number(value) / 100)).padStart(2, '0') + ':00';
  return `${hour(entry.timeStart)}–${hour(entry.timeEnd)}`;
}

export function formatUnfinishedList(items, weatherName) {
  return items.filter(item => !item.completed).map(({ entry, zone }) => {
    const number = String(entry.no).padStart(3, '0');
    const name = String(entry.name || '').trim();
    const place = `${zone.tc || entry.zoneKey || '未知地區'} X:${entry.x} Y:${entry.y}`;
    const fields = [`No.${number} ${name}`, place];
    if (entry.timeStart != null && entry.timeEnd != null && entry.timeStart !== '' && entry.timeEnd !== '') {
      fields.push(`ET ${formatTimeWindow(entry)}`);
    }
    const weathers = Array.isArray(entry.weathers) ? entry.weathers.filter(Boolean) : [];
    if (weathers.length) fields.push('天氣 ' + weathers.map(weatherName).join('／'));
    const command = String(entry.emoteCmd || '').trim();
    if (command) fields.push('/' + command);
    return fields.join('｜');
  }).join('\n');
}
