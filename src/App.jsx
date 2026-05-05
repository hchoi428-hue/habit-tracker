import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────
const DAYS_KR   = ["일","월","화","수","목","금","토"];
const MONTHS_KR = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const EMOJI_OPTIONS = ["🏃","💧","📚","🧘","💊","🌙","🍎","✍️","🎯","🎨","🎵","💪","🧹","🛋️","☕","🌿","🧠","📓","🎧","⚡"];

// Calm monochrome palette — accent only for meaning
const PALETTE = {
  bg:          "#FAFAF9",
  surface:     "#FFFFFF",
  border:      "#EBEBEA",
  borderHover: "#D4D4D2",
  textPrimary: "#1A1A18",
  textSecond:  "#6B6B68",
  textThird:   "#ADADAA",
  // Core accent — soft indigo
  coreFill:    "#534AB7",
  coreBg:      "#EEEDFE",
  coreBorder:  "#AFA9EC",
  // Skip accent — warm amber
  skipFill:    "#BA7517",
  skipBg:      "#FAEEDA",
  // Done state — very subtle
  doneBg:      "#F5F5F4",
  doneBorder:  "#E2E2E0",
  // Streak
  streakColor: "#D85A30",
};

const PRIORITY = {
  core:     { label:"Core",    weight:3,   desc:"반드시" },
  regular:  { label:"Regular", weight:1,   desc:"매일"   },
  optional: { label:"Optional",weight:0.5, desc:"여유시" },
};
const PRIO_ORDER = ["core","regular","optional"];

const BLOCKS = [
  { key:"오전",   desc:"뇌 예열 · 집중" },
  { key:"오후",   desc:"에너지 방어 · 잔무" },
  { key:"밤",     desc:"해제 · 수면 준비" },
  { key:"언제든", desc:"시간 상관 없이" },
];

const DURATIONS = [
  { value:0,  label:"없음" },
  { value:5,  label:"5분" },
  { value:10, label:"10분" },
  { value:15, label:"15분" },
  { value:30, label:"30분" },
  { value:60, label:"1시간" },
];

const DEFAULT_HABITS = [
  {id:101, name:"물 한 잔 + 영양제",         emoji:"💊", priority:"core",    block:"오전",   duration:0},
  {id:102, name:"햇빛 스트레칭 or HIIT",      emoji:"🏃", priority:"core",    block:"오전"},
  {id:103, name:"브레인 덤프",               emoji:"📓", priority:"regular", block:"오전"},
  {id:104, name:"메인 작업 뽀모도로 1세트",   emoji:"🎯", priority:"core",    block:"오전"},
  {id:105, name:"수분 보충 500ml",            emoji:"💧", priority:"regular", block:"오전"},
  {id:106, name:"15분 바깥 걷기",            emoji:"🌿", priority:"regular", block:"오후"},
  {id:107, name:"단순 업무 몰아치기",         emoji:"🧹", priority:"regular", block:"오후"},
  {id:108, name:"취미 · 도파민 충전",        emoji:"🎨", priority:"regular", block:"밤"},
  {id:109, name:"쿨다운 시간 허락하기",       emoji:"🛋️", priority:"optional",block:"밤"},
  {id:110, name:"내일 메뉴판 작성",           emoji:"✍️", priority:"regular", block:"밤"},
  {id:111, name:"취침 1시간 전 조명 낮추기",  emoji:"🌙", priority:"core",    block:"밤"},
  {id:112, name:"백색소음 켜고 수면 준비",    emoji:"🎧", priority:"optional",block:"밤"},
];

const SKIP_LIMIT = 1;

// ─── Utils ────────────────────────────────────────────────
const getDayKey   = d => d.toISOString().split("T")[0];
const addDays     = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const startOfWeek = d => { const x=new Date(d); x.setDate(x.getDate()-x.getDay()); x.setHours(0,0,0,0); return x; };
const getWeekKey  = d => getDayKey(startOfWeek(d));
const getWeekDays = anchor => { const s=startOfWeek(anchor),r=[]; for(let i=0;i<7;i++) r.push(addDays(s,i)); return r; };
const getMonthDays= anchor => { const y=anchor.getFullYear(),m=anchor.getMonth(),r=[]; for(let d=new Date(y,m,1);d<=new Date(y,m+1,0);d.setDate(d.getDate()+1)) r.push(new Date(d)); return r; };
const weightedRate= (habits,fn) => { const tw=habits.reduce((s,h)=>s+PRIORITY[h.priority||"regular"].weight,0); if(!tw)return 0; return habits.reduce((s,h)=>s+(fn(h.id)?PRIORITY[h.priority||"regular"].weight:0),0)/tw; };

// ─── Thin check icon SVG ──────────────────────────────────
const CheckIcon = ({color="#fff",size=11}) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M2 6L5 9L10 3" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Priority dot ─────────────────────────────────────────
const PrioDot = ({priority}) => {
  const colors = { core: PALETTE.coreFill, regular: "#9E9E9B", optional: PALETTE.border };
  return <span style={{display:"inline-block",width:5,height:5,borderRadius:"50%",background:colors[priority||"regular"],flexShrink:0,marginTop:1}}/>;
};

