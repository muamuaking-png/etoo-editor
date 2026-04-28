import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel, DEFAULT_SECTIONS, SectionTab } from 'polotno/side-panel';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { observer } from 'mobx-react-lite';

// ─── Cloudinary 설정 ──────────────────────────────────────────────────────
const CLOUD_NAME = 'dm1rqkqbj';
const TAG = 'etoo';

// ─── 구글 시트 설정 (CSV) ─────────────────────────────────────────────────
const SHEET_ID = '16JedVrzxqrFtBaN5YANB-i-Ry-Tq252_Gf6XB4pnOpM';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;

// ─── 기본 시작 템플릿 ID ──────────────────────────────────────────────────
const DEFAULT_TEMPLATE_ID = 'tpl_008';

// ─── 스토어 초기화 ────────────────────────────────────────────────────────
const store = createStore({ key: '', showCredit: true });

// ─── CSV 한 줄 파싱 ───────────────────────────────────────────────────────
function splitCsvLine(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
    else { cur += ch; }
  }
  cols.push(cur);
  return cols;
}

// ─── CSV 전체 파싱 ────────────────────────────────────────────────────────
function parseCsv(text) {
  const results = [];
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    let quoteCount = (line.match(/"/g) || []).length;
    while (quoteCount % 2 !== 0 && i + 1 < lines.length) {
      i++;
      line += '\n' + lines[i];
      quoteCount = (line.match(/"/g) || []).length;
    }
    const cols = splitCsvLine(line);
    const id = cols[0]?.replace(/^"|"$/g, '').trim();
    if (!id) continue;
    const rawJson = cols[4]?.replace(/^"|"$/g, '').replace(/""/g, '"').trim() || '';
    const cleanJson = rawJson.replace(/[\u0000-\u001F\u007F]/g, (ch) => {
      const allowed = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };
      return allowed[ch] ?? ' ';
    });
    results.push({
      id,
      name:      cols[1]?.replace(/^"|"$/g, '').trim() || '',
      category:  cols[2]?.replace(/^"|"$/g, '').trim() || '기타',
      thumbnail: cols[3]?.replace(/^"|"$/g, '').trim() || '',
      json_data: cleanJson,
    });
  }
  return results;
}

// ─── 구글 시트에서 템플릿 목록 불러오기 ──────────────────────────────────
async function fetchTemplates() {
  const resp = await fetch(SHEET_URL);
  if (!resp.ok) throw new Error('시트 불러오기 실패: ' + resp.status);
  const text = await resp.text();
  return parseCsv(text);
}

// ─── 템플릿 캔버스에 적용 ────────────────────────────────────────────────
function applyTemplate(jsonData) {
  try {
    const json = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    store.loadJSON(json);
  } catch (e) {
    throw new Error('JSON 파싱 실패: ' + e.message);
  }
}

// ─── 앱 시작 시 기본 템플릿 로드 ─────────────────────────────────────────
async function loadDefaultTemplate() {
  try {
    const list = await fetchTemplates();
    const def = list.find(t => t.id === DEFAULT_TEMPLATE_ID);
    if (def && def.json_data) applyTemplate(def.json_data);
    else store.addPage();
  } catch (e) {
    console.warn('기본 템플릿 로드 실패:', e.message);
    store.addPage();
  }
}
loadDefaultTemplate();

// ─── 캔버스 사이즈 변경 + 요소 자동 스케일 ───────────────────────────────
function resizeCanvas(newW, newH) {
  const page = store.activePage;
  if (!page) return;

  const oldW = store.width;
  const oldH = store.height;

  if (oldW === newW && oldH === newH) return;

  const scaleX = newW / oldW;
  const scaleY = newH / oldH;

  // 모든 요소 위치/크기 스케일 조정
  page.children.forEach(el => {
    el.set({
      x:      el.x      * scaleX,
      y:      el.y      * scaleY,
      width:  el.width  * scaleX,
      height: el.height * scaleY,
      // 텍스트 폰트사이즈도 비율에 맞게 조정
      ...(el.type === 'text' ? { fontSize: Math.round(el.fontSize * Math.min(scaleX, scaleY)) } : {}),
    });
  });

  store.setSize(newW, newH);
}

// ─── 사이즈 입력 컴포넌트 ────────────────────────────────────────────────
const SizeInput = observer(() => {
  const [w, setW] = useState(store.width || 6000);
  const [h, setH] = useState(store.height || 900);
  const [unit, setUnit] = useState('mm');

  // 캔버스 사이즈 변경 시 입력창 동기화
  useEffect(() => {
    setW(store.width);
    setH(store.height);
  }, [store.width, store.height]);

  const handleApply = () => {
    const nw = parseInt(w);
    const nh = parseInt(h);
    if (!nw || !nh || nw < 100 || nh < 100) {
      alert('최소 100 이상의 값을 입력해주세요.');
      return;
    }
    resizeCanvas(nw, nh);
  };

  const inputStyle = {
    width: 80, padding: '4px 6px', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: 13,
    textAlign: 'center', background: '#fff', color: '#1a1a1a',
  };
  const labelStyle = { fontSize: 12, color: '#6b7280', marginRight: 2 };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px' }}>
      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500, marginRight: 4 }}>사이즈</span>

      <span style={labelStyle}>가로</span>
      <input
        type="number"
        value={w}
        onChange={e => setW(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleApply()}
        style={inputStyle}
        min={100}
      />

      <span style={{ fontSize: 12, color: '#9ca3af' }}>×</span>

      <span style={labelStyle}>세로</span>
      <input
        type="number"
        value={h}
        onChange={e => setH(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleApply()}
        style={inputStyle}
        min={100}
      />

      <select
        value={unit}
        onChange={e => setUnit(e.target.value)}
        style={{ ...inputStyle, width: 52, padding: '4px 2px' }}
      >
        <option value="mm">mm</option>
        <option value="cm">cm</option>
        <option value="px">px</option>
      </select>

      <button
        onClick={handleApply}
        style={{
          padding: '5px 12px', borderRadius: 6,
          background: '#2563eb', color: '#fff',
          border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 'bold',
        }}
      >
        적용
      </button>
    </div>
  );
});

// ─── 심플 SVG 아이콘 ─────────────────────────────────────────────────────
const TemplateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="21" x2="9" y2="9"/>
  </svg>
);

const PhotoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

// ─── 커스텀 "템플릿" 섹션 ────────────────────────────────────────────────
const TemplateSection = {
  name: 'templates',
  Tab: (props) => (
    <SectionTab name="템플릿" {...props}><TemplateIcon /></SectionTab>
  ),
  Panel: observer(({ store }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading]     = useState(false);
    const [applying, setApplying]   = useState('');
    const [error, setError]         = useState('');
    const [category, setCategory]   = useState('전체');

    const load = async () => {
      setLoading(true); setError('');
      try { setTemplates(await fetchTemplates()); }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const categories = ['전체', ...new Set(templates.map(t => t.category))];
    const filtered = category === '전체' ? templates : templates.filter(t => t.category === category);

    const handleApply = async (tpl) => {
      const ok = window.confirm(`"${tpl.name}" 템플릿을 적용하시겠습니까?\n현재 작업 중인 내용이 사라집니다.`);
      if (!ok) return;
      setApplying(tpl.id);
      try { applyTemplate(tpl.json_data); }
      catch (e) { alert('템플릿 적용 실패: ' + e.message); }
      finally { setApplying(''); }
    };

    return (
      <div style={{ padding: '8px', height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '4px 10px', borderRadius: 20, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 'bold',
              background: category === cat ? '#2563eb' : '#334155', color: '#fff',
            }}>{cat}</button>
          ))}
        </div>
        {error && <div style={{ color: '#f87171', padding: 8, fontSize: 12 }}>⚠️ {error}</div>}
        {loading && <div style={{ color: '#94a3b8', padding: 8, fontSize: 12, textAlign: 'center' }}>불러오는 중...</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {filtered.map(tpl => (
            <div key={tpl.id} onClick={() => handleApply(tpl)} style={{
              cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
              border: applying === tpl.id ? '2px solid #2563eb' : '1px solid #334155',
              background: '#1e293b',
              opacity: applying && applying !== tpl.id ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}>
              {tpl.thumbnail
                ? <img src={tpl.thumbnail} alt={tpl.name} style={{ width: '100%', height: 'auto', display: 'block' }} />
                : <div style={{ width: '100%', height: 80, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📄</div>
              }
              <div style={{ padding: '6px 8px' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{tpl.category}</div>
                <div style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 'bold', lineHeight: 1.3 }}>
                  {applying === tpl.id ? '적용 중...' : tpl.name}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={load} style={{
          width: '100%', marginTop: 12, padding: '6px',
          background: '#475569', color: '#fff', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontSize: 12,
        }}>🔄 목록 새로고침</button>
      </div>
    );
  }),
};

// ─── Cloudinary 이미지 목록 불러오기 ─────────────────────────────────────
async function fetchCloudinaryImages() {
  const resp = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${TAG}.json`);
  if (!resp.ok) throw new Error('이미지 목록 불러오기 실패: ' + resp.status);
  const data = await resp.json();
  return data.resources.map((r) => ({
    url:   `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${r.public_id}.${r.format}`,
    thumb: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_200,h_200,c_fill/${r.public_id}.${r.format}`,
    width: r.width, height: r.height, name: r.public_id,
  }));
}

// ─── 커스텀 "내 사진" 섹션 ────────────────────────────────────────────────
const CloudinarySection = {
  name: 'cloudinary-photos',
  Tab: (props) => (
    <SectionTab name="내 사진" {...props}><PhotoIcon /></SectionTab>
  ),
  Panel: observer(({ store }) => {
    const [images, setImages]   = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const load = async () => {
      setLoading(true); setError('');
      try { setImages(await fetchCloudinaryImages()); }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const handleSelect = (img) => {
      store.activePage.addElement({
        type: 'image', src: img.url, x: 100, y: 100,
        width: Math.min(img.width, 1200), height: Math.min(img.height, 800),
      });
    };

    return (
      <div style={{ padding: '8px', height: '100%', overflowY: 'auto' }}>
        {error && <div style={{ color: '#f87171', padding: 8, fontSize: 12 }}>⚠️ {error}</div>}
        <ImagesGrid
          images={images} getPreview={(img) => img.thumb}
          isLoading={loading && images.length === 0}
          onSelect={handleSelect} rowsNumber={2}
        />
        <button onClick={load} style={{
          width: '100%', marginTop: 8, padding: '6px',
          background: '#475569', color: '#fff', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontSize: 12,
        }}>🔄 새로고침</button>
      </div>
    );
  }),
};

// ─── 섹션 구성 ───────────────────────────────────────────────────────────
const customSections = [
  TemplateSection,
  ...DEFAULT_SECTIONS.map((s) => s.name === 'photos' ? CloudinarySection : s),
];

// ─── 확정 / JSON / 사이즈입력 버튼 ───────────────────────────────────────
function ConfirmButton() {
  const [loading, setLoading]   = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const handleExportJson = () => {
    setJsonText(JSON.stringify(store.toJSON(), null, 2));
    setShowJson(true);
  };
  const handleCopyJson = () => { navigator.clipboard.writeText(jsonText); alert('JSON이 클립보드에 복사되었습니다!'); };
  const handleDownloadJson = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([jsonText], { type: 'application/json' }));
    a.download = `etoo_design_${Date.now()}.json`;
    a.click();
  };

  const handleExport = async () => {
    const ok = window.confirm('이 시안으로 진행하시겠습니까?\n\n확인을 누르면 발주 폼으로 이동합니다.');
    if (!ok) return;
    setLoading(true);
    try {
      const dataUrl = await store.toDataURL({ mimeType: 'image/png', pixelRatio: 2 });
      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('upload_preset', 'etoo_preset');
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await resp.json();
      if (!data.secure_url) throw new Error('이미지 업로드 실패');
      const projectId = 'ETOO_' + Date.now();
      // 캔버스 사이즈도 같이 전달
      const w = store.width;
      const h = store.height;
      window.top.location.href =
        `https://tally.so/r/xXNz09?project_id=${projectId}&image_url=${encodeURIComponent(data.secure_url)}&width=${w}&height=${h}`;
    } catch (err) {
      alert('시안 저장 중 문제가 생겼습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const btn = (bg, label, onClick, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? '#888' : bg, color: 'white', border: 'none',
      padding: '10px 16px', borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: 'bold', marginLeft: 8, fontSize: 13,
    }}>{label}</button>
  );

  return (
    <>
      {showJson && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#1e1e2e', borderRadius: 10, padding: 24,
            width: '70vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>📋 JSON 코드</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {btn('#10b981', '복사', handleCopyJson)}
                {btn('#6366f1', '다운로드', handleDownloadJson)}
                {btn('#ef4444', '닫기', () => setShowJson(false))}
              </div>
            </div>
            <textarea readOnly value={jsonText} style={{
              flex: 1, minHeight: '50vh', background: '#13131f', color: '#a6e3a1',
              border: '1px solid #333', borderRadius: 6, padding: 12,
              fontFamily: 'monospace', fontSize: 12, resize: 'none', outline: 'none',
            }} />
          </div>
        </div>
      )}

      {/* 사이즈 입력창 */}
      <SizeInput />

      {btn('#475569', '🗂️ JSON 추출', handleExportJson)}
      {btn(
        loading ? '#888' : '#2563eb',
        loading ? '시안 찍는 중...' : '✅ 시안확정 (발주하기)',
        handleExport, loading
      )}
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────
function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PolotnoContainer>
        <SidePanelWrap>
          <SidePanel store={store} sections={customSections} />
        </SidePanelWrap>
        <WorkspaceWrap>
          <Toolbar store={store} components={{ ActionControls: ConfirmButton }} />
          <Workspace store={store} />
          <ZoomButtons store={store} />
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
