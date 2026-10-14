import type {Guest} from './menu';

type RSVP = {id:string; name:string; attendance:'yes'|'no'; guests:Guest[]; note:string};
type Receipt = {ok?:boolean; error?:string; version?:string; service?:string};

function pause(ms:number, signal:AbortSignal):Promise<void> {
  return new Promise((resolve,reject) => {
    const abort = () => {clearTimeout(timer);reject(new Error('aborted'));};
    const timer = setTimeout(() => {signal.removeEventListener('abort',abort);resolve();},ms);
    if (signal.aborted) abort();
    else signal.addEventListener('abort',abort,{once:true});
  });
}

async function readReceipt(response:Response):Promise<Receipt|null> {
  try {
    const value:unknown = JSON.parse(await response.text());
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Receipt;
  } catch { /* Google's redirect can temporarily return an HTML error page. */ }
  return null;
}

function isReceiptUrl(url:string):boolean {
  try {
    const target = new URL(url);
    return target.origin === 'https://script.googleusercontent.com' &&
      target.pathname === '/macros/echo' && !!target.searchParams.get('user_content_key');
  } catch {return false;}
}

function acceptReceipt(response:Response, receipt:Receipt|null):boolean {
  if (receipt?.ok === false) {
    if (receipt.error === '驗證失敗') throw new Error('報名串接尚在設定中，請稍後再試。');
    throw new Error(receipt.error || '送出失敗，請稍後重試。');
  }
  // The health-check GET also has ok:true. It is NOT a saved-registration receipt.
  return response.ok && receipt?.ok === true && receipt.version === 'github-rsvp-v1' && !receipt.service;
}

export async function submitRsvp(payload:RSVP):Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
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
    // Freeze the original payload across retries. Apps Script deduplicates its ID.
    const body = JSON.stringify(payload);
    for (let attempt=0; attempt<3; attempt++) {
      if (attempt) await pause(attempt*1500,controller.signal);
      let response:Response;
      try {
        // text/plain avoids an unsupported OPTIONS preflight. Never use no-cors.
        response = await fetch(endpoint.toString(), {
          method:'POST', credentials:'omit', redirect:'follow', signal:controller.signal,
          headers:{'Content-Type':'text/plain;charset=utf-8'}, body
        });
      } catch (error) {
        if (controller.signal.aborted) throw error;
        if (error instanceof TypeError) continue;
        throw error;
      }
      if (acceptReceipt(response,await readReceipt(response))) return;

      // Re-read only Google's trusted temporary response URL, without resending
      // personal data. It may become available shortly after the initial redirect.
      if (isReceiptUrl(response.url)) {
        await pause(1500,controller.signal);
        let retry:Response;
        try {
          retry = await fetch(response.url, {method:'GET',credentials:'omit',
            cache:'no-store',redirect:'follow',signal:controller.signal});
        } catch (error) {
          if (controller.signal.aborted) throw error;
          if (error instanceof TypeError) continue;
          throw error;
        }
        if (acceptReceipt(retry,await readReceipt(retry))) return;
      }
    }
    throw new Error('暫時無法確認是否儲存成功，請保留此頁再按一次送出；重試不會重複登記。');
  } catch (error) {
    if (controller.signal.aborted) throw new Error('尚未收到儲存確認，請再次送出；同一份回覆不會重複計算。');
    if (error instanceof TypeError) throw new Error('網路連線失敗，請檢查連線後再試一次。');
    throw error;
  } finally { clearTimeout(timer); }
}