// ─── Calm Ring ────────────────────────────────────────────
function Ring({value,size=54,stroke=3}) {
  const r=(size-stroke*2)/2, c=2*Math.PI*r;
  const pct = Math.round(value*100);
  const color = value>=1 ? "#534AB7" : value>0 ? "#534AB7" : PALETTE.border;
  return(
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={PALETTE.border} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c*(1-value)} strokeLinecap="round"
          style={{transition:"stroke-dashoffset .6s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:11,fontWeight:500,color:PALETTE.textSecond}}>{pct}%</span>
      </div>
    </div>
  );
}

// ─── Habit Row ────────────────────────────────────────────
function HabitRow({habit,checked,skipped,onCheck,streak,canSkip,skippedThisWeek,onSkip,onEdit,onDelete,onRetro,dateKey}) {
  const [reveal,setReveal] = useState(false);
  const isCore    = habit.priority==="core";
  const isOptional= habit.priority==="optional";
  const isToday   = dateKey===getDayKey(new Date());

  // touch swipe
  const tx = useRef(null);
  const onTS = e => { tx.current=e.touches[0].clientX; };
  const onTE = e => {
    if(tx.current===null) return;
    const dx = tx.current - e.changedTouches[0].clientX;
    if(dx>44) setReveal(true);
    else if(dx<-20) setReveal(false);
    tx.current=null;
  };

  const handleCheck = () => { if(!skipped&&!reveal) onCheck(); };

  const rowBg     = skipped ? PALETTE.skipBg  : checked ? PALETTE.doneBg    : PALETTE.surface;
  const rowBorder = skipped ? "#F5D79055"     : checked ? PALETTE.doneBorder : isCore ? PALETTE.coreBorder+"55" : PALETTE.border;
  const nameColor = skipped ? PALETTE.skipFill: checked ? PALETTE.textThird  : isOptional ? PALETTE.textSecond : PALETTE.textPrimary;

  return(
    <div style={{position:"relative",marginBottom:5,overflow:"hidden",borderRadius:12}}>
      {/* Action panel */}
      <div style={{position:"absolute",right:0,top:0,bottom:0,display:"flex",
        transform:reveal?"translateX(0)":"translateX(100%)",transition:"transform .2s ease",zIndex:2}}>
        {isToday&&(
          <ActionBtn label="소급" color="#534AB7" bg="#EEEDFE" onClick={()=>{onRetro();setReveal(false);}}
            icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="#534AB7" strokeWidth="1.4"/><path d="M5 7h4M7 5v4" stroke="#534AB7" strokeWidth="1.3" strokeLinecap="round"/></svg>}/>
        )}
        {isToday&&!checked&&(
          <ActionBtn label={skipped?"취소":"쉬기"} color={PALETTE.skipFill} bg={PALETTE.skipBg}
            disabled={!canSkip&&!skipped}
            onClick={()=>{if(canSkip||skipped){onSkip();setReveal(false);}}}
            icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v5l3 3" stroke={PALETTE.skipFill} strokeWidth="1.4" strokeLinecap="round"/><circle cx="7" cy="7" r="5" stroke={PALETTE.skipFill} strokeWidth="1.4"/></svg>}/>
        )}
        <ActionBtn label="수정" color={PALETTE.textSecond} bg={PALETTE.doneBg}
          onClick={()=>{onEdit();setReveal(false);}}
          icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L5 11H3v-2L9.5 2.5z" stroke={PALETTE.textSecond} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}/>
        <ActionBtn label="삭제" color="#fff" bg="#E24B4A" rounded
          onClick={()=>{onDelete();setReveal(false);}}
          icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 4h8M6 4V3h2v1M5.5 4v6.5M8.5 4v6.5M4 4l.5 7h5L10 4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}/>
      </div>

      {/* Main row */}
      <div onClick={handleCheck} onTouchStart={onTS} onTouchEnd={onTE}
        style={{
          background:rowBg,
          border:`1px solid ${rowBorder}`,
          borderRadius:12,
          padding: isCore ? "12px 14px" : "9px 13px",
          display:"flex",alignItems:"center",gap:10,
          cursor:skipped?"default":"pointer",
          userSelect:"none",
          transform:reveal?"translateX(-228px)":"translateX(0)",
          transition:"transform .2s ease, background .15s, border-color .15s",
          zIndex:3,position:"relative",
        }}>

        {/* Core left bar */}
        {isCore&&<div style={{position:"absolute",left:0,top:4,bottom:4,width:2.5,
          borderRadius:"0 2px 2px 0",
          background:checked?PALETTE.coreFill:skipped?"#F5D790":PALETTE.coreBorder}}/>}

        {/* Text */}
        <div style={{flex:1,minWidth:0}}>
          <span style={{
            fontSize:isCore?14:13,
            fontWeight:isCore?500:400,
            color:nameColor,
            transition:"color .2s",
            display:"block",
            textDecoration:checked?"line-through":"none",
          }}>{habit.name}</span>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:streak>1&&!checked&&!skipped?2:0}}>
            {streak>1&&!checked&&!skipped&&(
              <span style={{fontSize:10,color:PALETTE.streakColor}}>{streak}일 연속</span>
            )}
            {habit.duration>0&&(
              <span style={{fontSize:10,color:PALETTE.textThird}}>
                {habit.duration>=60?"1시간":habit.duration+"분"}
              </span>
            )}
          </div>
        </div>

        {/* Skip badge */}
        {skipped&&<span style={{fontSize:10,color:PALETTE.skipFill,background:PALETTE.skipBg,
          padding:"2px 7px",borderRadius:20,flexShrink:0,whiteSpace:"nowrap"}}>쉬는 중</span>}

        {/* Priority dot + swipe hint */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <PrioDot priority={habit.priority}/>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{opacity:.25}}>
            <path d="M4 2L7 5L4 8" stroke={PALETTE.textThird} strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Check circle */}
        <div style={{
          width:isCore?22:19,height:isCore?22:19,borderRadius:"50%",flexShrink:0,
          border:`1px solid ${checked?PALETTE.coreFill:skipped?"#F5D790":PALETTE.borderHover}`,
          background:checked?PALETTE.coreFill:skipped?"#FFF8EA":"transparent",
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"all .2s ease",
        }}>
          {checked&&<CheckIcon size={isCore?10:9}/>}
        </div>
      </div>
      {reveal&&<div style={{position:"fixed",inset:0,zIndex:1}} onClick={()=>setReveal(false)}/>}
    </div>
  );
}

