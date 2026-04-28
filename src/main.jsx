import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel, DEFAULT_SECTIONS, SectionTab } from 'polotno/side-panel';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { observer } from 'mobx-react-lite';

const CLOUD_NAME = 'dm1rqkqbj';
const TAG = 'etoo';
const SHEET_ID = '16JedVrzxqrFtBaN5YANB-i-Ry-Tq252_Gf6XB4pnOpM';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
const DEFAULT_TEMPLATE_ID = 'tpl_008';
const LOGO_URL = 'https://res.cloudinary.com/dm1rqkqbj/image/upload/v1776926903/%ED%9A%8C%EC%82%AC%EB%A1%9C%EA%B3%A0_tp7ewe.png';

const store = createStore({ key: '', showCredit: true });

// ─── CSV 파싱 ─────────────────────────────────────────────────────────────
function splitCsvLine(line) {
  const cols = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
    else cur += ch;
  }
  cols.push(cur); return cols;
}

function parseCsv(text) {
  const results = []; const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    let qc = (line.match(/"/g)||[]).length;
    while (qc % 2 !== 0 && i+1 < lines.length) { i++; line += '\n'+lines[i]; qc = (line.match(/"/g)||[]).length; }
    const cols = splitCsvLine(line);
    const id = cols[0]?.trim(); if (!id) continue;
    const rawJson = cols[4]?.trim() || '';
    const cleanJson = (() => {
      const ESC = {'\n':'\\n','\r':'\\r','\t':'\\t','\b':'\\b','\f':'\\f'};
      let out='',inStr=false,i=0;
      while(i<rawJson.length){
        const ch=rawJson[i];
        if(inStr){
          if(ch==='\\'){out+=ch+(rawJson[i+1]??'');i+=2;continue;}
          else if(ch==='"'){let j=i+1;while(j<rawJson.length&&' \n\r\t'.includes(rawJson[j]))j++;const nx=rawJson[j];if(!nx||',}]:'.includes(nx)){inStr=false;out+=ch;}else out+='\\\"';}
          else if(ch.charCodeAt(0)<0x20){out+=ESC[ch]??`\\u${ch.charCodeAt(0).toString(16).padStart(4,'0')}`;}
          else out+=ch;
        } else {
          if(ch==='"'){inStr=true;out+=ch;}
          else if(ch.charCodeAt(0)<0x20&&ch!=='\n'&&ch!=='\r'&&ch!=='\t')out+=' ';
          else out+=ch;
        }
        i++;
      }
      return out;
    })();
    results.push({ id, name:cols[1]?.trim()||'', category:cols[2]?.trim()||'기타', thumbnail:cols[3]?.trim()||'', json_data:cleanJson });
  }
  return results;
}

async function fetchTemplates() {
  const resp = await fetch(SHEET_URL);
  if (!resp.ok) throw new Error('시트 불러오기 실패: ' + resp.status);
  return parseCsv(await resp.text());
}

function applyTemplate(jsonData) {
  try { store.loadJSON(typeof jsonData==='string'?JSON.parse(jsonData):jsonData); }
  catch(e) { throw new Error('JSON 파싱 실패: '+e.message); }
}

async function loadDefaultTemplate() {
  try {
    const list = await fetchTemplates();
    const def = list.find(t => t.id === DEFAULT_TEMPLATE_ID);
    if (def?.json_data) applyTemplate(def.json_data); else store.addPage();
  } catch(e) { console.warn('기본 템플릿 로드 실패:', e.message); store.addPage(); }
}
loadDefaultTemplate();

// ─── Auto-Fit: 텍스트 너비 초과 시 자동 폰트 축소 ────────────────────────
function measureTextWidth(text, fontSize, fontFamily, fontWeight, letterSpacing) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontWeight||'normal'} ${fontSize}px ${fontFamily||'Roboto'}`;
  const lines = text.split('\n');
  let maxW = 0;
  lines.forEach(line => {
    let w = 0;
    for (const ch of line) {
      w += ctx.measureText(ch).width + (letterSpacing || 0);
    }
    if (w > maxW) maxW = w;
  });
  return maxW;
}

function autoFitFontSize(el) {
  if (!el || el.type !== 'text') return;
  const text = el.text || '';
  if (!text.trim()) return;
  const maxWidth = Math.min(el.width, store.width) * 0.98;
  let fontSize = el.fontSize;
  let measured = measureTextWidth(text, fontSize, el.fontFamily, el.fontWeight, el.letterSpacing);
  if (measured > maxWidth) {
    while (measured > maxWidth && fontSize > 1) {
      fontSize -= 1;
      measured = measureTextWidth(text, fontSize, el.fontFamily, el.fontWeight, el.letterSpacing);
    }
    el.set({ fontSize });
  }
}

let autoFitTimer = null;
function setupAutoFit() {
  const check = () => {
    const page = store.activePage;
    if (!page) return;
    page.children.forEach(el => {
      if (el.type === 'text') {
        const prevText = el._prevText;
        if (prevText !== el.text) {
          el._prevText = el.text;
          clearTimeout(autoFitTimer);
          autoFitTimer = setTimeout(() => autoFitFontSize(el), 300);
        }
      }
    });
  };
  setInterval(check, 200);
}
setupAutoFit();

// ─── 캔버스 리사이즈 (Magic Resize: 요소 비율 자동 조정) ─────────────────
function resizeCanvas(newW, newH) {
  const page = store.activePage; if (!page) return;
  const oldW = store.width, oldH = store.height;
  if (oldW === newW && oldH === newH) return;
  const scaleX = newW / oldW, scaleY = newH / oldH;

  // 1) 먼저 캔버스 크기 변경
  store.setSize(newW, newH);

  // 2) 이후 모든 요소를 비율에 맞게 재배치 (Magic Resize)
  page.children.forEach(el => {
    const updates = {
      x: el.x * scaleX,
      y: el.y * scaleY,
      width: el.width * scaleX,
      height: el.height * scaleY,
    };
    if (el.type === 'text') {
      updates.fontSize = Math.max(1, Math.round(el.fontSize * Math.min(scaleX, scaleY)));
    }
    el.set(updates);
  });
}

// ─── 사이즈 입력 (Magic Resize 항상 적용) ────────────────────────────────
const SizeInput = observer(() => {
  const [w, setW] = useState(store.width || 6000);
  const [h, setH] = useState(store.height || 900);
  useEffect(() => { setW(store.width); setH(store.height); }, [store.width, store.height]);
  const apply = () => {
    const nw = parseInt(w), nh = parseInt(h);
    if (!nw || !nh || nw < 100 || nh < 100) { alert('최소 100 이상 입력해주세요.'); return; }
    resizeCanvas(nw, nh); // Magic Resize 항상 적용
  };
  const inp = {
    width:88, padding:'6px 8px', borderRadius:6,
    border:'1px solid #334155', fontSize:14, fontWeight:500,
    textAlign:'center', background:'#1e293b', color:'#f1f5f9', outline:'none',
  };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 8px',
      background:'rgba(255,255,255,0.04)', borderRadius:8, height:36, marginRight:4 }}>
      <span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>사이즈</span>
      <input type="number" value={w} onChange={e=>setW(e.target.value)}
        onKeyDown={e=>e.key==='Enter'&&apply()} style={inp} min={100} placeholder="가로"/>
      <span style={{ fontSize:13, color:'#475569', fontWeight:500 }}>×</span>
      <input type="number" value={h} onChange={e=>setH(e.target.value)}
        onKeyDown={e=>e.key==='Enter'&&apply()} style={inp} min={100} placeholder="세로"/>
      <span style={{ fontSize:12, color:'#64748b' }}>mm</span>
      <button onClick={apply} style={{
        padding:'6px 14px', borderRadius:6, background:'#2563eb', color:'#fff',
        border:'none', cursor:'pointer', fontSize:13, fontWeight:700, height:32,
      }}>적용</button>
    </div>
  );
});

// ─── 코치마크 (크기 확대) ────────────────────────────────────────────────
function CoachMark({ onDone }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const steps = [
    {
      top: '50%', left: '50%', transform: 'translate(-50%, -60%)',
      arrow: 'down',
      text: '글자를 더블클릭해서\n원하는 문구로 수정해 보세요!',
    },
    {
      top: '50%', left: '90px', transform: 'translateY(-50%)',
      arrow: 'left',
      text: '준비된 디자인을 선택해서\n간단한 수정으로 발주하세요!',
    },
  ];

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDone, 400);
  }, [onDone]);

  useEffect(() => {
    const t = setTimeout(dismiss, 5000);
    window.addEventListener('mousemove', dismiss, { once: true });
    window.addEventListener('click', dismiss, { once: true });
    return () => { clearTimeout(t); window.removeEventListener('mousemove', dismiss); window.removeEventListener('click', dismiss); };
  }, [step, dismiss]);

  const cur = steps[step];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, pointerEvents:'none',
      opacity:visible?1:0, transition:'opacity 0.4s ease' }}>
      <div style={{
        position:'absolute', top:cur.top, left:cur.left, transform:cur.transform,
        background:'rgba(15,23,42,0.95)', border:'2px solid #3b82f6',
        borderRadius:16, padding:'22px 30px', maxWidth:320,   /* ← 크기 확대 */
        boxShadow:'0 8px 40px rgba(59,130,246,0.25)',
        animation:'coach-in 0.4s cubic-bezier(.34,1.56,.64,1)',
      }}>
        {cur.arrow === 'down' && (
          <div style={{ position:'absolute', bottom:-12, left:'50%', transform:'translateX(-50%)',
            width:0, height:0, borderLeft:'12px solid transparent', borderRight:'12px solid transparent',
            borderTop:'12px solid #3b82f6' }}/>
        )}
        {cur.arrow === 'left' && (
          <div style={{ position:'absolute', left:-12, top:'50%', transform:'translateY(-50%)',
            width:0, height:0, borderTop:'12px solid transparent', borderBottom:'12px solid transparent',
            borderRight:'12px solid #3b82f6' }}/>
        )}
        <div style={{ fontSize:16, color:'#f8fafc', lineHeight:1.8, whiteSpace:'pre-line', textAlign:'center', fontWeight:500 }}>
          {cur.text}
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:7, marginTop:14 }}>
          {steps.map((_,i) => (
            <div key={i} style={{ width:8, height:8, borderRadius:'50%',
              background:i===step?'#3b82f6':'#334155', transition:'background 0.2s' }}/>
          ))}
        </div>
      </div>
      <style>{`@keyframes coach-in{from{opacity:0;transform:${cur.transform} scale(0.85)}to{opacity:1;transform:${cur.transform} scale(1)}}`}</style>
    </div>
  );
}

// ─── 팔레트 ──────────────────────────────────────────────────────────────
const PALETTE = [
  '#000000','#ffffff','#1a1a1a','#555555','#888888','#bbbbbb',
  '#E53935','#EF5350','#FF7043','#FF8A65','#FFCCBC','#FFEBEE',
  '#FB8C00','#FFA726','#FFD54F','#FFF176','#FFF9C4','#FFFDE7',
  '#43A047','#66BB6A','#A5D6A7','#00ACC1','#80DEEA','#E0F7FA',
  '#1E88E5','#42A5F5','#90CAF9','#1565C0','#0D47A1','#E3F2FD',
  '#8E24AA','#AB47BC','#CE93D8','#EC407A','#F48FB1','#FCE4EC',
  '#6D4C41','#8D6E63','#BCAAA4','#546E7A','#B0BEC5','#ECEFF1',
];

// ─── 플로팅 패널 (글자색 흰색) ──────────────────────────────────────────
function FloatingPanel({ store }) {
  const dragRef = useRef({ dragging:false, ox:0, oy:0 });
  const [pos, setPos]   = useState({ x: window.innerWidth - 260, y: 80 });
  const [open, setOpen] = useState(true);
  const [tab, setTab]   = useState('font');
  const [sel, setSel]   = useState(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const check = () => {
      const el = store.selectedElements?.[0] || null;
      setSel(el);
      setShowPanel(el?.type === 'text' || el?.type === 'image' || el?.type === 'svg');
    };
    check();
    const iv = setInterval(check, 200);
    return () => clearInterval(iv);
  }, []);

  const onMouseDown = useCallback((e) => {
    if (e.target.closest('.fp-content')) return;
    dragRef.current = { dragging:true, ox: e.clientX - pos.x, oy: e.clientY - pos.y };
    const move = (e) => { if (!dragRef.current.dragging) return; setPos({ x: e.clientX - dragRef.current.ox, y: e.clientY - dragRef.current.oy }); };
    const up = () => { dragRef.current.dragging = false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [pos]);

  if (!showPanel) return null;

  const isText = sel?.type === 'text';
  const setFontSize      = (v) => { if (isText) sel.set({ fontSize: Math.max(1, parseInt(v)||1) }); };
  const setColor         = (v) => { if (isText) sel.set({ fill: v }); };
  const setAlign         = (v) => { if (isText) sel.set({ align: v }); };
  const toggleBold       = ()  => { if (isText) sel.set({ fontWeight: sel.fontWeight==='bold'?'normal':'bold' }); };
  const toggleItalic     = ()  => { if (isText) sel.set({ fontStyle: sel.fontStyle==='italic'?'normal':'italic' }); };
  const setLetterSpacing = (v) => { if (isText) sel.set({ letterSpacing: parseFloat(v) }); };
  const setLineHeight    = (v) => { if (isText) sel.set({ lineHeight: parseFloat(v) }); };
  const doAutoFit        = ()  => { if (isText) autoFitFontSize(sel); };

  // 라벨 공통 스타일 (흰색)
  const labelStyle = { fontSize:10, color:'#ffffff', width:44, flexShrink:0, fontWeight:600 };

  return (
    <div style={{
      position:'fixed', left:pos.x, top:pos.y, width:248, zIndex:8000,
      background:'#1e293b', border:'1px solid #334155', borderRadius:12,
      boxShadow:'0 8px 32px rgba(0,0,0,0.5)', userSelect:'none',
    }}>
      <div onMouseDown={onMouseDown} style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 10px', cursor:'grab', borderBottom:'1px solid #334155',
        borderRadius:'12px 12px 0 0', background:'#0f172a',
      }}>
        <div style={{ display:'flex', gap:4 }}>
          {[['font','폰트'],['palette','팔레트'],['quick','빠른작업']].map(([t,l]) => (
            <button key={t} onClick={e=>{e.stopPropagation();setTab(t);}} style={{
              padding:'3px 8px', borderRadius:5, fontSize:10, fontWeight:700, border:'none', cursor:'pointer',
              background:tab===t?'#2563eb':'transparent',
              color:tab===t?'#ffffff':'#94a3b8',  /* 흰색 계열 */
            }}>{l}</button>
          ))}
        </div>
        <button onClick={()=>setOpen(o=>!o)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:13, padding:'0 4px' }}>
          {open?'▲':'▼'}
        </button>
      </div>

      {open && (
        <div className="fp-content" style={{ padding:'10px 12px' }}>

          {tab === 'font' && isText && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {/* 폰트 크기 + Auto-Fit */}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={labelStyle}>크기</span>
                <input type="number" value={sel?.fontSize||40}
                  onChange={e=>setFontSize(e.target.value)}
                  style={{ width:52, padding:'4px 4px', borderRadius:5, border:'1px solid #334155',
                    background:'#0f172a', color:'#ffffff', fontSize:12, textAlign:'center', outline:'none' }}
                />
                <input type="range" min={1} max={800} value={sel?.fontSize||40}
                  onChange={e=>setFontSize(e.target.value)} style={{ flex:1 }}/>
                <button onClick={doAutoFit} title="텍스트 박스에 맞게 자동 조절"
                  style={{ padding:'3px 6px', borderRadius:5, fontSize:10, fontWeight:700,
                    border:'1px solid #334155', background:'#0f172a', color:'#60a5fa',
                    cursor:'pointer', whiteSpace:'nowrap' }}>
                  Auto
                </button>
              </div>
              {/* 자간 */}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={labelStyle}>자간</span>
                <input type="number" value={sel?.letterSpacing||0} step={0.5}
                  onChange={e=>setLetterSpacing(e.target.value)}
                  style={{ width:52, padding:'4px 4px', borderRadius:5, border:'1px solid #334155',
                    background:'#0f172a', color:'#ffffff', fontSize:12, textAlign:'center', outline:'none' }}
                />
                <input type="range" min={-5} max={20} step={0.5} value={sel?.letterSpacing||0}
                  onChange={e=>setLetterSpacing(e.target.value)} style={{ flex:1 }}/>
              </div>
              {/* 줄간격 */}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={labelStyle}>줄간격</span>
                <input type="number" value={sel?.lineHeight||1.2} step={0.1}
                  onChange={e=>setLineHeight(e.target.value)}
                  style={{ width:52, padding:'4px 4px', borderRadius:5, border:'1px solid #334155',
                    background:'#0f172a', color:'#ffffff', fontSize:12, textAlign:'center', outline:'none' }}
                />
                <input type="range" min={0.5} max={3} step={0.1} value={sel?.lineHeight||1.2}
                  onChange={e=>setLineHeight(e.target.value)} style={{ flex:1 }}/>
              </div>
              {/* 굵기/기울기 */}
              <div style={{ display:'flex', gap:5 }}>
                {[
                  { label:'B', active:sel?.fontWeight==='bold', fn:toggleBold, st:{fontWeight:'bold'} },
                  { label:'I', active:sel?.fontStyle==='italic', fn:toggleItalic, st:{fontStyle:'italic'} },
                ].map(({label,active,fn,st})=>(
                  <button key={label} onClick={fn} style={{
                    flex:1, padding:'5px', borderRadius:6, fontSize:14,
                    border:active?'1.5px solid #3b82f6':'1px solid #334155',
                    background:active?'rgba(59,130,246,0.15)':'#0f172a',
                    color:active?'#60a5fa':'#ffffff',  /* 흰색 */
                    cursor:'pointer', ...st,
                  }}>{label}</button>
                ))}
              </div>
              {/* 정렬 */}
              <div style={{ display:'flex', gap:4 }}>
                {['left','center','right'].map(a=>(
                  <button key={a} onClick={()=>setAlign(a)} style={{
                    flex:1, padding:'5px', borderRadius:6, fontSize:13,
                    border:sel?.align===a?'1.5px solid #3b82f6':'1px solid #334155',
                    background:sel?.align===a?'rgba(59,130,246,0.15)':'#0f172a',
                    color:sel?.align===a?'#60a5fa':'#ffffff',  /* 흰색 */
                    cursor:'pointer',
                  }}>{a==='left'?'◀':a==='center'?'■':'▶'}</button>
                ))}
              </div>
              {/* 색상 */}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={labelStyle}>색상</span>
                <input type="color" value={sel?.fill||'#000000'}
                  onChange={e=>setColor(e.target.value)}
                  style={{ width:32, height:26, borderRadius:5, border:'1px solid #334155', background:'none', cursor:'pointer', padding:2 }}
                />
                <span style={{ fontSize:11, color:'#ffffff', fontFamily:'monospace' }}>{sel?.fill||'#000000'}</span>
              </div>
            </div>
          )}

          {tab === 'palette' && (
            <div>
              <div style={{ fontSize:10, color:'#ffffff', marginBottom:8 }}>클릭하면 선택된 텍스트에 색상이 적용됩니다</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap:3 }}>
                {PALETTE.map(c => (
                  <div key={c} onClick={()=>{ if(isText) setColor(c); }} title={c}
                    style={{
                      width:'100%', aspectRatio:'1/1', borderRadius:3, background:c, cursor:'pointer',
                      border:sel?.fill===c?'2px solid #3b82f6':'1px solid rgba(255,255,255,0.08)',
                      transition:'transform 0.1s', boxSizing:'border-box',
                    }}
                    onMouseEnter={e=>e.currentTarget.style.transform='scale(1.2)'}
                    onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                  />
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10 }}>
                <span style={{ fontSize:10, color:'#ffffff', fontWeight:600 }}>직접 입력</span>
                <input type="color" value={sel?.fill||'#000000'}
                  onChange={e=>{ if(isText) setColor(e.target.value); }}
                  style={{ width:32, height:26, borderRadius:5, border:'1px solid #334155', background:'none', cursor:'pointer', padding:2 }}
                />
                <input type="text" placeholder="#000000" value={sel?.fill||''}
                  onChange={e=>{ if(isText && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) setColor(e.target.value); }}
                  style={{ flex:1, padding:'4px 6px', borderRadius:5, border:'1px solid #334155',
                    background:'#0f172a', color:'#ffffff', fontSize:11, outline:'none', fontFamily:'monospace' }}
                />
              </div>
            </div>
          )}

          {tab === 'quick' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
              {[
                { label:'앞으로',    icon:'⬆', action: ()=> sel && store.activePage.moveElementUp?.(sel.id) },
                { label:'뒤로',     icon:'⬇', action: ()=> sel && store.activePage.moveElementDown?.(sel.id) },
                { label:'복제',     icon:'⧉', action: ()=> sel && sel.clone?.() },
                { label:'삭제',     icon:'✕', action: ()=> sel && sel.remove?.(), danger:true },
                { label:'가로 중앙', icon:'↔', action: ()=> { if(sel) sel.set({ x: (store.width - sel.width)/2 }); } },
                { label:'세로 중앙', icon:'↕', action: ()=> { if(sel) sel.set({ y: (store.height - sel.height)/2 }); } },
                { label:'실행취소', icon:'↩', action: ()=> store.history?.undo?.() },
                { label:'다시실행', icon:'↪', action: ()=> store.history?.redo?.() },
              ].map(({label,icon,action,danger})=>(
                <button key={label} onClick={action} style={{
                  padding:'7px 4px', borderRadius:7, fontSize:10, fontWeight:600,
                  border:'1px solid '+(danger?'#7f1d1d':'#334155'),
                  background:danger?'rgba(127,29,29,0.2)':'#0f172a',
                  color:danger?'#f87171':'#ffffff',  /* 흰색 */
                  cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                }}>
                  <span style={{ fontSize:14 }}>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 아이콘 ──────────────────────────────────────────────────────────────
const TemplateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
  </svg>
);
const PhotoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
  </svg>
);

// ─── 템플릿 섹션 ─────────────────────────────────────────────────────────
const TemplateSection = {
  name: 'templates',
  Tab: (props) => <SectionTab name="템플릿" {...props}><TemplateIcon /></SectionTab>,
  Panel: observer(({ store }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading]     = useState(false);
    const [applying, setApplying]   = useState('');
    const [error, setError]         = useState('');
    const [category, setCategory]   = useState('전체');

    const load = async () => {
      setLoading(true); setError('');
      try { setTemplates(await fetchTemplates()); }
      catch(e) { setError(e.message); }
      finally { setLoading(false); }
    };
    useEffect(()=>{ load(); },[]);

    const handleApply = async (tpl) => {
      setApplying(tpl.id);
      try { applyTemplate(tpl.json_data); }
      catch(e) { alert('템플릿 적용 실패: '+e.message); }
      finally { setApplying(''); }
    };

    const CAT_ICONS = {
      '전체':   <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.4"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>,
      '배너':   <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.4"><rect x="1" y="3" width="12" height="8" rx="1.2"/><line x1="4" y1="6.5" x2="10" y2="6.5"/><line x1="4" y1="8.5" x2="8" y2="8.5"/></svg>,
      '보드':   <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.4"><rect x="2" y="1" width="10" height="12" rx="1.2"/><line x1="4.5" y1="4.5" x2="9.5" y2="4.5"/><line x1="4.5" y1="7" x2="9.5" y2="7"/><line x1="4.5" y1="9.5" x2="7.5" y2="9.5"/></svg>,
      '현수막': <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.4"><rect x="1" y="4" width="12" height="6" rx="1.2"/><line x1="3" y1="6.5" x2="11" y2="6.5"/><line x1="3" y1="8.5" x2="8" y2="8.5"/></svg>,
      '기타':   <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.4"><circle cx="3" cy="7" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="11" cy="7" r="1"/></svg>,
    };
    const getIcon = (cat) => CAT_ICONS[cat] || CAT_ICONS['기타'];
    const categories = ['전체', ...new Set(templates.map(t=>t.category))];
    const filtered = category==='전체' ? templates : templates.filter(t=>t.category===category);
    const isWide = (t) => t.category==='현수막';
    const wideItems = filtered.filter(isWide);
    const normalItems = filtered.filter(t=>!isWide(t));

    const TplCard = ({ tpl, fullWidth }) => (
      <div onClick={()=>handleApply(tpl)} style={{
        cursor:'pointer', borderRadius:7, overflow:'hidden',
        border:applying===tpl.id?'2px solid #3b82f6':'1px solid #2d3748',
        background:'#1a2236',
        opacity:applying&&applying!==tpl.id?0.4:1,
        transition:'opacity 0.15s, border-color 0.15s',
      }}>
        {tpl.thumbnail
          ? <img src={tpl.thumbnail} alt={tpl.name} style={{ width:'100%', height:'auto', display:'block' }}/>
          : <div style={{ width:'100%', height:fullWidth?60:80, background:'#2d3748', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.4"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            </div>
        }
        <div style={{ padding:'5px 7px' }}>
          <div style={{ fontSize:10, color:'#64748b', marginBottom:1 }}>{tpl.category}</div>
          <div style={{ fontSize:11, color:'#e2e8f0', fontWeight:600, lineHeight:1.3 }}>
            {applying===tpl.id?'적용 중…':tpl.name}
          </div>
        </div>
      </div>
    );

    return (
      <div style={{ padding:'8px', height:'100%', overflowY:'auto' }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:10 }}>
          {categories.map(cat=>(
            <button key={cat} onClick={()=>setCategory(cat)} style={{
              display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:20,
              border:category===cat?'1.5px solid #3b82f6':'1.5px solid transparent',
              background:category===cat?'rgba(59,130,246,0.18)':'#1e293b',
              color:'#fff', cursor:'pointer', fontSize:11, fontWeight:600, transition:'all 0.15s',
            }}>{getIcon(cat)}{cat}</button>
          ))}
        </div>
        {error && <div style={{ color:'#f87171', padding:'6px 8px', fontSize:11, background:'rgba(248,113,113,0.08)', borderRadius:6, marginBottom:8 }}>⚠ {error}</div>}
        {loading && <div style={{ color:'#64748b', padding:8, fontSize:12, textAlign:'center' }}>불러오는 중…</div>}
        {wideItems.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:normalItems.length>0?10:0 }}>
            {wideItems.map(tpl=><TplCard key={tpl.id} tpl={tpl} fullWidth/>)}
          </div>
        )}
        {normalItems.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {normalItems.map(tpl=><TplCard key={tpl.id} tpl={tpl}/>)}
          </div>
        )}
        <button onClick={load} style={{ width:'100%', marginTop:12, padding:'7px', background:'#1e293b', color:'#fff',
          border:'1px solid #2d3748', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:500,
          display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 7A5 5 0 1 1 9.5 2.5"/><polyline points="9.5 1 9.5 3.5 12 3.5"/>
          </svg>
          목록 새로고침
        </button>
      </div>
    );
  }),
};

// ─── 내 사진 섹션 ─────────────────────────────────────────────────────────
async function fetchCloudinaryImages() {
  const resp = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${TAG}.json`);
  if (!resp.ok) throw new Error('이미지 목록 불러오기 실패: ' + resp.status);
  const data = await resp.json();
  return data.resources.map(r=>({
    url:   `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${r.public_id}.${r.format}`,
    thumb: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_200,h_200,c_fill/${r.public_id}.${r.format}`,
    width: r.width, height: r.height, name: r.public_id,
  }));
}

const CloudinarySection = {
  name: 'cloudinary-photos',
  Tab: (props) => <SectionTab name="내 사진" {...props}><PhotoIcon /></SectionTab>,
  Panel: observer(({ store }) => {
    const [images, setImages]   = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const load = async () => {
      setLoading(true); setError('');
      try { setImages(await fetchCloudinaryImages()); }
      catch(e) { setError(e.message); }
      finally { setLoading(false); }
    };
    useEffect(()=>{ load(); },[]);
    const handleSelect = (img) => {
      store.activePage.addElement({ type:'image', src:img.url, x:100, y:100,
        width:Math.min(img.width,1200), height:Math.min(img.height,800) });
    };
    return (
      <div style={{ padding:'8px', height:'100%', overflowY:'auto' }}>
        {error && <div style={{ color:'#f87171', padding:8, fontSize:12 }}>⚠️ {error}</div>}
        <ImagesGrid images={images} getPreview={img=>img.thumb}
          isLoading={loading&&images.length===0} onSelect={handleSelect} rowsNumber={2}/>
        <button onClick={load} style={{ width:'100%', marginTop:8, padding:'6px',
          background:'#475569', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:12 }}>
          🔄 새로고침
        </button>
      </div>
    );
  }),
};

// ─── 섹션 구성 (resize, draw 제거) ──────────────────────────────────────
const REMOVE_SECTIONS = ['resize', 'draw'];
const customSections = [
  TemplateSection,
  ...DEFAULT_SECTIONS
    .filter(s => !REMOVE_SECTIONS.includes(s.name) && s.name !== 'templates')
    .map(s => s.name === 'photos' ? CloudinarySection : s),
];

// ─── 확정 버튼 (JSON 추출 버튼 제거) ────────────────────────────────────
function ConfirmButton({ onOpen }) {
  const btn = (bg, label, onClick, disabled=false) => (
    <button onClick={onClick} disabled={disabled} style={{
      background:disabled?'#888':bg, color:'white', border:'none',
      padding:'10px 16px', borderRadius:6, cursor:disabled?'not-allowed':'pointer',
      fontWeight:'bold', marginLeft:8, fontSize:13,
    }}>{label}</button>
  );
  return (
    <>
      <SizeInput />
      {btn('#2563eb','✅ 시안확정 (발주하기)',onOpen)}
    </>
  );
}

// ─── 스플래시 ────────────────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  const [phase, setPhase] = React.useState('in');
  React.useEffect(() => {
    const t1 = setTimeout(()=>setPhase('hold'),800);
    const t2 = setTimeout(()=>setPhase('out'),2000);
    const t3 = setTimeout(()=>onDone(),2600);
    return ()=>[t1,t2,t3].forEach(clearTimeout);
  },[]);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:99999, background:'#0f172a',
      display:'flex', alignItems:'center', justifyContent:'center',
      opacity:phase==='out'?0:1, transition:phase==='out'?'opacity 0.6s ease':'none', pointerEvents:'none' }}>
      <div style={{ position:'relative', width:160, height:160, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid rgba(59,130,246,0.25)', animation:'splash-ring 1.8s ease-out infinite' }}/>
        <div style={{ position:'absolute', inset:12, borderRadius:'50%', border:'1.5px solid rgba(59,130,246,0.15)', animation:'splash-ring 1.8s ease-out 0.3s infinite' }}/>
        <img src={LOGO_URL} alt="logo" style={{ width:110, height:110, objectFit:'contain',
          opacity:phase==='in'?0:1, transform:phase==='in'?'scale(0.8)':'scale(1)',
          transition:'opacity 0.5s ease, transform 0.5s ease' }}/>
      </div>
      <style>{`@keyframes splash-ring{0%{transform:scale(1);opacity:0.6}100%{transform:scale(1.5);opacity:0}}`}</style>
    </div>
  );
}

// ─── 확정 모달 ───────────────────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.55)',
      backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#1e293b', borderRadius:16, padding:'32px 36px',
        boxShadow:'0 24px 60px rgba(0,0,0,0.5)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:20,
        minWidth:320, maxWidth:400, animation:'modal-in 0.25s cubic-bezier(.34,1.56,.64,1)' }}>
        <style>{`
          @keyframes modal-in{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
          @keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
        <img src={LOGO_URL} alt="logo" style={{ width:64, objectFit:'contain', opacity:0.9 }}/>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:17, fontWeight:700, color:'#f1f5f9', marginBottom:8 }}>이 시안으로 진행할까요?</div>
          <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.6 }}>확인을 누르면 시안을 저장하고<br/>발주 폼으로 이동합니다.</div>
        </div>
        <div style={{ display:'flex', gap:10, width:'100%' }}>
          <button onClick={onCancel} disabled={loading} style={{ flex:1, padding:'11px', borderRadius:8,
            background:'#334155', border:'none', color:'#94a3b8', fontSize:14, fontWeight:600, cursor:'pointer' }}>취소</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex:2, padding:'11px', borderRadius:8,
            background:loading?'#1d4ed8':'#2563eb', border:'none', color:'#fff',
            fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {loading
              ? <><span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/> 저장 중…</>
              : '✅ 발주하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────
function App() {
  const [splash, setSplash]           = React.useState(true);
  const [showCoach, setShowCoach]     = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [exporting, setExporting]     = React.useState(false);

  // ① 마우스 휠 줌: Ctrl 없이도 동작 (사이드바 영역 제외)
  useEffect(() => {
    const onWheel = (e) => {
      // 사이드바나 플로팅패널 위에서는 스크롤 허용
      if (e.target.closest('[class*="side-panel"], [class*="SidePanel"], .bp5-panel-stack, .fp-content')) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max((store.scale || 1) * delta, 0.05), 10);
      store.setScale?.(newScale);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  const handleSplashDone = () => {
    setSplash(false);
    setTimeout(() => setShowCoach(true), 300);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const dataUrl = await store.toDataURL({ mimeType:'image/png', pixelRatio:2 });
      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('upload_preset','etoo_preset');
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,{ method:'POST', body:formData });
      const data = await resp.json();
      if (!data.secure_url) throw new Error('이미지 업로드 실패');
      const projectId = 'ETOO_' + Date.now();
      const w = store.width, h = store.height;
      window.top.location.href =
        `https://tally.so/r/xXNz09?project_id=${projectId}&image_url=${encodeURIComponent(data.secure_url)}&width=${w}&height=${h}`;
    } catch(err) {
      alert('시안 저장 중 문제가 생겼습니다: '+err.message);
    } finally {
      setExporting(false); setShowConfirm(false);
    }
  };

  return (
    <div style={{ width:'100vw', height:'100vh' }}>
      {splash && <SplashScreen onDone={handleSplashDone}/>}
      {showCoach && <CoachMark onDone={()=>setShowCoach(false)}/>}
      {showConfirm && <ConfirmModal loading={exporting} onConfirm={handleExport} onCancel={()=>setShowConfirm(false)}/>}
      <FloatingPanel store={store}/>
      <PolotnoContainer>
        <SidePanelWrap>
          <SidePanel store={store} sections={customSections} defaultSection="templates"/>
        </SidePanelWrap>
        <WorkspaceWrap>
          <Toolbar store={store} components={{ ActionControls: ()=>
            <ConfirmButton onOpen={()=>setShowConfirm(true)}/>
          }}/>
          {/* onWheel은 전역 핸들러로 처리하므로 여기선 제거 */}
          <Workspace store={store}/>
          <ZoomButtons store={store}/>
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
