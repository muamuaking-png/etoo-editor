import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';

const store = createStore({ key: '', showCredit: true });
// 기본 규격은 일단 6000x900으로 시작 (왼쪽 resize 메뉴에서 언제든 변경 가능)
store.setSize(6000, 900);
store.addPage();

// --- 스타일 정의 ---
const btnStyle = { 
  color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', 
  cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px' 
};

// --- 1. [핵심] 디자인 설계도(JSON) 복사 버튼 ---
function JSONCopyButton() {
  const copyJSON = () => {
    const json = JSON.stringify(store.toJSON());
    navigator.clipboard.writeText(json);
    alert('✅ 디자인 설계도(JSON)가 복사되었습니다! 메모장에 붙여넣으세요.');
  };

  return (
    <button onClick={copyJSON} style={{...btnStyle, background: '#10b981'}}>
      📋 JSON 복사
    </button>
  );
}

// --- 2. 최종 발주 버튼 (Cloudinary 연동) ---
function ConfirmButton() {
  const [loading, setLoading] = useState(false);
  const handleExport = async () => {
    setLoading(true);
    try {
      const dataUrl = await store.toDataURL({ mimeType: 'image/png', pixelRatio: 2 });
      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('upload_preset', 'etoo_preset');
      const resp = await fetch('https://api.cloudinary.com/v1_1/dm1rqkqbj/image/upload', { method: 'POST', body: formData });
      const data = await resp.json();
      window.top.location.href = `https://tally.so/r/xXNz09?project_id=ETOO_${Date.now()}&image_url=${encodeURIComponent(data.secure_url)}`;
    } catch (err) { 
      alert('오류 발생: ' + err.message); 
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={handleExport} disabled={loading} style={{...btnStyle, background: loading ? '#888' : '#2563eb'}}>
      {loading ? '저장 중...' : '✅ 시안확정 (발주)'}
    </button>
  );
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PolotnoContainer>
        <SidePanelWrap>
          {/* resize 메뉴가 왼쪽에 있으니 여기서 사이즈 조절하시면 됩니다! */}
          <SidePanel store={store} sections={['templates', 'resize', 'text', 'upload']} />
        </SidePanelWrap>
        <WorkspaceWrap>
          <Toolbar store={store} components={{ 
            ActionControls: () => (
              <div style={{display: 'flex', alignItems: 'center'}}>
                <JSONCopyButton />
                <ConfirmButton />
              </div>
            ) 
          }} />
          <Workspace store={store} />
          <ZoomButtons store={store} />
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
