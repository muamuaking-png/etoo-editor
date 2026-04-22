import React from 'react';
import ReactDOM from 'react-dom/client';
import { createStore } from 'polotno/model/store';
import {
  PolotnoContainer,
  SidePanelWrap,
  WorkspaceWrap,
} from 'polotno/component/polotno-container';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/component/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';

const TALLY_URL = 'https://tally.so/r/xXNz09';

const store = createStore({ key: 'nFA5H9elui3n', showCredit: true });

store.addPage();
store.pages[0].addElement({
  type: 'text',
  x: 500, y: 300,
  width: 5000,
  text: '2026년 마케팅그룹 워크샵',
  fontSize: 250,
  align: 'center',
  fill: '#00c4a6',
});
store.pages[0].addElement({
  type: 'text',
  x: 500, y: 620,
  width: 5000,
  text: '내용을 입력하세요',
  fontSize: 150,
  align: 'center',
  fill: '#000000',
});
store.setSize(6000, 900);

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
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
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
