/**
 * Jeter & Lulu: public, append-only RSVP endpoint for GitHub Pages.
 * Replace the old Code.gs entirely, keep SPREADSHEET_ID in Script Properties,
 * then deploy a NEW VERSION: execute as Me, access Anyone.
 * This intentionally accepts anonymous registrations. It never exposes sheet
 * contents, spreadsheet IDs or credentials. WEBHOOK_SECRET is not used here.
 */
var RSVP_VERSION = 'github-rsvp-v1';
// MENU_DATA is generated from src/lib/menu.ts.
var ALLOWED_DRINKS = ["紫薯拿鐵","甜菜根拿鐵","芒果拿鐵","藍莓拿鐵","草莓拿鐵","酪梨拿鐵","榴槤拿鐵","橙木樨","芒果肉桂","旺來接骨木","百里桃蘋","紅心芭梅","真椰美式","Red Bull 巨峰蘆美式","芙塔美式","芙塔拿鐵","卡布奇諾（熱）","摩卡摩卡","西西里咖啡","風味拿鐵・香草","風味拿鐵・焦糖","風味拿鐵・榛果","風味拿鐵・黑糖","熱情香芒","仲夏野莓","翡翠綜合","蘋香火龍果綜合","綠果昔","酪梨香蕉牛奶","人氣草莓牛奶","芙香蘋果茶","山竹瑪黛果茶","木槿野莓果茶","黑米國寶茶","甘菊薰花茶","黑糖鴛鴦歐蕾","可可果歐蕾","抹抹茶歐蕾","紫薯歐蕾","紫薯抹抹","蜂蜜香柚冰茶","綜合莓果伯爵冰茶","綜合水果冰茶","百香盛夏冰茶","灰皮諾白葡萄酒","茉樂蘇維濃白葡萄酒","蒙特普奇諾紅葡萄酒","卡多諾紅葡萄酒","費麗莎紅葡萄酒","海尼根生啤酒","吉姆老爹經典啤酒","吉姆老爹島嶼百香艾爾","吉姆老爹香草琥珀艾爾","不用飲料"];
var ALLOWED_DESSERTS = ["原味可朗芙","楓糖脆餅奶蓋可朗芙","提拉米蘇可朗芙","檸檬海鹽可朗芙","香蕉巧克力奶蓋可朗芙","不用甜點"];

function doGet() {
  return jsonReply_({ok:true, service:'Jeter & Lulu RSVP', version:RSVP_VERSION});
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var raw = e && e.postData && e.postData.contents;
    if (typeof raw !== 'string' || raw.length > 20000) {
      return jsonReply_({ok:false, error:'表單內容不完整，請重新確認。'});
    }
    var data;
    try { data = JSON.parse(raw); }
    catch (ignored) { return jsonReply_({ok:false, error:'表單格式不正確。'}); }
    var problem = validateRsvp_(data);
    if (problem) return jsonReply_({ok:false, error:problem});
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) return jsonReply_({ok:false, error:'報名接收端尚未設定完成，請聯絡主辦人。'});
    if (!lock.tryLock(10000)) return jsonReply_({ok:false, error:'目前送出人數較多，請稍後再試。'});

    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheetByName('派對報名') || spreadsheet.insertSheet('派對報名');
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['回覆ID','接收時間','名字','出席選項','參加人數','飲品選擇','甜點選擇']);
      sheet.setFrozenRows(1);
    }
    if (sheet.getRange(1, 1).getValue() !== '回覆ID') {
      return jsonReply_({ok:false, error:'報名資料表欄位不符，請聯絡主辦人。'});
    }
    // Lock + persistent UUID lookup makes retries safe, even after a timeout.
    if (sheet.getLastRow() > 1) {
      var existing = sheet.getRange(2, 1, sheet.getLastRow()-1, 1)
        .createTextFinder(data.id).matchEntireCell(true).useRegularExpression(false).findNext();
      if (existing) return jsonReply_({ok:true, version:RSVP_VERSION});
    }
    var attending = data.attendance === 'yes';
    var guests = attending ? data.guests : [];
    var attendance = !attending ? '不克前往' : guests.length > 1
      ? '我會參加，攜伴 ' + (guests.length-1) + ' 位' : '我會參加，個人前往';
    sheet.appendRow([
      data.id,
      Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'),
      textCell_(data.name.trim()), attendance, guests.length,
      textCell_(summarize_(guests, 'drink')), textCell_(summarize_(guests, 'dessert'))
    ]);
    SpreadsheetApp.flush();
    return jsonReply_({ok:true, version:RSVP_VERSION});
  } catch (error) {
    // Do not return Google errors containing sheet identifiers to visitors.
    console.error('RSVP write failed');
    return jsonReply_({ok:false, error:'暫時無法儲存，請稍後重試或聯絡主辦人。'});
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function validateRsvp_(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      typeof data.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id))
    return '回覆識別碼不正確，請重新整理網頁後再試。';
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 60)
    return '請填寫 1～60 字的姓名。';
  if (['yes','no'].indexOf(data.attendance) < 0 || !Array.isArray(data.guests))
    return '請確認出席選項與人數。';
  if (data.attendance === 'no') return data.guests.length === 0 ? '' : '不出席者不需填寫餐點。';
  if (data.guests.length < 1 || data.guests.length > 20) return '參加人數需為 1～20 人。';
  for (var i=0; i<data.guests.length; i++) {
    var guest = data.guests[i];
    if (!guest || ALLOWED_DRINKS.indexOf(guest.drink) < 0 || ALLOWED_DESSERTS.indexOf(guest.dessert) < 0)
      return '請為每位參加者選好一份飲品與甜點，也可選擇不用飲料或不用甜點。';
  }
  return '';
}

function summarize_(guests, field) {
  var counts = new Map();
  guests.forEach(function(g) { counts.set(g[field], (counts.get(g[field]) || 0) + 1); });
  return Array.from(counts, function(entry) { return entry[0] + ' × ' + entry[1]; }).join('、');
}
function textCell_(value) {
  var text = String(value || '');
  return /^\s*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
}
function jsonReply_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
