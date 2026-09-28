import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatUnfinishedList } from '../modules/ss_list.js';

test('待探索清單沿可見排序、排除完成、只列實有時間與天氣門檻', () => {
  const list = [
    { completed: false, zone: { tc: '拉札漢' }, entry: { no: 21, name: '晨間點位', zoneKey: 'a', x: 12.4, y: 8.1, timeStart: 5, timeEnd: 8, weathers: ['clear', 'rain'], emoteCmd: 'lookout' } },
    { completed: true, zone: { tc: '拉札漢' }, entry: { no: 22, name: '已完成', x: 1, y: 2 } },
    { completed: false, zone: { tc: '舊薩雷安' }, entry: { no: 3, name: '無條件點位', x: 7, y: 9, timeStart: null, timeEnd: null, weathers: [], emoteCmd: 'sit' } },
  ];
  assert.equal(formatUnfinishedList(list, key => ({ clear: '晴朗', rain: '小雨' })[key]),
    'No.021 晨間點位｜拉札漢 X:12.4 Y:8.1｜ET 05:00–08:00｜天氣 晴朗／小雨｜/lookout\nNo.003 無條件點位｜舊薩雷安 X:7 Y:9｜/sit');
  assert.equal(formatUnfinishedList(list.filter(item => item.completed), key => key), '');
  assert.equal(formatUnfinishedList([{ completed: false, zone: { tc: '舊薩雷安' }, entry: { no: 5, name: '無門檻', x: 3, y: 4, timeStart: '', timeEnd: '', weathers: [], emoteCmd: ' ' } }], key => key),
    'No.005 無門檻｜舊薩雷安 X:3 Y:4');
});
