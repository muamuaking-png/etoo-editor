import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';

const store = createStore({ key: '', showCredit: true });

// 배경 이미지 URL 정의 (대표님의 Cloudinary 주소로 꼭 바꾸세요!)
const BACKGROUND_TEMPLATES = [
  'https://res.cloudinary.com/dm1rqkqbj/image/upload/v1/templates/placard_bg1.png',
  'https://res.cloudinary.com/dm1rqkqbj/image/upload/v1/templates/placard_bg2.png',
  'https://res.cloudinary.com/dm1rqkqbj/image/upload/v1/templates/placard_bg3.png'
];

// 초기 설정: 첫 번째 배경으로 시작 (6000x900)
store.setSize(6000, 900);
applyBackground(BACKGROUND_TEMPLATES[0]);

// 배경 레이어를 깔고 그 위에 기본 글자 레이어를 얹는 함수
function applyBackground(imageUrl) {
  store.clear(); // 기존 내용 삭제 (초기화)
  store.setSize(6000, 900); // 6000x900 고정
  store.addPage();
  
  // 1. [배경 레이어] 추가: 맨 아래에 깔립니다.
  store.pages[0].addElement({
    type: 'image',
    x: 0, y: 0, // 좌측 상단 시작
    width: 6000, height: 900, // 캔버스 크기에 꽉 채움
    src: imageUrl,
    selectable: false, // 고객이 배경을 움직이지 못하게 잠금 (핵심!)
    alwaysOnBottom: true // 무조건 맨 아래 레이어로 고정
  });

  // 2. [글자 레이어] 추가: 배경 위에 얹힙니다.
  store.pages[0].addElement({
    type: 'text',
    x: 3000, y: 450, // 중앙 배치
    width: 5500,
    text: '여기에 문구를 입력하세요 (이동/수정 가능)',
    fontSize: 250,
    align: 'center',
    fill: '#000000', // 검정색 기본값
    selectable: true, // 고객이 움직이고 수정할 수 있음
  });
}

// 상단 템플릿 선택 버튼 컴포넌트
function TemplateSelector() {
  return (
    <div style={{ display: 'flex', gap: '5px', marginLeft: '20px' }}>
      <button onClick={() => applyBackground(BACKGROUND_TEMPLATES[0])} style={btnStyle}>템플릿 1</button>
      <button onClick={() => applyBackground(BACKGROUND_TEMPLATES[1])} style={btnStyle}>템플릿 2</button>
      <button onClick={() => applyBackground(BACKGROUND_TEMPLATES[2])} style={btnStyle}>템플릿 3</button>
    </div>
  );
}

// 버튼 스타일
const btnStyle = {
  background: 'white', color: '#5c7080', border: '1px solid #d8e1e8',
  padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
  fontWeight: '600', fontSize: '12px'
};

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
      const imageUrl = data.secure_url; // 생성된 최종 이미지 주소
      const projectId = 'ETOO_' + Date.now();
      window.top.location.href = `https://tally.so/r/xXNz09?project_id=${projectId}&image_url=${encodeURIComponent(imageUrl)}`;
    } catch (err) {
      alert('시안 저장 중 문제가 생겼습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={handleExport} disabled={loading} style={{
      background: loading ? '#888' : '#2563eb', color: 'white', border: 'none',
      padding: '10px 20px', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer',
      fontWeight: 'bold', marginLeft: '10px'
    }}>
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
          {/* Toolbar에 템플릿 선택 버튼과 확정 버튼을 모두 추가 */}
          <Toolbar store={store} components={{ 
            ActionControls: () => (
              <div style={{display: 'flex', alignItems: 'center'}}>
                <TemplateSelector />
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
