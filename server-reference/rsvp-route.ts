import {env} from 'cloudflare:workers';
import {getDb} from '../../../db';
import {responses} from '../../../db/schema';
import {allDrinks,desserts} from '../../../lib/menu';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'請從邀請網站送出。'},{status:403});
 try{const b=await req.json() as any;
 if(typeof b.id!=='string'||! /^[a-f0-9-]{36}$/i.test(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>60||!['yes','no'].includes(b.attendance)||!Array.isArray(b.guests)||b.guests.length>20||typeof b.note!=='string'||b.note.length>1000) return Response.json({error:'請確認姓名與報名資料。'},{status:400});
 if(b.attendance==='yes'&&(b.guests.length<1||b.guests.some((g:any)=>typeof g.name!=='string'||!g.name.trim()||g.name.length>60||!allDrinks.includes(g.drink)||!desserts.includes(g.dessert))))return Response.json({error:'請完成每位賓客的姓名、飲料與甜點。'},{status:400});
 await getDb().insert(responses).values({id:b.id,name:b.name.trim(),attendance:b.attendance,guests:JSON.stringify(b.attendance==='yes'?b.guests:[]),note:b.note,createdAt:new Date().toISOString()}).onConflictDoNothing();
 const config=env as unknown as Record<string,string>;
 let synced=false;
 if(config.GAS_WEBHOOK_URL&&config.GAS_WEBHOOK_SECRET){try{const url=new URL(config.GAS_WEBHOOK_URL);if(url.protocol==='https:'&&url.hostname==='script.google.com'&&url.pathname.startsWith('/macros/s/')){const r=await fetch(url.toString(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...b,guests:b.attendance==='yes'?b.guests:[],secret:config.GAS_WEBHOOK_SECRET}),signal:AbortSignal.timeout(8000)});const data=await r.json() as {ok?:boolean};synced=!!data.ok}}catch{}}
 return Response.json({ok:true,synced});
 }catch{return Response.json({error:'暫時無法儲存，請稍後重試；你的選擇仍保留在頁面。'},{status:500});}}
