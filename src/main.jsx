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

// ─── 내 디자인 JSON ───────────────────────────────────────────────────────
const MY_DESIGN = {
  "width": 6000,
  "height": 900,
  "fonts": [],
  "pages": [
    {
      "id": "U17BguN1hT",
      "children": [
        {
          "id": "_9uo86pX0K",
          "type": "text",
          "name": "text-1",
          "opacity": 1,
          "visible": true,
          "selectable": true,
          "removable": true,
          "alwaysOnTop": false,
          "showInExport": true,
          "x": -29.256080114448956,
          "y": 209.5,
          "width": 3600,
          "height": 481,
          "rotation": 0,
          "animations": [],
          "blurEnabled": false,
          "blurRadius": 10,
          "brightnessEnabled": false,
          "brightness": 0,
          "sepiaEnabled": false,
          "grayscaleEnabled": false,
          "filters": {},
          "shadowEnabled": false,
          "shadowBlur": 5.557506966084132,
          "shadowOffsetX": 0,
          "shadowOffsetY": 0,
          "shadowColor": "black",
          "shadowOpacity": 1,
          "draggable": true,
          "resizable": true,
          "contentEditable": true,
          "styleEditable": true,
          "text": "기분좋은",
          "placeholder": "",
          "fontSize": 400,
          "fontFamily": "Roboto",
          "fontStyle": "normal",
          "fontWeight": "bold",
          "textDecoration": "",
          "textTransform": "none",
          "fill": "rgba(0,174,176,1)",
          "align": "center",
          "verticalAlign": "top",
          "strokeWidth": 0,
          "stroke": "black",
          "lineHeight": 1.2,
          "letterSpacing": 0,
          "backgroundEnabled": false,
          "backgroundColor": "#7ED321",
          "backgroundOpacity": 1,
          "backgroundCornerRadius": 0.5,
          "backgroundPadding": 0.5,
          "curveEnabled": false,
          "curvePower": 0.5
        },
        {
          "id": "qYeuygnFaC",
          "type": "image",
          "name": "image-1",
          "opacity": 1,
          "visible": true,
          "selectable": true,
          "removable": true,
          "alwaysOnTop": false,
          "showInExport": true,
          "x": 5149.999999999975,
          "y": 7.52091131229497e-12,
          "width": 849.9999999999939,
          "height": 899.9999999999924,
          "rotation": 0,
          "animations": [],
          "blurEnabled": false,
          "blurRadius": 10,
          "brightnessEnabled": false,
          "brightness": 0,
          "sepiaEnabled": false,
          "grayscaleEnabled": false,
          "filters": {},
          "shadowEnabled": false,
          "shadowBlur": 5,
          "shadowOffsetX": 0,
          "shadowOffsetY": 0,
          "shadowColor": "black",
          "shadowOpacity": 1,
          "draggable": true,
          "resizable": true,
          "contentEditable": true,
          "styleEditable": true,
          "src": "https://res.cloudinary.com/dm1rqkqbj/image/upload/imbank1_zoin1a.svg",
          "cropX": 0,
          "cropY": 0,
          "cropWidth": 1,
          "cropHeight": 0.9999999999999988,
          "cornerRadius": 0,
          "flipX": false,
          "flipY": false,
          "clipSrc": "",
          "borderColor": "black",
          "borderSize": 0,
          "keepRatio": false,
          "stretchEnabled": false
        },
        {
          "id": "mW_0mp33-0",
          "type": "image",
          "name": "image-2",
          "opacity": 1,
          "visible": true,
          "selectable": true,
          "removable": true,
          "alwaysOnTop": false,
          "showInExport": true,
          "x": 5016.817678812406,
          "y": 81.8306239343633,
          "width": 684.8990593850191,
          "height": 887.5683865754152,
          "rotation": 0,
          "animations": [],
          "blurEnabled": false,
          "blurRadius": 10,
          "brightnessEnabled": false,
          "brightness": 0,
          "sepiaEnabled": false,
          "grayscaleEnabled": false,
          "filters": {},
          "shadowEnabled": false,
          "shadowBlur": 5,
          "shadowOffsetX": 0,
          "shadowOffsetY": 0,
          "shadowColor": "black",
          "shadowOpacity": 1,
          "draggable": true,
          "resizable": true,
          "contentEditable": true,
          "styleEditable": true,
          "src": "https://res.cloudinary.com/dm1rqkqbj/image/upload/단디_ldthn2.png",
          "cropX": 0,
          "cropY": 0,
          "cropWidth": 0.9999999999999991,
          "cropHeight": 0.884609264758112,
          "cornerRadius": 0,
          "flipX": false,
          "flipY": false,
          "clipSrc": "",
          "borderColor": "black",
          "borderSize": 0,
          "keepRatio": false,
          "stretchEnabled": false
        },
        {
          "id": "S28cpJSgC2",
          "type": "image",
          "name": "image-3",
          "opacity": 1,
          "visible": true,
          "selectable": true,
          "removable": true,
          "alwaysOnTop": false,
          "showInExport": true,
          "x": 105.72246065808261,
          "y": 81.83062393436322,
          "width": 574.1834090257108,
          "height": 99.62999791313719,
          "rotation": 0,
          "animations": [],
          "blurEnabled": false,
          "blurRadius": 10,
          "brightnessEnabled": false,
          "brightness": 0,
          "sepiaEnabled": false,
          "grayscaleEnabled": false,
          "filters": {},
          "shadowEnabled": false,
          "shadowBlur": 5,
          "shadowOffsetX": 0,
          "shadowOffsetY": 0,
          "shadowColor": "black",
          "shadowOpacity": 1,
          "draggable": true,
          "resizable": true,
          "contentEditable": true,
          "styleEditable": true,
          "src": "https://res.cloudinary.com/dm1rqkqbj/image/upload/imbank_logo1_ohtges.svg",
          "cropX": 0,
          "cropY": 0,
          "cropWidth": 0.9999999999999986,
          "cropHeight": 1,
          "cornerRadius": 0,
          "flipX": false,
          "flipY": false,
          "clipSrc": "",
          "borderColor": "black",
          "borderSize": 0,
          "keepRatio": false,
          "stretchEnabled": false
        },
        {
          "id": "jALLjBphEd",
          "type": "text",
          "name": "text-1",
          "opacity": 1,
          "visible": true,
          "selectable": true,
          "removable": true,
          "alwaysOnTop": false,
          "showInExport": true,
          "x": 1814.7711015736493,
          "y": 209.50000000000364,
          "width": 3600,
          "height": 481,
          "rotation": 0,
          "animations": [],
          "blurEnabled": false,
          "blurRadius": 10,
          "brightnessEnabled": false,
          "brightness": 0,
          "sepiaEnabled": false,
          "grayscaleEnabled": false,
          "filters": {},
          "shadowEnabled": false,
          "shadowBlur": 5,
          "shadowOffsetX": 0,
          "shadowOffsetY": 0,
          "shadowColor": "black",
          "shadowOpacity": 1,
          "draggable": true,
          "resizable": true,
          "contentEditable": true,
          "styleEditable": true,
          "text": "금융의 등장",
          "placeholder": "",
          "fontSize": 400,
          "fontFamily": "Roboto",
          "fontStyle": "normal",
          "fontWeight": "bold",
          "textDecoration": "",
          "textTransform": "none",
          "fill": "rgba(93,93,93,1)",
          "align": "center",
          "verticalAlign": "top",
          "strokeWidth": 0,
          "stroke": "black",
          "lineHeight": 1.2,
          "letterSpacing": 0,
          "backgroundEnabled": false,
          "backgroundColor": "#7ED321",
          "backgroundOpacity": 1,
          "backgroundCornerRadius": 0.5,
          "backgroundPadding": 0.5,
          "curveEnabled": false,
          "curvePower": 0.5
        },
        {
          "id": "rz_xbU6I4f",
          "type": "text",
          "name": "text-1",
          "opacity": 1,
          "visible": true,
          "selectable": true,
          "removable": true,
          "alwaysOnTop": false,
          "showInExport": true,
          "x": 2376.7510729613728,
          "y": 746.0575926154934,
          "width": 649,
          "height": 82,
          "rotation": 0,
          "animations": [],
          "blurEnabled": false,
          "blurRadius": 10,
          "brightnessEnabled": false,
          "brightness": 0,
          "sepiaEnabled": false,
          "grayscaleEnabled": false,
          "filters": {},
          "shadowEnabled": false,
          "shadowBlur": 0.9528318910735194,
          "shadowOffsetX": 0,
          "shadowOffsetY": 0,
          "shadowColor": "black",
          "shadowOpacity": 1,
          "draggable": true,
          "resizable": true,
          "contentEditable": true,
          "styleEditable": true,
          "text": "20XX . 10 . 21",
          "placeholder": "",
          "fontSize": 67,
          "fontFamily": "Roboto",
          "fontStyle": "normal",
          "fontWeight": "bold",
          "textDecoration": "",
          "textTransform": "none",
          "fill": "rgba(0,174,176,1)",
          "align": "center",
          "verticalAlign": "top",
          "strokeWidth": 0,
          "stroke": "black",
          "lineHeight": 1.2,
          "letterSpacing": 0,
          "backgroundEnabled": false,
          "backgroundColor": "#7ED321",
          "backgroundOpacity": 1,
          "backgroundCornerRadius": 0.5,
          "backgroundPadding": 0.5,
          "curveEnabled": false,
          "curvePower": 0.5
        },
        {
          "id": "h21McJOL0k",
          "type": "text",
          "name": "text-1",
          "opacity": 1,
          "visible": true,
          "selectable": true,
          "removable": true,
          "alwaysOnTop": false,
          "showInExport": true,
          "x": 2921.743919885551,
          "y": 746.0575926154934,
          "width": 649,
          "height": 82,
          "rotation": 0,
          "animations": [],
          "blurEnabled": false,
          "blurRadius": 10,
          "brightnessEnabled": false,
          "brightness": 0,
          "sepiaEnabled": false,
          "grayscaleEnabled": false,
          "filters": {},
          "shadowEnabled": false,
          "shadowBlur": 0.9528318910735194,
          "shadowOffsetX": 0,
          "shadowOffsetY": 0,
          "shadowColor": "black",
          "shadowOpacity": 1,
          "draggable": true,
          "resizable": true,
          "contentEditable": true,
          "styleEditable": true,
          "text": "iM뱅크 테스트부",
          "placeholder": "",
          "fontSize": 67,
          "fontFamily": "Roboto",
          "fontStyle": "normal",
          "fontWeight": "bold",
          "textDecoration": "",
          "textTransform": "none",
          "fill": "rgba(87,87,87,1)",
          "align": "center",
          "verticalAlign": "top",
          "strokeWidth": 0,
          "stroke": "black",
          "lineHeight": 1.2,
          "letterSpacing": 0,
          "backgroundEnabled": false,
          "backgroundColor": "#7ED321",
          "backgroundOpacity": 1,
          "backgroundCornerRadius": 0.5,
          "backgroundPadding": 0.5,
          "curveEnabled": false,
          "curvePower": 0.5
        }
      ],
      "width": "auto",
      "height": "auto",
      "background": "white",
      "bleed": 0,
      "duration": 5000
    }
  ],
  "audios": [],
  "unit": "px",
  "dpi": 72,
  "schemaVersion": 3
};

// ─── 스토어 초기화 (내 디자인으로 시작) ──────────────────────────────────
const store = createStore({ key: '', showCredit: true });
store.loadJSON(MY_DESIGN); // ✅ 여기가 핵심!

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

// ─── photos 섹션을 내 섹션으로 교체 ──────────────────────────────────────
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
