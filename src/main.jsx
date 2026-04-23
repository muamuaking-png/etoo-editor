import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';

const store = createStore({ key: '', showCredit: true });
store.setSize(6000, 900);
store.addPage();
store.pages[0].addElement({
  type: 'text', x: 3000, y: 450, width: 5500,
  text: '주식회사 이투 - 시안 수정 에디터', fontSize: 250, align: 'center', fill: '#2563eb',
});

function ConfirmButton() {
  const [loading, setLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');

  // ✅ JSON 추출 버튼 핸들러
  const handleExportJson = () => {
    const json = store.toJSON();
    const formatted = JSON.stringify(json, null, 2);
    setJsonText(formatted);
    setShowJson(true);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText);
    alert('JSON이 클립보드에 복사되었습니다!');
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etoo_design_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const dataUrl = await store.toDataURL({ mimeType: 'image/png', pixelRatio: 2 });
      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('upload_preset', 'etoo_preset');
      const resp = await fetch('https://api.cloudinary.com/v1_1/dm1rqkqbj/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      if (!data.secure_url) throw new Error('이미지 업로드 실패');
      const imageUrl = data.secure_url;
      const projectId = 'ETOO_' + Date.now();
      const tallyUrl = `https://tally.so/r/xXNz09?project_id=${projectId}&image_url=${encodeURIComponent(imageUrl)}`;
      window.top.location.href = tallyUrl;
    } catch (err) {
      console.error(err);
      alert('시안 저장 중 문제가 생겼습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* JSON 모달 */}
      {showJson && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#1e1e2e', borderRadius: '10px', padding: '24px',
            width: '70vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>📋 JSON 코드</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCopyJson} style={btnStyle('#10b981')}>복사</button>
                <button onClick={handleDownloadJson} style={btnStyle('#6366f1')}>다운로드</button>
                <button onClick={() => setShowJson(false)} style={btnStyle('#ef4444')}>닫기</button>
              </div>
            </div>
            <textarea
              readOnly
              value={jsonText}
              style={{
                flex: 1, minHeight: '50vh', background: '#13131f', color: '#a6e3a1',
                border: '1px solid #333', borderRadius: '6px', padding: '12px',
                fontFamily: 'monospace', fontSize: '12px', resize: 'none', outline: 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* 툴바 버튼 영역 */}
      <button onClick={handleExportJson} style={btnStyle('#475569', '10px 16px')}>
        🗂️ JSON 추출
      </button>
      <button
        onClick={handleExport}
        disabled={loading}
        style={btnStyle(loading ? '#888' : '#2563eb', '10px 20px', loading)}
      >
        {loading ? '시안 찍는 중...' : '✅ 시안확정 (발주하기)'}
      </button>
    </>
  );
}

// 버튼 공통 스타일 헬퍼
function btnStyle(bg, padding = '8px 14px', disabled = false) {
  return {
    background: bg, color: 'white', border: 'none',
    padding, borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 'bold', marginLeft: '8px', fontSize: '13px'
  };
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PolotnoContainer>
        <SidePanelWrap>
          <SidePanel store={store} />
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
