import type {Guest} from './menu';

type RSVP = {id:string; name:string; attendance:'yes'|'no'; guests:Guest[]; note:string};

export async function submitRsvp(payload:RSVP):Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const configResponse = await fetch('./config.json', {cache:'no-store', signal:controller.signal});
    if (!configResponse.ok) throw new Error('報名設定暫時無法載入，請稍後重試。');
    const config = await configResponse.json() as {apiUrl?:string};
    if (!config.apiUrl) throw new Error('報名功能正在準備中，請稍後再試。');
    const endpoint = new URL(config.apiUrl);
    if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'script.google.com' ||
        !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint.pathname)) {
      throw new Error('報名設定有誤，請聯絡主辦人。');
    }
    // A simple CORS request avoids an OPTIONS preflight unsupported by Apps Script.
    // Keep the readable response: no-cors cannot confirm that a row was saved.
    const response = await fetch(endpoint.toString(), {
      method:'POST', credentials:'omit', redirect:'follow', signal:controller.signal,
      headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload)
    });
    let result:{ok?:boolean; error?:string};
    try { result = await response.json(); }
    catch { throw new Error('接收程式未正確回應，請稍後再試或聯絡主辦人。'); }
    if (result.error === '驗證失敗') throw new Error('報名串接尚在設定中，請稍後再試。');
    if (!response.ok || result.ok !== true) throw new Error(result.error || '送出失敗，請稍後重試。');
  } catch (error) {
    if (controller.signal.aborted) throw new Error('尚未收到儲存確認，請再次送出；同一份回覆不會重複計算。');
    if (error instanceof TypeError) throw new Error('網路連線失敗，請檢查連線後再試一次。');
    throw error;
  } finally { clearTimeout(timer); }
}
