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
    } else if (ch === ',' && !inQ) {
      cols.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
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
    const id = cols[0]?.trim();
    if (!id) continue;

    const rawJson = cols[4]?.trim() || '';
    const cleanJson = (() => {
      const ESC = { '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f' };
      let out = '', inStr = false, i = 0;
      while (i < rawJson.length) {
        const ch = rawJson[i];
        if (inStr) {
          if (ch === '\\') { out += ch + (rawJson[i + 1] ?? ''); i += 2; continue; }
          else if (ch === '"') {
            let j = i + 1;
            while (j < rawJson.length && ' \n\r\t'.includes(rawJson[j])) j++;
            const next = rawJson[j];
            if (!next || ',}]:'.includes(next)) { inStr = false; out += ch; }
            else { out += '\\"'; }
          } else if (ch.charCodeAt(0) < 0x20) {
            out += ESC[ch] ?? `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
          } else { out += ch; }
        } else {
          if (ch === '"') { inStr = true; out += ch; }
          else if (ch.charCodeAt(0) < 0x20 && ch !== '\n' && ch !== '\r' && ch !== '\t') { out += ' '; }
          else { out += ch; }
        }
        i++;
      }
      return out;
    })();

    results.push({
      id,
      name:      cols[1]?.trim() || '',
      category:  cols[2]?.trim() || '기타',
      thumbnail: cols[3]?.trim() || '',
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
    if (def && def.json_data) {
      applyTemplate(def.json_data);
    } else {
      store.addPage();
    }
  } catch (e) {
    console.warn('기본 템플릿 로드 실패, 빈 캔버스로 시작:', e.message);
    store.addPage();
  }
}
loadDefaultTemplate();

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
    <SectionTab name="템플릿" {...props}>
      <TemplateIcon />
    </SectionTab>
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

    const handleApply = async (tpl) => {
      const ok = window.confirm(`"${tpl.name}" 템플릿을 적용하시겠습니까?\n현재 작업 중인 내용이 사라집니다.`);
      if (!ok) return;
      setApplying(tpl.id);
      try { applyTemplate(tpl.json_data); }
      catch (e) { alert('템플릿 적용 실패: ' + e.message); }
      finally { setApplying(''); }
    };

    // 카테고리별 픽토그램 아이콘 (라인 SVG)
    const CAT_ICONS = {
      '전체':  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>,
      '배너':  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="3" width="12" height="8" rx="1.2"/><line x1="4" y1="6.5" x2="10" y2="6.5"/><line x1="4" y1="8.5" x2="8" y2="8.5"/></svg>,
      '보드':  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="1" width="10" height="12" rx="1.2"/><line x1="4.5" y1="4.5" x2="9.5" y2="4.5"/><line x1="4.5" y1="7" x2="9.5" y2="7"/><line x1="4.5" y1="9.5" x2="7.5" y2="9.5"/></svg>,
      '현수막':<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="4" width="12" height="6" rx="1.2"/><line x1="3" y1="6.5" x2="11" y2="6.5"/><line x1="3" y1="8.5" x2="8" y2="8.5"/></svg>,
      '기타':  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="3" cy="7" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="11" cy="7" r="1"/></svg>,
    };
    const getIcon = (cat) => CAT_ICONS[cat] || CAT_ICONS['기타'];

    const categories = ['전체', ...new Set(templates.map(t => t.category))];
    const filtered = category === '전체' ? templates : templates.filter(t => t.category === category);
    // 현수막 카테고리는 1열, 나머지는 2열
    const isWide = (tpl) => tpl.category === '현수막';
    const wideItems   = filtered.filter(isWide);
    const normalItems = filtered.filter(t => !isWide(t));

    // SVG 새로고침 아이콘 (라인)
    const RefreshIcon = () => (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }}>
        <path d="M12 7A5 5 0 1 1 9.5 2.5"/>
        <polyline points="9.5 1 9.5 3.5 12 3.5"/>
      </svg>
    );

    const TplCard = ({ tpl, fullWidth }) => (
      <div onClick={() => handleApply(tpl)} style={{
        cursor: 'pointer', borderRadius: 7, overflow: 'hidden',
        border: applying === tpl.id ? '2px solid #3b82f6' : '1px solid #2d3748',
        background: '#1a2236',
        opacity: applying && applying !== tpl.id ? 0.45 : 1,
        transition: 'opacity 0.15s, border-color 0.15s',
      }}>
        {tpl.thumbnail ? (
          <img src={tpl.thumbnail} alt={tpl.name} style={{ width: '100%', height: 'auto', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: fullWidth ? 60 : 80, background: '#2d3748',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.4">
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
        )}
        <div style={{ padding: '5px 7px' }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 1 }}>{tpl.category}</div>
          <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600, lineHeight: 1.3 }}>
            {applying === tpl.id ? '적용 중…' : tpl.name}
          </div>
        </div>
      </div>
    );

    return (
      <div style={{ padding: '8px', height: '100%', overflowY: 'auto' }}>

        {/* 카테고리 필터 — 픽토그램 + 텍스트 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {categories.map(cat => {
            const active = category === cat;
            return (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 20,
                border: active ? '1.5px solid #3b82f6' : '1.5px solid transparent',
                background: active ? 'rgba(59,130,246,0.15)' : '#1e293b',
                color: active ? '#93c5fd' : '#94a3b8',
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                transition: 'all 0.15s',
              }}>
                {getIcon(cat)}{cat}
              </button>
            );
          })}
        </div>

        {error && <div style={{ color: '#f87171', padding: '6px 8px', fontSize: 11, background: 'rgba(248,113,113,0.08)', borderRadius: 6, marginBottom: 8 }}>⚠ {error}</div>}
        {loading && <div style={{ color: '#64748b', padding: 8, fontSize: 12, textAlign: 'center' }}>불러오는 중…</div>}

        {/* 가로형(현수막) - 1열 */}
        {wideItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: normalItems.length > 0 ? 10 : 0 }}>
            {wideItems.map(tpl => <TplCard key={tpl.id} tpl={tpl} fullWidth />)}
          </div>
        )}

        {/* 일반형 - 2열 */}
        {normalItems.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {normalItems.map(tpl => <TplCard key={tpl.id} tpl={tpl} />)}
          </div>
        )}

        <button onClick={load} style={{
          width: '100%', marginTop: 12, padding: '7px',
          background: '#1e293b', color: '#94a3b8',
          border: '1px solid #2d3748', borderRadius: 6,
          cursor: 'pointer', fontSize: 11, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RefreshIcon />목록 새로고침
        </button>
      </div>
    );
  }),
};

// ─── Cloudinary 이미지 목록 불러오기 ─────────────────────────────────────
async function fetchCloudinaryImages() {
  const resp = await fetch(
    `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${TAG}.json`
  );
  if (!resp.ok) throw new Error('이미지 목록 불러오기 실패: ' + resp.status);
  const data = await resp.json();
  return data.resources.map((r) => ({
    url:    `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${r.public_id}.${r.format}`,
    thumb:  `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_200,h_200,c_fill/${r.public_id}.${r.format}`,
    width:  r.width,
    height: r.height,
    name:   r.public_id,
  }));
}

// ─── 커스텀 "내 사진" 섹션 ────────────────────────────────────────────────
const CloudinarySection = {
  name: 'cloudinary-photos',

  Tab: (props) => (
    <SectionTab name="내 사진" {...props}>
      <PhotoIcon />
    </SectionTab>
  ),

  Panel: observer(({ store }) => {
    const [images, setImages]   = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const imgs = await fetchCloudinaryImages();
        setImages(imgs);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => { load(); }, []);

    const handleSelect = (img) => {
      store.activePage.addElement({
        type: 'image', src: img.url,
        x: 100, y: 100,
        width:  Math.min(img.width,  1200),
        height: Math.min(img.height, 800),
      });
    };

    return (
      <div style={{ padding: '8px', height: '100%', overflowY: 'auto' }}>
        {error && (
          <div style={{ color: '#f87171', padding: 8, fontSize: 12 }}>⚠️ {error}</div>
        )}
        <ImagesGrid
          images={images}
          getPreview={(img) => img.thumb}
          isLoading={loading && images.length === 0}
          onSelect={handleSelect}
          rowsNumber={2}
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
  ...DEFAULT_SECTIONS
    .filter(s => s.name !== 'templates')   // 기본 템플릿 섹션 제거
    .map(s => s.name === 'photos' ? CloudinarySection : s),
];

// ─── 확정 / JSON 버튼 ────────────────────────────────────────────────────
function ConfirmButton() {
  const [loading, setLoading]   = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const handleExportJson = () => {
    setJsonText(JSON.stringify(store.toJSON(), null, 2));
    setShowJson(true);
  };
  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText);
    alert('JSON이 클립보드에 복사되었습니다!');
  };
  const handleDownloadJson = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([jsonText], { type: 'application/json' }));
    a.download = `etoo_design_${Date.now()}.json`;
    a.click();
  };

  const handleExport = async () => {
    const ok = window.confirm(
      '이 시안으로 진행하시겠습니까?\n\n확인을 누르면 발주 폼으로 이동합니다.'
    );
    if (!ok) return;

    setLoading(true);
    try {
      const dataUrl = await store.toDataURL({ mimeType: 'image/png', pixelRatio: 2 });
      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('upload_preset', 'etoo_preset');
      const resp = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await resp.json();
      if (!data.secure_url) throw new Error('이미지 업로드 실패');
      const projectId = 'ETOO_' + Date.now();
      window.top.location.href =
        `https://tally.so/r/xXNz09?project_id=${projectId}&image_url=${encodeURIComponent(data.secure_url)}`;
    } catch (err) {
      alert('시안 저장 중 문제가 생겼습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const btn = (bg, label, onClick, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? '#888' : bg,
      color: 'white', border: 'none',
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
            width: '70vw', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>📋 JSON 코드</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {btn('#10b981', '복사',     handleCopyJson)}
                {btn('#6366f1', '다운로드', handleDownloadJson)}
                {btn('#ef4444', '닫기',     () => setShowJson(false))}
              </div>
            </div>
            <textarea readOnly value={jsonText} style={{
              flex: 1, minHeight: '50vh',
              background: '#13131f', color: '#a6e3a1',
              border: '1px solid #333', borderRadius: 6,
              padding: 12, fontFamily: 'monospace',
              fontSize: 12, resize: 'none', outline: 'none',
            }} />
          </div>
        </div>
      )}
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
