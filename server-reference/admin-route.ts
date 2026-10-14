import {env} from 'cloudflare:workers';
import {getDb} from '../../../db';
import {responses} from '../../../db/schema';
import {desc} from 'drizzle-orm';
export async function GET(req:Request){
 const secret=(env as unknown as Record<string,string>).ADMIN_KEY;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'管理密碼不正確。'},{status:401});
 const rows=await getDb().select().from(responses).orderBy(desc(responses.createdAt));
 return Response.json(rows.map(r=>({...r,guests:JSON.parse(r.guests)})),{headers:{'Cache-Control':'no-store'}});
}
