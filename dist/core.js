export function elapsed(active, now=Date.now()) { return active ? Math.max(0, active.accumulated + (active.runningSince === null ? 0 : now-active.runningSince)) : 0; }
export function clock(ms){const seconds=Math.floor(ms/1000);return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');}
export function duration(ms){const minutes=Math.floor(ms/60000);return `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,'0')}min`;}
export function periodTotals(sessions, now=new Date()){
 const today=new Date(now);today.setHours(0,0,0,0);const tomorrow=new Date(today);tomorrow.setDate(today.getDate()+1);
 const week=new Date(today);week.setDate(today.getDate()-(today.getDay()+6)%7);const nextWeek=new Date(week);nextWeek.setDate(week.getDate()+7);
 return sessions.reduce((a,s)=>{a.total+=s.duration;const d=new Date(s.startedAt);if(d>=today&&d<tomorrow)a.today+=s.duration;if(d>=week&&d<nextWeek)a.week+=s.duration;return a;},{today:0,week:0,total:0});
}
export function validState(s){return s?.version===1&&Array.isArray(s.folders)&&s.folders.every(f=>typeof f.id==='string'&&typeof f.name==='string'&&/^#[0-9a-f]{6}$/i.test(f.color))&&Array.isArray(s.sessions)&&s.sessions.every(x=>typeof x.id==='string'&&s.folders.some(f=>f.id===x.folderId)&&typeof x.description==='string'&&Number.isFinite(x.duration)&&x.duration>0&&Number.isFinite(Date.parse(x.startedAt)))&&(!s.active||(s.folders.some(f=>f.id===s.active.folderId)&&typeof s.active.description==='string'&&Number.isFinite(s.active.accumulated)&&s.active.accumulated>=0&&(s.active.runningSince===null||Number.isFinite(s.active.runningSince))&&Number.isFinite(Date.parse(s.active.startedAt))));}
