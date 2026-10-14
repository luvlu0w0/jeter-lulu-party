import type {Guest} from './menu';
export function adjustSelection(old:Guest[],field:'drink'|'dessert',item:string,delta:number):Guest[]{
 if(old.length===1&&delta>0)return [{...old[0],[field]:item}];
 const values=old.map(g=>g[field]).filter(Boolean);
 if(delta>0&&values.length<old.length)values.push(item);
 if(delta<0){const i=values.indexOf(item);if(i>=0)values.splice(i,1)}
 return old.map((g,i)=>({...g,[field]:values[i]||''}));
}
