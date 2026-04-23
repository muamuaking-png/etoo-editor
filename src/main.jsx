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

// ─── 스토어 초기화 ────────────────────────────────────────────────────────
const store = createStore({ key: '', showCredit: true });
store.setSize(6000, 900);
store.addPage();
store.pages[0].addElement({
  type: 'text', x: 3000, y: 450, width: 5500,
  text: '주식회사 이투 - 시안 수정 에디터',
  fontSize: 250, align: 'center', fill: '#2563eb',
});

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
      <span style={{ fontSize: 22 }}>🖼️</span>
    </SectionTab>
  ),

  Panel: observer(({ store }) => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
        type:   'image',
        src:    img.url,
        x:      100,
        y:      100,
        width:  Math.min(img.width, 1200),
        height: Math.min(img.height, 800),
      });
    };

    return (
      <div style={{ padding: '8px', height: '100%', overflowY: 'auto' }}>
        {error && (
          <div style={{ color: 'red', padding: 8, fontSize: 12 }}>⚠️ {error}</div>
        )}

        <ImagesGrid
          images={images}
          getPreview={(img) => img.thumb}
          isLoading={loading && images.length === 0}
          onSelect={handleSelect}
          rowsNumber={2}
        />

        <button
          onClick={load}
          style={{
            width: '100%', marginTop: 8, padding: '6px',
            background: '#475569', color: '#fff', border: 'none',
            borderRadius: 6, cursor: 'pointer', fontSize: 12,
          }}
        >
          🔄 새로고침
        </button>
      </div>
    );
  }),
};

// ─── 기존 photos 섹션을 내 섹션으로 교체 ────────────────────────────────
const customSections = DEFAULT_SECTIONS.map((s) =>
  s.name === 'photos' ? CloudinarySection : s
);

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
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#888' : bg,
        color: 'white', border: 'none',
        padding: '10px 16px', borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 'bold', marginLeft: 8, fontSize: 13,
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* JSON 모달 */}
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
            <textarea
              readOnly
              value={jsonText}
              style={{
                flex: 1, minHeight: '50vh',
                background: '#13131f', color: '#a6e3a1',
                border: '1px solid #333', borderRadius: 6,
                padding: 12, fontFamily: 'monospace',
                fontSize: 12, resize: 'none', outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      {btn('#475569', '🗂️ JSON 추출', handleExportJson)}
      {btn(
        loading ? '#888' : '#2563eb',
        loading ? '시안 찍는 중...' : '✅ 시안확정 (발주하기)',
        handleExport,
        loading
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
