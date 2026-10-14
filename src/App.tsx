'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {drinks,desserts,Guest} from './lib/menu';
import {adjustSelection} from './lib/selection';
import {saveInvitationImage} from './lib/save-image';
import {submitRsvp} from './lib/submit-rsvp';
const at=(x:number,y:number,w:number,h:number):CSSProperties=>({left:`${(x-80)/350*100}%`,top:`${(y-18)/480*100}%`,width:`${w/350*100}%`,height:`${h/480*100}%`});
const invitationAssets={art:'./assets/invitation.svg',foreground:'./assets/invitation-foreground.svg',ultrasound:'./assets/ultrasound.gif',countdown:'./assets/countdown.webp'};
const desktopBackgroundAssets={curtain:'./assets/desktop-bg-1.png',wood:'./assets/desktop-bg-2.png'};
type AssetKey=keyof typeof invitationAssets|keyof typeof desktopBackgroundAssets;
const mobileP1At=(x:number,y:number,w:number,h:number):CSSProperties=>({left:`${(82.19474171910925+x*1.819716581018073)/1024.5*100}%`,top:`${(610.4954606748177+y*1.819716581018073)/3164.25*100}%`,width:`${w*1.819716581018073/1024.5*100}%`,height:`${h*1.819716581018073/3164.25*100}%`});
const coords=[[[130,238,20.2],[236,238,20.2]],[[130,238,20.2],[251,238,20.2]],[[130,229,20],[251,229,20],[130,354,20]],[[130,229,20],[259,229,20],[131,315,20]]];
export default function Home(){
 const [entered,setEntered]=useState(false),[ready,setReady]=useState(false),[loaded,setLoaded]=useState(false),[entryFailed,setEntryFailed]=useState(false),[playing,setPlaying]=useState(false),[musicError,setMusicError]=useState(false);
 const [open,setOpen]=useState(false),[page,setPage]=useState(0),[name,setName]=useState(''),[attendance,setAttendance]=useState(''),[companions,setCompanions]=useState(1),[guests,setGuests]=useState<Guest[]>([]),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(''),[remaining,setRemaining]=useState([0,0,0,0]);
 const entryImage=useRef<HTMLImageElement>(null),entryCover=useRef<HTMLButtonElement>(null);
 const audio=useRef<HTMLAudioElement>(null),id=useRef(''),art=useRef<HTMLDivElement>(null),pearl=useRef<HTMLSpanElement>(null),dialog=useRef<HTMLDivElement>(null),lastFocus=useRef<HTMLElement|null>(null),submitting=useRef(false);
 const eventImage=useRef<File|null>(null),saveView=useRef<HTMLDivElement>(null);
 const [savingImage,setSavingImage]=useState(false),[showSaveImage,setShowSaveImage]=useState(false);
 useEffect(()=>{if(!entered&&!open)return;let active=true;fetch('./assets/party-information.png').then(r=>{if(!r.ok)throw new Error('Image unavailable');return r.blob()}).then(blob=>{if(active)eventImage.current=new File([blob],'Jeter-Lulu-派對資訊.png',{type:'image/png'})}).catch(()=>{});return()=>{active=false}},[entered,open]);
 useEffect(()=>{if(showSaveImage)saveView.current?.focus({preventScroll:true})},[showSaveImage]);
 const [assetUrls,setAssetUrls]=useState<Record<AssetKey,string>|null>(null),[preparedCount,setPreparedCount]=useState(0),[renderedCount,setRenderedCount]=useState(0),[assetError,setAssetError]=useState(''),[loadAttempt,setLoadAttempt]=useState(0);
 const renderedAssets=useRef(new Set<AssetKey>());
 const [mobileLayout,setMobileLayout]=useState(false);
 useEffect(()=>{const media=matchMedia('(max-width:767px)');const sync=()=>setMobileLayout(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[]);
 const shouldPrepare=loaded||entered;
 const assetCount=mobileLayout?4:6;
 const contentReady=!!assetUrls&&renderedCount===assetCount&&!assetError;
 const loadProgress=Math.min(100,Math.round((preparedCount+renderedCount)/(assetCount*2)*100));
 useEffect(()=>{if(!entered||contentReady)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old}},[entered,contentReady]);
 useEffect(()=>{
  if(!shouldPrepare)return;
  const controller=new AbortController();const created:string[]=[];let active=true;
  setAssetUrls(null);setPreparedCount(0);setRenderedCount(0);setAssetError('');renderedAssets.current.clear();
  const sources=mobileLayout?{...invitationAssets,art:'./assets/invitation-mobile.svg'}:{...invitationAssets,...desktopBackgroundAssets,countdown:'./assets/desktop-bg-3.png'};
  Promise.all((Object.entries(sources) as [AssetKey,string][]).map(async([key,src])=>{
   const response=await fetch(src,{signal:controller.signal,cache:'no-cache'});
   if(!response.ok)throw new Error('Image unavailable');
   const blob=await response.blob();if(!active)throw new Error('Cancelled');
   const url=URL.createObjectURL(blob);created.push(url);setPreparedCount(n=>n+1);return [key,url] as const;
  })).then(entries=>{if(active)setAssetUrls(Object.fromEntries(entries) as Record<AssetKey,string>)}).catch(()=>{if(active&&!controller.signal.aborted)setAssetError('邀請函暫時無法載入，請再試一次。')});
  return()=>{active=false;controller.abort();created.forEach(url=>URL.revokeObjectURL(url))};
 },[shouldPrepare,loadAttempt,mobileLayout]);
 function markAssetReady(key:AssetKey){if(renderedAssets.current.has(key))return;renderedAssets.current.add(key);setRenderedCount(renderedAssets.current.size)}
 function assetFailed(){setAssetError('部分圖片未能載入，請再試一次。')}
 const total=attendance==='group'?companions+1:1;
 useEffect(()=>{
  if(entered)return;
  const cover=entryCover.current,image=entryImage.current;if(!cover||!image)return;
  const placePrompt=()=>{
   const {width,height}=cover.getBoundingClientRect();
   const desktop=matchMedia('(min-width:768px)').matches;
   const sourceWidth=desktop?1920:1080,sourceHeight=desktop?1080:1920;
   const scale=Math.max(width/sourceWidth,height/sourceHeight);
   const nameCenter=desktop?1162:534,nameBottom=desktop?688:1657;
   const left=(width-sourceWidth*scale)/2+nameCenter*scale;
   const top=(height-sourceHeight*scale)/2+nameBottom*scale+(desktop?12:14);
   cover.style.setProperty('--entry-prompt-left',`${left}px`);
   cover.style.setProperty('--entry-prompt-top',`${top}px`);
  };
  const handleLoaded=()=>{placePrompt();if(image.complete&&image.naturalWidth>0)setLoaded(true)};
  image.addEventListener('load',handleLoaded);
  // A cached image can finish loading before React attaches its event handler.
  handleLoaded();
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(placePrompt);observer?.observe(cover);
  addEventListener('resize',placePrompt);
  return()=>{image.removeEventListener('load',handleLoaded);observer?.disconnect();removeEventListener('resize',placePrompt)};
 },[entered]);
 useEffect(()=>{if(!loaded)return;const timer=setTimeout(()=>setReady(true),5000);return()=>clearTimeout(timer)},[loaded]);
 useEffect(()=>{id.current=crypto.randomUUID();audio.current?.play().then(()=>setPlaying(true)).catch(()=>{});const tick=()=>{const s=Math.max(0,Math.floor((Date.parse('2026-11-21T16:30:00+08:00')-Date.now())/1000));setRemaining([Math.floor(s/86400),Math.floor(s/3600)%24,Math.floor(s/60)%60,s%60])};tick();const t=setInterval(tick,1000);return()=>clearInterval(t)},[]);
 useEffect(()=>{if(!entered)return;const move=()=>{if(!art.current||!pearl.current)return;const r=art.current.getBoundingClientRect();const p=Math.max(0,Math.min(1,(innerHeight*.6-r.top-r.height*.61)/(r.height*.191)));pearl.current.style.top=`${61+p*19.1}%`};move();addEventListener('scroll',move,{passive:true});return()=>removeEventListener('scroll',move)},[entered,contentReady]);
 useEffect(()=>{
  if(!open&&!showSaveImage)return;
  const body=document.body,root=document.documentElement,scrollY=window.scrollY;
  lastFocus.current=document.activeElement as HTMLElement;
  if(lastFocus.current?.matches('input,textarea,select'))lastFocus.current.blur();
  const previous={position:body.style.position,top:body.style.top,left:body.style.left,right:body.style.right,width:body.style.width,overflow:body.style.overflow};
  Object.assign(body.style,{position:'fixed',top:`-${scrollY}px`,left:'0',right:'0',width:'100%',overflow:'hidden'});
  root.classList.add('survey-active');
  return()=>{
   Object.assign(body.style,previous);root.classList.remove('survey-active');
   window.scrollTo({top:scrollY,behavior:'instant'});
   const target=lastFocus.current;if(target?.isConnected&&!target.matches('input,textarea,select'))target.focus({preventScroll:true});
  };
 },[open,showSaveImage]);
 useEffect(()=>{if(open)dialog.current?.focus({preventScroll:true})},[open,page]);
 function play(){audio.current?.play().then(()=>{setPlaying(true);setMusicError(false)}).catch(()=>{setPlaying(false);setMusicError(true)})}
 function enter(){window.scrollTo({top:0,behavior:'instant'});setEntered(true);play()}
 async function saveEventImage(){
  if(savingImage)return;setSavingImage(true);
  try{const result=await saveInvitationImage(eventImage.current);if(result==='cancelled')return;setOpen(false);if(result==='preview')setShowSaveImage(true)}finally{setSavingImage(false)}
 }

 function toggleMusic(){if(playing){audio.current?.pause();setPlaying(false)}else play()}
 const quantity=(field:'drink'|'dessert',item:string)=>guests.filter(g=>g[field]===item).length;
 const selected=(field:'drink'|'dessert')=>guests.filter(g=>g[field]).length;
 function adjust(field:'drink'|'dessert',item:string,delta=1){setError('');setGuests(old=>adjustSelection(old,field,item,delta))}
 async function submit(){if(submitting.current||done)return;submitting.current=true;setBusy(true);setError('');try{await submitRsvp({id:id.current,name:name.trim(),attendance:attendance==='no'?'no':'yes',guests:attendance==='no'?[]:guests,note:''});setDone(true);setPage(attendance==='no'?6:7);setOpen(true)}catch(e){setError(e instanceof Error?e.message:'連線失敗，請再試一次。');setOpen(true)}finally{setBusy(false);submitting.current=false}}
 function begin(){setOpen(true);if(done){setPage(attendance==='no'?6:7);return}if(!name.trim()||!attendance||!Number.isInteger(companions)||companions<1||companions>19){setPage(0);setError('請填寫姓名、出席選項及正確的攜伴人數。');return}setError('');if(attendance==='no'){setPage(0);void submit();return}setGuests(prev=>Array.from({length:total},(_,i)=>({...prev[i],name:i===0?name.trim():`同行賓客 ${i}`,drink:prev[i]?.drink||'',dessert:prev[i]?.dessert||''})));setPage(1)}
 const validStart=!!name.trim()&&!!attendance&&(attendance!=='group'||Number.isInteger(companions)&&companions>=1&&companions<=19);
 function go(p:number){setError('');if(p===5&&selected('drink')!==guests.length){setError(`請在四頁飲品中選滿 ${guests.length} 杯，目前已選 ${selected('drink')} 杯。`);return}setPage(p)}
 const selections=(field:'drink'|'dessert')=>Array.from(new Set(guests.map(g=>g[field]).filter(Boolean)));
 function option(field:'drink'|'dessert',item:string,x:number,y:number,w=120,reverse=false){const n=quantity(field,item);return <button key={item} type="button" className={`choice-hotspot ${n?'chosen':''} ${reverse?'reverse':''}`} style={{...at(reverse?x-w+7:x-7,y-10,w,20),'--choice-diameter':'3.4cqw'} as CSSProperties} aria-label={`${item}，已選 ${n} ${field==='drink'?'杯':'份'}`} aria-pressed={n>0} onClick={()=>adjust(field,item)} disabled={guests.length>1&&selected(field)>=guests.length}><span className="selection-dot">{n>0?(guests.length>1?n:''):''}</span><span className="sr-only">{item}</span></button>}
 function startControls(inline=false){return <div className={inline?'inline-form':'start-controls'}>
 <input className="name-input" style={inline?undefined:at(165,264,160,27)} aria-label="你的姓名" autoComplete="name" maxLength={60} value={name} placeholder="請輸入姓名" onChange={e=>setName(e.target.value)} disabled={done}/>
 <div className="attendance-options" style={inline?undefined:at(165,296,175,60)}>{[['solo','我會參加，個人前往'],['group','我會參加，攜伴'],['no','不克前往']].map(([value,label])=><label key={value}><input type="radio" name={inline?'attendance-inline':'attendance-modal'} value={value} checked={attendance===value} onChange={()=>setAttendance(value)} disabled={done}/><span>{label}</span>{value==='group'&&<><input type="number" className="companion-input" aria-label="攜伴人數，不含本人" min={1} max={19} value={companions} disabled={done} onChange={e=>{setAttendance('group');setCompanions(e.target.value===''?0:Number(e.target.value))}}/><span>位</span></>}</label>)}</div>
 <button className="next-start" style={inline?undefined:at(194,363,102,27)} aria-label={done?'查看回覆':'下一頁'} onClick={begin} disabled={!validStart||busy}>{busy?'送出中…':done?'查看回覆':'→'}</button>
 </div>}
 function mobileStartControls(){return <div className="mobile-inline-form">
 <input className="mobile-p1-name" style={mobileP1At(149.61,244.5,204.32,34.36)} aria-label="你的姓名" autoComplete="name" maxLength={60} value={name} placeholder="請輸入姓名" onChange={e=>setName(e.target.value)} disabled={done}/>
 {([['solo','我會參加，個人前往',288.83],['group','我會參加，攜伴',314.32],['no','不克前往',340.39]] as const).map(([value,label,y])=><label className="mobile-p1-option" key={value} style={mobileP1At(150.06,y-3,205,21.22)}><input type="radio" name="attendance-mobile-inline" value={value} checked={attendance===value} onChange={()=>setAttendance(value)} disabled={done}/><span className="sr-only">{label}</span></label>)}
 <input type="number" className="mobile-p1-companions" style={mobileP1At(302,308,32,22)} aria-label="攜伴人數，不含本人" min={1} max={19} value={companions} disabled={done} onChange={e=>{setAttendance('group');setCompanions(e.target.value===''?0:Number(e.target.value))}}/>
 <button className={`mobile-p1-next ${done?'is-complete':''}`} style={mobileP1At(204.49,374.99,102.24,27.44)} aria-label={done?'查看回覆':'下一頁'} onClick={begin} disabled={!validStart||busy}>{busy?'送出中…':done?'查看回覆':'→'}</button>
 </div>}
 const svg=page===0?'form-start':page<=4?`drink-${page}`:page===5?'dessert':page===6?'thanks-no':'thanks-yes';
 return <>
 <audio ref={audio} src="./assets/music.mp3" autoPlay loop preload="auto" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>
 {!entered?<main className="entrance"><button ref={entryCover} className="entry-cover" onClick={enter} aria-label="點擊任意位置開啟 Jeter 與 Lulu 邀請函"><picture><source media="(min-width: 768px) and (prefers-reduced-motion: reduce)" srcSet="./assets/entrance-desktop-last.webp"/><source media="(min-width: 768px)" srcSet={entryFailed?'./assets/entrance-desktop-last.webp':'./assets/entrance-desktop.gif'}/><source media="(prefers-reduced-motion: reduce)" srcSet="./assets/entrance-last.webp"/><img ref={entryImage} src={entryFailed?'./assets/entrance-last.webp':'./assets/entrance-once.gif'} alt="Jeter 與 Lulu 的動態信封邀請函" onLoad={()=>setLoaded(true)} onError={()=>{setEntryFailed(true);setLoaded(true)}}/></picture><span className={`entry-prompt ${ready?'ready':''}`}>-CLICK ENVELOPE TO OPEN-</span></button></main>:assetUrls?<main aria-busy={!contentReady} aria-hidden={!contentReady} className={`invitation-page ${!contentReady?'is-loading':''} ${open?'is-obscured':''}`}>
 {!mobileLayout&&<div className="desktop-backdrops" aria-hidden="true"><img className="desktop-wood" src={assetUrls.wood} alt="" onLoad={()=>markAssetReady('wood')} onError={assetFailed}/><img className="desktop-curtain" src={assetUrls.curtain} alt="" onLoad={()=>markAssetReady('curtain')} onError={assetFailed}/><img className="desktop-dinner" src={assetUrls.countdown} alt="" onLoad={()=>markAssetReady('countdown')} onError={assetFailed}/></div>}
 <div className="invitation" ref={art}>
 <img className="full-art" width={1366} height={4219} src={assetUrls.art} onLoad={()=>markAssetReady('art')} onError={assetFailed} alt="Jeter & Lulu 性別派對。2026年11月21日16:30，芙塔咖啡館，台北市士林區文林路332號。16:30簽到入座、16:50遊戲活動、17:20性別揭曉與抽獎、17:35 Buffet dinner 開席。" fetchPriority="high"/>
 <div className="ultrasound-motion"><img src={assetUrls.ultrasound} onLoad={()=>markAssetReady('ultrasound')} onError={assetFailed} alt="寶寶的動態超音波影像" loading="eager"/></div>
 <img className="invitation-foreground" src={assetUrls.foreground} onLoad={()=>markAssetReady('foreground')} onError={assetFailed} alt="" aria-hidden="true"/>
 {mobileLayout?mobileStartControls():startControls(true)}<button className="record-hotspot" aria-label={playing?'暫停背景音樂':'播放背景音樂'} onClick={toggleMusic}><span>{playing?'Ⅱ':'♫'}</span></button>
 <span className="scroll-pearl" ref={pearl} aria-hidden="true"/>
 {mobileLayout&&<img className="asset-decode-probe" src={assetUrls.countdown} alt="" aria-hidden="true" onLoad={()=>markAssetReady('countdown')} onError={assetFailed}/>}
 <section className="live-countdown" style={{backgroundImage:mobileLayout?`url("${assetUrls.countdown}")`:'none'}} aria-label="距離派對開始的倒數"><h1>Can’t wait to see you ♡</h1><div className="countdown-values">{remaining.map((n,i)=><div key={i}><b>{String(n).padStart(2,'0')}</b><span>{['DAYS','HOURS','MINUTES','SECONDS'][i]}</span></div>)}</div><p>All our love, Jeter & Lulu</p></section>
 <div className="floating-tools"><button onClick={toggleMusic} aria-label={playing?'暫停音樂':'播放音樂'}>{playing?'♫ 音樂開':'♫ 音樂關'}</button><button onClick={()=>{setOpen(true);setPage(done?attendance==='no'?6:7:0)}}>{done?'查看回覆':'回覆邀請'}</button></div>
 {musicError&&<p role="status" className="music-notice">音樂未能播放，點擊「音樂關」可重試。</p>}
 </div></main>:null}
 {entered&&!contentReady&&<section className="invitation-loader" aria-label="正在準備邀請函" aria-busy={!assetError}>
 <div className="loader-content"><p className="loader-kicker">YOU’RE INVITED</p><h1>Jeter <span>&amp;</span> Lulu</h1><div className="loader-rule"/>
 <p className="loader-message" role="status">{assetError||'正在為你打開邀請函…'}</p>
 <div className="loader-track" role="progressbar" aria-label="邀請函載入進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loadProgress}><span style={{width:`${loadProgress}%`}}/></div>
 <p className="loader-percent">{loadProgress}%</p>{assetError&&<button className="loader-retry" onClick={()=>setLoadAttempt(n=>n+1)}>重新載入</button>}
 </div></section>}
 {open&&createPortal(<div className="modal" onKeyDown={e=>{if(e.key==='Escape'&&!busy)setOpen(false);if(e.key==='Tab'){const els=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')||[]);const first=els[0],last=els[els.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}}><div className="survey-shell" ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={page===0?'姓名與出席':page<=4?`飲品 ${page}/4`:page===5?'甜點預選':'感謝你的回覆'}>
 <button className="close" onClick={()=>setOpen(false)} disabled={busy} aria-label="關閉問卷">×</button>
 <div className="sheet"><img src={`./assets/${svg}.svg`} alt={page===6?'Thank you for filling this out.':page===7?'Thank you. 2026.11.21 16:30，芙塔咖啡館，台北市士林區文林路332號。':''}/>
 {page===0&&startControls()}
 {page>=1&&page<=4&&<>
 {drinks[page-1].flatMap((group,gi)=>{const [x,y,dy]=coords[page-1][gi];return group.items.map((item,i)=>{if(page===2&&gi===0&&i>=5)return null;if(page===3&&gi===2)return option('drink',item,i%2?252:130,354+Math.floor(i/2)*20,i%2?135:120);return option('drink',item,x,y+i*dy,gi===0&&page!==4?115:145)})})}
 {page===2&&<><button aria-label="選擇風味拿鐵口味" className={'flavor-indicator '+(guests.some(g=>g.drink.startsWith('風味拿鐵'))?'chosen':'')} style={at(123,330,108,20)} onClick={()=>{setError('請選擇香草、焦糖、榛果或黑糖口味。');dialog.current?.querySelector<HTMLButtonElement>('.flavor-choice')?.focus()}}><span className="selection-dot"/></button>{['香草','焦糖','榛果','黑糖'].map((flavor,i)=><button className={`flavor-choice ${quantity('drink','風味拿鐵・'+flavor)?'selected':''}`} key={flavor} aria-pressed={quantity('drink','風味拿鐵・'+flavor)>0} aria-label={`風味拿鐵 ${flavor}`} style={at(139+i%2*45,349+Math.floor(i/2)*17,38,17)} disabled={guests.length>1&&selected('drink')>=guests.length} onClick={()=>adjust('drink','風味拿鐵・'+flavor)}>{flavor}{quantity('drink','風味拿鐵・'+flavor)>0&&guests.length>1?` ${quantity('drink','風味拿鐵・'+flavor)}`:''}</button>)}</>}
 <button className="art-arrow" style={at(137,402,102,28)} aria-label="上一頁" onClick={()=>go(page-1)}>←</button><button className="art-arrow" style={at(253,402,103,28)} aria-label={page===4?'前往甜點頁':'下一頁飲品'} onClick={()=>go(page+1)}>→</button>
 </>}
 {page===5&&<>{desserts.map((item,i)=>{const points=[[195,214,150],[288,245,158],[195,277,164],[288,309,132],[195,348,188],[291,378,92]];const [x,y,w]=points[i];return option('dessert',item,x,y,w,i===1||i===3||i===5)})}<button className="art-arrow submit" style={at(201,402,103,28)} disabled={selected('dessert')!==guests.length||busy} onClick={submit}>{busy?'送出中…':'確認送出'}</button></>}
 {page===7&&<button className="art-arrow save-image-button" style={at(201,402,103,28)} onClick={saveEventImage} disabled={savingImage} aria-label="儲存活動資訊圖片">{savingImage?'開啟中…':'截圖存取'}</button>}
 </div>
 {page>=1&&page<=5&&<section className="selection-tray" aria-label="目前選擇"><div className="tray-heading"><span>{page<=4?'飲品':'甜點'}已選 <strong>{selected(page<=4?'drink':'dessert')} / {guests.length}</strong> {page<=4?'杯':'份'}</span><small>{guests.length>1?'點選品項增加份數':'每人選擇一項'}</small></div><div className="selected-items">{selections(page<=4?'drink':'dessert').map(item=><div key={item}><span>{item}</span><button onClick={()=>adjust(page<=4?'drink':'dessert',item,-1)} aria-label={`減少${item}`}>−</button><b>{quantity(page<=4?'drink':'dessert',item)}</b><button onClick={()=>adjust(page<=4?'drink':'dessert',item)} disabled={selected(page<=4?'drink':'dessert')>=guests.length} aria-label={`增加${item}`}>＋</button></div>)}</div>{page===5&&<button className="back-link" onClick={()=>go(4)}>← 返回飲品選擇</button>}</section>}
 {page>=6&&<div className="success-note"><p role="status">✓ 已收到 {name} 的回覆{attendance!=='no'?`，共 ${guests.length} 位出席`:'與祝福'}。</p><button className="back-link" onClick={()=>setOpen(false)}>返回邀請函</button></div>}
 {error&&<p className="error" role="alert">{error}</p>}
 </div></div>,document.body)}
 {showSaveImage&&<div className="save-image-view" ref={saveView} tabIndex={-1} role="dialog" aria-modal="true" aria-label="儲存派對感謝函" onKeyDown={e=>{if(e.key==='Escape')setShowSaveImage(false);if(e.key==='Tab'){const controls=saveView.current?.querySelectorAll<HTMLElement>('a,button');if(!controls?.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===saveView.current)){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}}>
 <p>長按圖片，選擇「儲存影像」或「下載圖片」。<br/>也可以直接截圖保存。</p>
 <img src="./assets/party-information.png" alt="Jeter 與 Lulu 派對感謝函與活動資訊"/>
 <div><a href="./assets/party-information.png" download="Jeter-Lulu-派對資訊.png">下載圖片</a><button onClick={()=>setShowSaveImage(false)}>返回邀請函</button></div>
 </div>}
 </>;
}
