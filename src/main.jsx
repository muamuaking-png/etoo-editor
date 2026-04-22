import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';

const store = createStore({ key: '', showCredit: true });

// 초기 설정 (6000x900)
store.setSize(6000, 900);
store.addPage();
store.pages[0].addElement({
  type: 'text', x: 3000, y: 450, width: 5500,
  text: '주식회사 이투 - 시안 수정 에디터', fontSize: 250, align: 'center', fill: '#2563eb',
});

function ConfirmButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // 1. 시안을 이미지 파일(Blob)로 변환
      const dataUrl = await store.toDataURL({ mimeType: 'image/png', pixelRatio: 2 });

      // 2. 대표님의 Cloudinary 창고로 업로드
      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('upload_preset', 'etoo_preset'); 

      const resp = await fetch('https://api.cloudinary.com/v1_1/dm1rqkqbj/image/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await resp.json();
      if (!data.secure_url) throw new Error('이미지 업로드 실패');
      
      const imageUrl = data.secure_url; // 생성된 이미지 실제 주소

      // 3. Tally 주문서로 이미지 주소와 함께 배송
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
    <button 
      onClick={handleExport} 
      disabled={loading} 
      style={{
        background: loading ? '#888' : '#2563eb', 
        color: 'white', border: 'none',
        padding: '10px 20px', borderRadius: '6px', 
        cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: 'bold', marginLeft: '10px'
      }}
    >
      {loading ? '시안 찍는 중...' : '✅ 시안확정 (발주하기)'}
    </button>
  );
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