function ActionBtn({label,color,bg,onClick,icon,disabled,rounded}) {
  return(
    <button onClick={disabled?undefined:onClick} style={{
      width:57,border:"none",background:bg,color,cursor:disabled?"not-allowed":"pointer",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,
      opacity:disabled?.35:1,
      borderRadius:rounded?"0 12px 12px 0":0,
    }}>
      {icon}
      <span style={{fontSize:10,fontWeight:500}}>{label}</span>
    </button>
  );
}

// ─── Habit Modal (전체화면 — iOS 키보드 대응) ─────────────
function HabitModal({onSave,onClose,initial}) {
  const [name,setName]         = useState(initial?.name||"");
  const [priority,setPriority] = useState(initial?.priority||"regular");
  const [block,setBlock]       = useState(initial?.block||"오전");
  const [duration,setDuration] = useState(initial?.duration||0);

  return(
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:PALETTE.bg,
      display:"flex", flexDirection:"column",
      paddingTop:"env(safe-area-inset-top)",
    }}>
      {/* 상단 바 */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"16px 20px",
        borderBottom:`1px solid ${PALETTE.border}`,
        background:PALETTE.surface,
        flexShrink:0,
      }}>
        <button onClick={onClose} style={{
          fontSize:14, color:PALETTE.textSecond, background:"none",
          border:"none", cursor:"pointer", padding:"4px 0", fontFamily:"inherit",
        }}>취소</button>
        <span style={{fontSize:15, fontWeight:500, color:PALETTE.textPrimary}}>
          {initial&&initial.name?"습관 수정":"새 습관"}
        </span>
        <button onClick={()=>{if(name.trim()){onSave({name:name.trim(),priority,block,duration});onClose();}}}
          disabled={!name.trim()} style={{
            fontSize:14, fontWeight:600,
            color:name.trim()?PALETTE.coreFill:PALETTE.textThird,
            background:"none", border:"none", cursor:name.trim()?"pointer":"default",
            fontFamily:"inherit", padding:"4px 0",
          }}>{initial&&initial.name?"저장":"추가"}</button>
      </div>

      {/* 내용 */}
      <div style={{flex:1, overflowY:"auto", padding:"24px 20px"}}>
        <input
          value={name} onChange={e=>setName(e.target.value)}
          placeholder="습관 이름" autoFocus
          style={{
            width:"100%", padding:"13px 14px",
            borderRadius:12, border:`1px solid ${PALETTE.border}`,
            fontSize:16, outline:"none", fontFamily:"inherit",
            marginBottom:28, boxSizing:"border-box",
            color:PALETTE.textPrimary, background:PALETTE.surface,
          }}/>

        <FieldLabel>중요도</FieldLabel>
        <div style={{display:"flex",gap:8,marginBottom:28}}>
          {PRIO_ORDER.map(k=>{
            const p=PRIORITY[k], a=priority===k;
            const ac=k==="core"?PALETTE.coreFill:"#9E9E9B";
            return(
              <button key={k} onClick={()=>setPriority(k)} style={{
                flex:1, padding:"12px 4px",
                border:`1px solid ${a?ac:PALETTE.border}`,
                borderRadius:12,
                background:a?k==="core"?PALETTE.coreBg:PALETTE.doneBg:PALETTE.surface,
                cursor:"pointer", display:"flex", flexDirection:"column",
                alignItems:"center", gap:4, transition:"all .15s",
              }}>
                <PrioDot priority={k}/>
                <span style={{fontSize:12,fontWeight:500,color:a?ac:PALETTE.textThird}}>{p.label}</span>
                <span style={{fontSize:11,color:PALETTE.textThird}}>{p.desc}</span>
              </button>
            );
          })}
        </div>

        <FieldLabel>시간대</FieldLabel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:28}}>
          {BLOCKS.map(b=>{
            const a=block===b.key;
            return(
              <button key={b.key} onClick={()=>setBlock(b.key)} style={{
                padding:"11px 8px",
                border:`1px solid ${a?PALETTE.textPrimary:PALETTE.border}`,
                borderRadius:12,
                background:a?PALETTE.textPrimary:PALETTE.surface,
                cursor:"pointer", textAlign:"left", transition:"all .15s",
              }}>
                <div style={{fontSize:13,fontWeight:500,color:a?"#fff":PALETTE.textPrimary}}>{b.key}</div>
                <div style={{fontSize:11,color:a?"rgba(255,255,255,.6)":PALETTE.textThird,marginTop:2}}>{b.desc}</div>
              </button>
            );
          })}
        </div>

        <FieldLabel>소요 시간</FieldLabel>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",paddingBottom:40}}>
          {DURATIONS.map(d=>{
            const a=duration===d.value;
            return(
              <button key={d.value} onClick={()=>setDuration(d.value)} style={{
                padding:"7px 14px",
                border:`1px solid ${a?PALETTE.textPrimary:PALETTE.border}`,
                borderRadius:20,
                background:a?PALETTE.textPrimary:PALETTE.surface,
                cursor:"pointer", fontSize:13,
                color:a?"#fff":PALETTE.textSecond, transition:"all .15s",
              }}>{d.label}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Retro Modal ──────────────────────────────────────────
function RetroModal({habit,logs,onToggle,onClose}) {
  const today = new Date();
  const days  = Array.from({length:7},(_,i)=>addDays(today,-6+i));
  return(
    <Modal onClose={onClose}>
      <div style={{fontSize:15,fontWeight:500,marginBottom:3,color:PALETTE.textPrimary}}>
        {habit.name}
      </div>
      <div style={{fontSize:12,color:PALETTE.textThird,marginBottom:20}}>지난 7일 · 탭해서 수정</div>
      <div style={{display:"flex",gap:7}}>
        {days.map(d=>{
          const dk=getDayKey(d), checked=!!logs[`${dk}_${habit.id}`], isToday=dk===getDayKey(today);
          return(
            <div key={dk} onClick={()=>onToggle(habit.id,dk)}
              style={{flex:1,textAlign:"center",cursor:"pointer"}}>
              <div style={{fontSize:10,color:PALETTE.textThird,marginBottom:5,fontWeight:500}}>
                {DAYS_KR[d.getDay()]}
              </div>
              <div style={{width:"100%",aspectRatio:"1",borderRadius:8,
                background:checked?PALETTE.coreFill:PALETTE.doneBg,
                border:`1px solid ${isToday?PALETTE.textPrimary:checked?PALETTE.coreFill:PALETTE.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                {checked&&<CheckIcon color="#fff" size={12}/>}
              </div>
              <div style={{fontSize:10,color:PALETTE.textThird,marginTop:4}}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <button onClick={onClose} style={{width:"100%",marginTop:20,padding:"12px",
        background:PALETTE.doneBg,color:PALETTE.textSecond,border:`1px solid ${PALETTE.border}`,
        borderRadius:10,fontSize:14,fontWeight:500,cursor:"pointer"}}>닫기</button>
    </Modal>
  );
}

// ─── Delete Confirm ───────────────────────────────────────
function DeleteConfirm({habit,onConfirm,onCancel}) {
  return(
    <Modal onClose={onCancel} center>
      <div style={{textAlign:"center",paddingTop:4}}>
        <div style={{fontSize:15,fontWeight:500,color:PALETTE.textPrimary,marginBottom:6}}>{habit.name}</div>
        <div style={{fontSize:12,color:PALETTE.textThird,marginBottom:22}}>삭제하면 기록도 함께 사라져요</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onCancel} style={{flex:1,padding:"11px",background:PALETTE.doneBg,
            color:PALETTE.textSecond,border:`1px solid ${PALETTE.border}`,
            borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer"}}>취소</button>
          <button onClick={onConfirm} style={{flex:1,padding:"11px",background:"#E24B4A",
            color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer"}}>삭제</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal wrapper ────────────────────────────────────────
function Modal({children,onClose,center}) {
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",zIndex:1000,
      display:"flex",alignItems:center?"center":"flex-end",justifyContent:"center"}}
      onClick={onClose}>
      <div style={{
        background:PALETTE.surface,
        borderRadius:center?"16px":"20px 20px 0 0",
        padding:"24px 20px 40px",
        width:"100%",maxWidth:480,
        animation:center?"popIn .2s ease":"slideUp .28s ease",
        maxHeight:"85vh",
        overflowY:"auto",
        WebkitOverflowScrolling:"touch",
        overscrollBehavior:"contain",
      }} onClick={e=>e.stopPropagation()}>
        <style>{`
          @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
          @keyframes popIn{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
        `}</style>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({children}) {
  return <div style={{fontSize:11,fontWeight:500,color:PALETTE.textThird,marginBottom:6,letterSpacing:".06em"}}>{children}</div>;
}

// ─── Drag list (touch + mouse) ───────────────────────────
function DragList({items,onReorder,renderItem}) {
  const [ord,setOrd]         = useState(()=>items.map(i=>i.id));
  const [dragging,setDragging] = useState(null); // id being dragged
  const [over,setOver]       = useState(null);
  const touchDragId          = useRef(null);
  const touchY               = useRef(0);
  const longPressTimer       = useRef(null);
  const isDragging           = useRef(false);

  useEffect(()=>{
    setOrd(prev=>{
      const ids=items.map(i=>i.id);
      return [...prev.filter(id=>ids.includes(id)),...ids.filter(id=>!prev.includes(id))];
    });
  },[items.map(i=>i.id).join(",")]);

  const reorder = (fromId, toId) => {
    if(fromId===toId) return;
    setOrd(prev=>{
      const n=[...prev],fi=n.indexOf(fromId),ti=n.indexOf(toId);
      n.splice(fi,1);n.splice(ti,0,fromId);
      onReorder(n); return n;
    });
  };

  // touch handlers
  const onTouchStart = (e, id) => {
    touchY.current = e.touches[0].clientY;
    isDragging.current = false;
    longPressTimer.current = setTimeout(()=>{
      isDragging.current = true;
      touchDragId.current = id;
      setDragging(id);
    }, 350);
  };
  const onTouchMove = (e) => {
    if(!isDragging.current) { clearTimeout(longPressTimer.current); return; }
    e.preventDefault();
    const y = e.touches[0].clientY;
    const el = document.elementFromPoint(e.touches[0].clientX, y);
    const row = el?.closest("[data-dragid]");
    if(row) { const tid = row.dataset.dragid; if(tid !== touchDragId.current) setOver(tid); }
  };
  const onTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    if(isDragging.current && touchDragId.current && over) {
      reorder(touchDragId.current, over);
    }
    touchDragId.current=null; isDragging.current=false;
    setDragging(null); setOver(null);
  };

  const sorted=ord.map(id=>items.find(i=>i.id===id)).filter(Boolean);
  return sorted.map(item=>(
    <div key={item.id}
      data-dragid={item.id}
      draggable
      onDragStart={()=>setDragging(item.id)}
      onDragOver={e=>{e.preventDefault();setOver(item.id);}}
      onDrop={e=>{e.preventDefault();reorder(dragging,item.id);setDragging(null);setOver(null);}}
      onDragEnd={()=>{setDragging(null);setOver(null);}}
      onTouchStart={e=>onTouchStart(e,item.id)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        opacity:dragging===item.id?.35:1,
        outline:over===item.id&&dragging!==item.id?`1.5px dashed ${PALETTE.coreBorder}`:"none",
        borderRadius:12, transition:"opacity .15s",
        touchAction: dragging===item.id?"none":"auto",
      }}>
      {renderItem(item)}
    </div>
  ));
}

// ─── Section header ───────────────────────────────────────
function BlockHeader({blk,desc,done,total,onAdd}) {
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 1px 8px"}}>
      <span style={{fontSize:12,fontWeight:500,color:PALETTE.textPrimary}}>{blk}</span>
      <span style={{fontSize:11,color:PALETTE.textThird}}>· {desc}</span>
      <span style={{marginLeft:"auto",fontSize:11,color:PALETTE.textThird}}>{done}/{total}</span>
      <button onClick={onAdd}
        onMouseEnter={e=>{e.currentTarget.style.background=PALETTE.textPrimary;e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor=PALETTE.textPrimary;}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=PALETTE.textThird;e.currentTarget.style.borderColor=PALETTE.border;}}
        style={{width:22,height:22,borderRadius:"50%",border:`1px solid ${PALETTE.border}`,
          background:"transparent",cursor:"pointer",fontSize:14,
          display:"flex",alignItems:"center",justifyContent:"center",
          color:PALETTE.textThird,transition:"all .15s",marginLeft:4,flexShrink:0}}>+</button>
    </div>
  );
}

// ─── Nav bar (week/month nav) ─────────────────────────────
function NavBar({label,tag,onPrev,onNext,nextDisabled}) {
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
      <NavBtn onClick={onPrev}>‹</NavBtn>
      <div style={{flex:1,textAlign:"center",fontSize:13,fontWeight:500,color:PALETTE.textPrimary}}>
        {label}
        {tag&&<span style={{marginLeft:6,fontSize:10,color:PALETTE.coreFill}}>{tag}</span>}
      </div>
      <NavBtn onClick={onNext} disabled={nextDisabled}>›</NavBtn>
    </div>
  );
}
function NavBtn({children,onClick,disabled}) {
  return(
    <button onClick={disabled?undefined:onClick} style={{
      width:28,height:28,borderRadius:"50%",border:`1px solid ${PALETTE.border}`,
      background:PALETTE.surface,cursor:disabled?"not-allowed":"pointer",
      fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",
      color:disabled?PALETTE.textThird:PALETTE.textPrimary,transition:"all .15s",
    }}>{children}</button>
  );
}

// ─── Mini day pill (weekly strip) ────────────────────────
function DayPill({d,isToday,isPast,score}) {
  const filled = score>0;
  return(
    <div style={{flex:1,borderRadius:10,padding:"8px 2px",textAlign:"center",
      background:isToday?PALETTE.textPrimary:filled?`rgba(83,74,183,${.07+score*.18})`:PALETTE.surface,
      border:`1px solid ${isToday?PALETTE.textPrimary:filled?PALETTE.coreBorder:PALETTE.border}`,
      opacity:isPast?1:.3,transition:"all .2s"}}>
      <div style={{fontSize:9,fontWeight:500,color:isToday?"#fff":PALETTE.textThird,marginBottom:2}}>
        {DAYS_KR[d.getDay()]}
      </div>
      <div style={{fontSize:12,fontWeight:500,color:isToday?"#fff":PALETTE.textPrimary}}>{d.getDate()}</div>
      {isPast&&<div style={{fontSize:9,marginTop:2,color:isToday?"rgba(255,255,255,.7)":filled?PALETTE.coreFill:PALETTE.textThird}}>
        {Math.round(score*100)}
      </div>}
    </div>
  );
}

// ══ MAIN APP ═════════════════════════════════════════════
export default function App() {
  const today    = new Date();
  const todayKey = getDayKey(today);

  const [tab,         setTab]         = useState("daily");
  const [habits,      setHabits]      = useState(()=>{ try{return JSON.parse(localStorage.getItem("hb_calm"))||DEFAULT_HABITS;}catch{return DEFAULT_HABITS;} });
  const [logs,        setLogs]        = useState(()=>{ try{return JSON.parse(localStorage.getItem("lg_calm"))||{};}catch{return {};} });
  const [skips,       setSkips]       = useState(()=>{ try{return JSON.parse(localStorage.getItem("sk_calm"))||{};}catch{return {};} });
  const [globalOrder, setGlobalOrder] = useState(()=>{ try{return JSON.parse(localStorage.getItem("ord_calm"))||null;}catch{return null;} });
  const [weekAnchor,  setWeekAnchor]  = useState(today);
  const [monthAnchor, setMonthAnchor] = useState(today);

  const [showAdd,      setShowAdd]      = useState(false);
  const [editHabit,    setEditHabit]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [retroTarget,  setRetroTarget]  = useState(null);
  const [addBlock,     setAddBlock]     = useState(null);

  useEffect(()=>{ localStorage.setItem("hb_calm",  JSON.stringify(habits));      },[habits]);
  useEffect(()=>{ localStorage.setItem("lg_calm",  JSON.stringify(logs));        },[logs]);
  useEffect(()=>{ localStorage.setItem("sk_calm",  JSON.stringify(skips));       },[skips]);
  useEffect(()=>{ localStorage.setItem("ord_calm", JSON.stringify(globalOrder)); },[globalOrder]);

  const isChecked = (hid,dk) => !!logs[`${dk}_${hid}`];
  const isSkipped = (hid,dk) => !!skips[`${hid}_${dk}`];
  const toggleLog = (hid,dk) => setLogs(p=>({...p,[`${dk}_${hid}`]:!p[`${dk}_${hid}`]}));

  const skipWeekCount = hid => {
    const wk=getWeekKey(today);
    return Object.keys(skips).filter(k=>k.startsWith(`${hid}_wk_${wk}`)).length;
  };
  const handleSkip = (hid,dk) => {
    const wk=getWeekKey(new Date(dk)), alr=isSkipped(hid,dk);
    if(alr){ setSkips(p=>{ const n={...p}; delete n[`${hid}_${dk}`]; delete n[`${hid}_wk_${wk}_${dk}`]; return n; }); }
    else if(skipWeekCount(hid)<SKIP_LIMIT){ setSkips(p=>({...p,[`${hid}_${dk}`]:true,[`${hid}_wk_${wk}_${dk}`]:true})); }
  };

  const getStreak = hid => { let s=0,d=new Date(today); while(isChecked(hid,getDayKey(d))||isSkipped(hid,getDayKey(d))){ s++;d.setDate(d.getDate()-1); } return s; };

  const saveHabit = data => {
    if(editHabit) setHabits(p=>p.map(h=>h.id===editHabit.id?{...h,...data}:h));
    else          setHabits(p=>[...p,{...data,id:Date.now()}]);
    setEditHabit(null);
  };
  const confirmDelete = () => { if(!deleteTarget)return; setHabits(p=>p.filter(h=>h.id!==deleteTarget.id)); setDeleteTarget(null); };

  const orderedBlock = blk => {
    const g=habits.filter(h=>(h.block||"오전")===blk);
    if(!globalOrder) return g;
    return [...g].sort((a,b)=>{ const ai=globalOrder.indexOf(a.id),bi=globalOrder.indexOf(b.id); return (ai===-1?9999:ai)-(bi===-1?9999:bi); });
  };
  const handleReorder = (blk,newOrd) => {
    const ids=habits.filter(h=>(h.block||"오전")===blk).map(h=>h.id);
    const base=globalOrder||habits.map(h=>h.id);
    const without=base.filter(id=>!ids.includes(id));
    const fi=Math.min(...ids.map(id=>{const i=base.indexOf(id);return i===-1?9999:i;}));
    setGlobalOrder([...without.slice(0,fi),...newOrd,...without.slice(fi)]);
  };

  // stats
  const todayScore    = weightedRate(habits, hid=>isChecked(hid,todayKey)||isSkipped(hid,todayKey));
  const doneCount     = habits.filter(h=>isChecked(h.id,todayKey)).length;
  const skippedCount  = habits.filter(h=>isSkipped(h.id,todayKey)).length;
  const coreHabits    = habits.filter(h=>h.priority==="core");
  const coreDone      = coreHabits.filter(h=>isChecked(h.id,todayKey)||isSkipped(h.id,todayKey)).length;
  const allCoreDone   = coreHabits.length>0&&coreDone===coreHabits.length;
  const allDone       = habits.length>0&&(doneCount+skippedCount)===habits.length;

  const weekDays   = getWeekDays(weekAnchor);
  const monthDays  = getMonthDays(monthAnchor);
  const isCurWeek  = getDayKey(startOfWeek(weekAnchor))===getDayKey(startOfWeek(today));
  const isCurMonth = monthAnchor.getFullYear()===today.getFullYear()&&monthAnchor.getMonth()===today.getMonth();
  const rangeRate  = (hid,days) => { const p=days.filter(d=>d<=today); return p.length?p.filter(d=>isChecked(hid,getDayKey(d))||isSkipped(hid,getDayKey(d))).length/p.length:0; };

  const headerMsg = allDone ? "오늘도 수고했어요" : allCoreDone ? "Core 완료" : `${doneCount} / ${habits.length}`;

  return(
    <div style={{minHeight:"100vh",background:PALETTE.bg,
      fontFamily:"-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      maxWidth:480,margin:"0 auto",position:"relative",color:PALETTE.textPrimary}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{display:none}body{background:${PALETTE.bg}}`}</style>

      {/* ── Header ───────────────────────────────────── */}
      <div style={{padding:"52px 22px 18px",background:PALETTE.surface,borderBottom:`1px solid ${PALETTE.border}`}}>
        <div style={{fontSize:11,fontWeight:500,color:PALETTE.textThird,letterSpacing:".07em",marginBottom:6}}>
          {today.getFullYear()}년 {MONTHS_KR[today.getMonth()]} {today.getDate()}일 {DAYS_KR[today.getDay()]}요일
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{flex:1}}>
            <div style={{fontSize:22,fontWeight:500,color:PALETTE.textPrimary,lineHeight:1.2}}>
              {headerMsg}
              {skippedCount>0&&<span style={{fontSize:12,fontWeight:400,color:PALETTE.skipFill,marginLeft:8}}>
                쉬기 {skippedCount}
              </span>}
            </div>
            {coreHabits.length>0&&(
              <div style={{marginTop:8,display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:10,color:PALETTE.textThird}}>core</span>
                <div style={{display:"flex",gap:4}}>
                  {coreHabits.map(h=>(
                    <div key={h.id} style={{width:7,height:7,borderRadius:"50%",
                      background:(isChecked(h.id,todayKey)||isSkipped(h.id,todayKey))?PALETTE.coreFill:PALETTE.coreBg,
                      border:`1px solid ${PALETTE.coreBorder}`,transition:"background .3s"}}/>
                  ))}
                </div>
                <span style={{fontSize:10,color:PALETTE.textThird}}>{coreDone}/{coreHabits.length}</span>
              </div>
            )}
          </div>
          <Ring value={todayScore} size={52} stroke={3}/>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div style={{display:"flex",background:PALETTE.surface,borderBottom:`1px solid ${PALETTE.border}`,padding:"0 18px"}}>
        {[["daily","오늘"],["weekly","주간"],["monthly","월간"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1,padding:"11px 0",border:"none",background:"none",fontFamily:"inherit",
            fontSize:12,fontWeight:tab===t?500:400,
            color:tab===t?PALETTE.textPrimary:PALETTE.textThird,
            borderBottom:tab===t?`1.5px solid ${PALETTE.textPrimary}`:"1.5px solid transparent",
            cursor:"pointer",transition:"all .18s",marginBottom:-1}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div style={{padding:"16px 16px 100px"}}>

        {/* ═ DAILY ═ */}
        {tab==="daily"&&(
          habits.length===0 ? (
            <div style={{textAlign:"center",padding:"52px 0",color:PALETTE.textThird}}>
              <div style={{fontSize:32,marginBottom:12,opacity:.4}}>✦</div>
              <div style={{fontSize:14,marginBottom:4}}>아직 습관이 없어요</div>
              <div style={{fontSize:12,marginBottom:18,color:PALETTE.textThird}}>블록 옆 + 버튼으로 추가하거나</div>
              <button onClick={()=>setHabits(DEFAULT_HABITS)} style={{
                padding:"10px 20px",background:PALETTE.textPrimary,color:"#fff",
                border:"none",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer"}}>
                기본 습관 불러오기
              </button>
            </div>
          ) : (
            BLOCKS.map(({key:blk,desc})=>{
              const group=orderedBlock(blk);
              const blkDone=group.filter(h=>isChecked(h.id,todayKey)||isSkipped(h.id,todayKey)).length;
              return(
                <div key={blk} style={{marginBottom:16}}>
                  <BlockHeader blk={blk} desc={desc} done={blkDone} total={group.length}
                    onAdd={()=>{setAddBlock(blk);setShowAdd(true);}}/>
                  {group.length===0&&(
                    <div style={{fontSize:12,color:PALETTE.textThird,padding:"8px 2px",
                      border:`1px dashed ${PALETTE.border}`,borderRadius:10,textAlign:"center"}}>
                      습관 없음
                    </div>
                  )}
                  <DragList items={group} onReorder={ord=>handleReorder(blk,ord)} renderItem={h=>(
                    <HabitRow
                      habit={h} checked={isChecked(h.id,todayKey)} skipped={isSkipped(h.id,todayKey)}
                      onCheck={()=>toggleLog(h.id,todayKey)} streak={getStreak(h.id)}
                      canSkip={skipWeekCount(h.id)<SKIP_LIMIT&&!isChecked(h.id,todayKey)}
                      skippedThisWeek={skipWeekCount(h.id)}
                      onSkip={()=>handleSkip(h.id,todayKey)}
                      onEdit={()=>setEditHabit(h)} onDelete={()=>setDeleteTarget(h)}
                      onRetro={()=>setRetroTarget(h)} dateKey={todayKey}
                    />
                  )}/>
                </div>
              );
            })
          )
        )}

        {/* ═ WEEKLY ═ */}
        {tab==="weekly"&&(
          <>
            <NavBar
              label={`${MONTHS_KR[weekDays[0].getMonth()]} ${weekDays[0].getDate()}일 — ${weekDays[6].getDate()}일`}
              tag={isCurWeek?"이번 주":null}
              onPrev={()=>setWeekAnchor(addDays(weekAnchor,-7))}
              onNext={()=>{if(!isCurWeek)setWeekAnchor(addDays(weekAnchor,7));}}
              nextDisabled={isCurWeek}/>

            <div style={{display:"flex",gap:5,marginBottom:18}}>
              {weekDays.map((d,i)=>{
                const dk=getDayKey(d);
                return <DayPill key={i} d={d} isToday={dk===todayKey} isPast={d<=today}
                  score={weightedRate(habits,hid=>isChecked(hid,dk)||isSkipped(hid,dk))}/>;
              })}
            </div>

            {BLOCKS.map(({key:blk})=>{
              const group=habits.filter(h=>(h.block||"오전")===blk);
              if(!group.length) return null;
              return(
                <div key={blk} style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:500,color:PALETTE.textThird,
                    padding:"2px 1px 7px",letterSpacing:".05em"}}>{blk}</div>
                  {group.map(h=>{
                    const rate=rangeRate(h.id,weekDays);
                    return(
                      <div key={h.id} style={{background:PALETTE.surface,borderRadius:12,padding:"11px 13px",
                        marginBottom:6,border:`1px solid ${PALETTE.border}`}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          
                          <span style={{fontWeight:400,flex:1,fontSize:13,color:PALETTE.textPrimary}}>{h.name}</span>
                          <PrioDot priority={h.priority}/>
                          <span style={{fontSize:12,fontWeight:500,color:rate>0?PALETTE.coreFill:PALETTE.textThird}}>
                            {Math.round(rate*100)}%
                          </span>
                        </div>
                        <div style={{display:"flex",gap:4}}>
                          {weekDays.map((d,i)=>{
                            const dk=getDayKey(d),done=isChecked(h.id,dk),skip=isSkipped(h.id,dk),isPast=d<=today;
                            return(
                              <div key={i} onClick={()=>{if(isPast)toggleLog(h.id,dk);}}
                                title={isPast?"탭해서 수정":""}
                                style={{flex:1,height:26,borderRadius:6,cursor:isPast?"pointer":"default",
                                  background:skip?PALETTE.skipBg:done?PALETTE.coreFill:isPast?PALETTE.doneBg:"transparent",
                                  border:`1px solid ${skip?"#F5D790":done?PALETTE.coreFill:PALETTE.border}`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  fontSize:9,fontWeight:500,
                                  color:skip?PALETTE.skipFill:done?"#fff":PALETTE.textThird,
                                  transition:"all .15s"}}>
                                {skip?"·":DAYS_KR[d.getDay()]}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}

        {/* ═ MONTHLY ═ */}
        {tab==="monthly"&&(
          <>
            <NavBar
              label={`${monthAnchor.getFullYear()}년 ${MONTHS_KR[monthAnchor.getMonth()]}`}
              tag={isCurMonth?"이번 달":null}
              onPrev={()=>{const d=new Date(monthAnchor);d.setMonth(d.getMonth()-1);setMonthAnchor(d);}}
              onNext={()=>{if(!isCurMonth){const d=new Date(monthAnchor);d.setMonth(d.getMonth()+1);setMonthAnchor(d);}}}
              nextDisabled={isCurMonth}/>

            {/* Summary */}
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {PRIO_ORDER.map(pk=>{
                const g=habits.filter(h=>(h.priority||"regular")===pk);
                if(!g.length) return null;
                const past=monthDays.filter(d=>d<=today);
                const avg=past.length?past.reduce((s,d)=>s+weightedRate(g,hid=>isChecked(hid,getDayKey(d))||isSkipped(hid,getDayKey(d))),0)/past.length:0;
                const dotColor=pk==="core"?PALETTE.coreFill:pk==="regular"?"#9E9E9B":PALETTE.border;
                return(
                  <div key={pk} style={{flex:1,background:PALETTE.surface,borderRadius:10,
                    padding:"10px 12px",border:`1px solid ${PALETTE.border}`,textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:500,color:pk==="core"?PALETTE.coreFill:PALETTE.textPrimary}}>
                      {Math.round(avg*100)}%
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginTop:3}}>
                      <PrioDot priority={pk}/>
                      <span style={{fontSize:10,color:PALETTE.textThird}}>{PRIORITY[pk].label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {BLOCKS.map(({key:blk})=>{
              const group=habits.filter(h=>(h.block||"오전")===blk);
              if(!group.length) return null;
              return(
                <div key={blk} style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:500,color:PALETTE.textThird,
                    padding:"2px 1px 7px",letterSpacing:".05em"}}>{blk}</div>
                  {group.map(h=>{
                    const rate=rangeRate(h.id,monthDays);
                    const first=new Date(monthAnchor.getFullYear(),monthAnchor.getMonth(),1).getDay();
                    return(
                      <div key={h.id} style={{background:PALETTE.surface,borderRadius:12,padding:"10px 13px",
                        marginBottom:6,border:`1px solid ${PALETTE.border}`}}>
                        {/* 헤더 */}
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                          <span style={{fontWeight:400,flex:1,fontSize:13,color:PALETTE.textPrimary}}>{h.name}</span>
                          <PrioDot priority={h.priority}/>
                          <span style={{fontSize:12,fontWeight:500,color:rate>0?PALETTE.coreFill:PALETTE.textThird,marginLeft:4}}>
                            {Math.round(rate*100)}%
                          </span>
                        </div>
                        {/* 요일 레이블 */}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
                          {DAYS_KR.map(d=>(
                            <div key={d} style={{textAlign:"center",fontSize:8,color:PALETTE.textThird,fontWeight:500}}>{d}</div>
                          ))}
                        </div>
                        {/* 점 히트맵 */}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                          {Array.from({length:first}).map((_,i)=><div key={`e${i}`}/>)}
                          {monthDays.map((d,i)=>{
                            const dk=getDayKey(d),done=isChecked(h.id,dk),skip=isSkipped(h.id,dk);
                            const isPast=d<=today,isT=dk===todayKey;
                            return(
                              <div key={i} onClick={()=>{if(isPast)toggleLog(h.id,dk);}}
                                style={{display:"flex",alignItems:"center",justifyContent:"center",
                                  height:14,cursor:isPast?"pointer":"default"}}>
                                <div style={{
                                  width:isT?9:7, height:isT?9:7,
                                  borderRadius:"50%",
                                  background:skip?PALETTE.skipFill:done?PALETTE.coreFill:isPast?PALETTE.doneBorder:"transparent",
                                  border:isT?`1.5px solid ${PALETTE.textPrimary}`:done||skip?"none":`0.5px solid ${PALETTE.border}`,
                                  transition:"background .12s",
                                  opacity:isPast?1:.25,
                                }}/>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── FAB ──────────────────────────────────────── */}
      <button onClick={()=>{setAddBlock(null);setShowAdd(true);}}
        style={{position:"fixed",bottom:30,right:"calc(50% - 240px + 20px)",
          width:46,height:46,borderRadius:"50%",
          background:PALETTE.textPrimary,color:"#fff",
          border:"none",fontSize:22,cursor:"pointer",
          boxShadow:"0 4px 20px rgba(0,0,0,.14)",
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"transform .2s, box-shadow .2s",zIndex:100}}
        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.08)";e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,.2)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.14)";}}>
        +
      </button>

      {/* ── Modals ───────────────────────────────────── */}
      {showAdd      && <HabitModal onSave={saveHabit} onClose={()=>{setShowAdd(false);setAddBlock(null);}} initial={addBlock?{block:addBlock}:null}/>}
      {editHabit    && <HabitModal onSave={saveHabit} initial={editHabit} onClose={()=>setEditHabit(null)}/>}
      {deleteTarget && <DeleteConfirm habit={deleteTarget} onConfirm={confirmDelete} onCancel={()=>setDeleteTarget(null)}/>}
      {retroTarget  && <RetroModal habit={retroTarget} logs={logs} onToggle={toggleLog} onClose={()=>setRetroTarget(null)}/>}
    </div>
  );
}
