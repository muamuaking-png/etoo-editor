import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';

// 1. 에디터 엔진 설정
const store = createStore({ key: '', showCredit: true });
store.setSize(6000, 900); // 기본 규격
store.addPage();

// 2. 버튼 스타일 정의 (공통으로 사용)
const btnStyle = { 
  color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', 
  cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px' 
};

// 3. 설계도(JSON) 추출 버튼 컴포넌트
function JSONCopyButton() {
  const copyJSON = () => {
    const json = JSON.stringify(store.toJSON());
    navigator.clipboard.writeText(json);
    alert('✅ 설계도(JSON) 복사 완료! 메모장에 저장하세요.');
  };
  return (
    <button onClick={copyJSON} style={{...btnStyle, background: '#10b981'}}>
      📋 JSON 복사
    </button>
  );
}

// 4. 시안확정(발주) 버튼 컴포넌트
function ConfirmButton() {
  const [loading, setLoading] = useState(false);
  const handleExport = async () => {
    setLoading(true);
    try {
      const dataUrl = await store.toDataURL({ mimeType: 'image/png', pixelRatio: 2 });
      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('upload_preset', 'etoo_preset');
      const resp = await fetch('https://api.cloudinary.com/v1_1/dm1rqkqbj/image/upload', { 
        method: 'POST', body: formData 
      });
      const data = await resp.json();
      // Tally로 데이터 전송
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

// 5. 메인 앱 화면 구성
function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PolotnoContainer>
        <SidePanelWrap>
          {/* 왼쪽 메뉴: 템플릿, 사이즈조절, 텍스트, 업로드 */}
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
