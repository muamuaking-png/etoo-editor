import React from 'react';
import ReactDOM from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';

const TALLY_URL = 'https://tally.so/r/xXNz09';

// 무료 버전 키 (빈 문자열)
const store = createStore({ key: '', showCredit: true });

// 기본 현수막 설정 (6000x900)
store.setSize(6000, 900);
store.addPage();
store.pages[0].addElement({
  type: 'text',
  x: 3000, y: 450,
  width: 5000,
  text: '주식회사 이투 - 시안 수정 에디터',
  fontSize: 250,
  align: 'center',
  fill: '#2563eb',
});

function ConfirmButton() {
  const handleClick = () => {
    const projectId = 'ETOO_' + Date.now();
    window.top.location.href = `${TALLY_URL}?project_id=${projectId}`;
  };
  return (
    <button onClick={handleClick} style={{
      background: '#2563eb', color: 'white', border: 'none',
      padding: '8px 18px', borderRadius: '6px', cursor: 'pointer',
      fontWeight: 'bold', fontSize: '14px', marginLeft: '10px'
    }}>
      ✅ 시안확정 (발주하기)
            </button>
  );
}

function App() {
  return (
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
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
