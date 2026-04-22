import React from 'react';
import ReactDOM from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';

const store = createStore({ key: '', showCredit: true });

// 초기 설정
store.setSize(6000, 900);
store.addPage();
store.pages[0].addElement({
  type: 'text', x: 3000, y: 450, width: 5500,
  text: '주식회사 이투 - 시안 수정 에디터', fontSize: 250, align: 'center', fill: '#2563eb',
});

function ConfirmButton() {
  return (
    <button onClick={() => {
      window.top.location.href = "https://tally.so/r/xXNz09?project_id=ETOO_" + Date.now();
    }} style={{
      background: '#2563eb', color: 'white', border: 'none',
      padding: '10px 20px', borderRadius: '6px', cursor: 'pointer',
      fontWeight: 'bold', marginLeft: '10px'
    }}>
      ✅ 시안확정 (발주하기)
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
