import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {submitRsvp} from '../src/lib/submit-rsvp.ts';
const script=fs.readFileSync(new URL('../integration/Google-Apps-Script.gs',import.meta.url),'utf8');
const id='00000000-0000-4000-8000-000000000001';
const guest={name:'測試',drink:'紫薯拿鐵',dessert:'不用甜點'};
const payload={id,name:'測試',attendance:'yes',guests:[guest,guest],note:''};
function backend(){
 const rows=[];let locked=false;let fail=false;
 const sheet={getLastRow:()=>rows.length,appendRow:row=>rows.push(row),setFrozenRows:()=>{},getRange:()=>({getValue:()=>rows[0][0],createTextFinder:id=>({matchEntireCell(){return this},useRegularExpression(){return this},findNext:()=>rows.slice(1).some(row=>row[0]===id)})})};
 const context=vm.createContext({console,LockService:{getScriptLock:()=>({tryLock:()=>locked=true,hasLock:()=>locked,releaseLock:()=>locked=false})},PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'mock-id'})},SpreadsheetApp:{openById:()=>{if(fail)throw Error('private detail');return {getSheetByName:()=>sheet}},flush:()=>{}},Utilities:{formatDate:()=> '2026-10-15 08:00:00'},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}});
 vm.runInContext(script,context);
 return {rows,post:data=>context.doPost({postData:{contents:JSON.stringify(data)}}),raw:raw=>context.doPost({postData:{contents:raw}}),lock:()=>locked,fail:()=>fail=true};
}
test('aggregates drink/dessert counts; duplicate retry does not append; lock released',()=>{const b=backend();assert.equal(b.post(payload).ok,true);assert.equal(b.rows.length,2);assert.equal(b.rows[1][4],2);assert.equal(b.rows[1][5],'紫薯拿鐵 × 2');assert.equal(b.rows[1][6],'不用甜點 × 2');assert.equal(b.post(payload).ok,true);assert.equal(b.rows.length,2);assert.equal(b.lock(),false)});
test('declined attendance saves zero guests and no meals',()=>{const b=backend();assert.equal(b.post({...payload,attendance:'no',guests:[]}).ok,true);assert.equal(b.rows[1][3],'不克前往');assert.equal(b.rows[1][4],0);assert.equal(b.rows[1][5],'')});
test('invalid input and malformed JSON never write rows',()=>{for(const data of [{},null,{...payload,name:' '},{...payload,guests:[]},{...payload,guests:Array(21).fill(guest)},{...payload,guests:[{...guest,drink:'invalid'}]},{...payload,attendance:'no'}]){const b=backend();assert.equal(b.post(data).ok,false);assert.equal(b.rows.length,0)}assert.equal(backend().raw('{').ok,false)});
test('formula-like names are escaped; backend errors cannot claim success',()=>{const b=backend();b.post({...payload,name:'=IMPORTXML("x")'});assert.equal(b.rows[1][2][0],"'");const c=backend();c.fail();assert.equal(c.post(payload).ok,false);assert.equal(c.rows.length,0);assert.equal(c.lock(),false)});
test('front-end reads confirmation and sends text/plain without credentials',async()=>{const old=globalThis.fetch;const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(calls.length===1?{apiUrl:'https://script.google.com/macros/s/test/exec'}:{ok:true}))};try{await submitRsvp(payload);assert.equal(calls[1].options.headers['Content-Type'],'text/plain;charset=utf-8');assert.equal(calls[1].options.credentials,'omit');assert.deepEqual(JSON.parse(calls[1].options.body),payload);assert.notEqual(calls[1].options.mode,'no-cors')}finally{globalThis.fetch=old}});
test('front-end rejects old secret-required handler, non-JSON and missing confirmation',async()=>{const old=globalThis.fetch;try{for(const result of [{ok:false,error:'驗證失敗'},{ok:false,error:'寫入失敗'},{},'<html>login</html>']){let count=0;globalThis.fetch=async()=>new Response(++count===1?JSON.stringify({apiUrl:'https://script.google.com/macros/s/test/exec'}):typeof result==='string'?result:JSON.stringify(result));await assert.rejects(submitRsvp(payload))}}finally{globalThis.fetch=old}});
