// ─── CSV 전체 파싱 (수정본) ─────────────────────────────────────────
function parseCsv(text) {
  const results = [];
  const lines = text.split('\n');

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    let quoteCount = (line.match(/"/g) || []).length;
    while (quoteCount % 2 !== 0 && i + 1 < lines.length) {
      i++;
      line += '\n' + lines[i];
      quoteCount = (line.match(/"/g) || []).length;
    }

    const cols = splitCsvLine(line);
    // cols[0]이 ID라고 가정
    const id = cols[0]?.replace(/^"|"$/g, '').trim();
    if (!id) continue;

    // 1. CSV 파싱 단계에서 이미 따옴표 처리가 되었으므로 앞뒤의 큰따옴표만 제거합니다.
    let rawJson = cols[4]?.trim() || '';
    if (rawJson.startsWith('"') && rawJson.endsWith('"')) {
      rawJson = rawJson.substring(1, rawJson.length - 1);
    }
    
    // 2. CSV 이스케이프( "" )를 실제 따옴표( " )로 복원합니다.
    // (splitCsvLine에서 이미 처리했다면 이 단계는 생략 가능하지만, 안전을 위해 남겨둡니다)
    const finalJson = rawJson.replace(/""/g, '"');

    results.push({
      id,
      name:      cols[1]?.replace(/^"|"$/g, '').trim() || '',
      category:  cols[2]?.replace(/^"|"$/g, '').trim() || '기타',
      thumbnail: cols[3]?.replace(/^"|"$/g, '').trim() || '',
      json_data: finalJson, // cleanJson 대신 복원된 finalJson 사용
    });
  }
  return results;
}

// ─── 템플릿 캔버스에 적용 (디버깅 추가) ────────────────────────────────
function applyTemplate(jsonData) {
  try {
    // 만약 데이터에 홑따옴표가 섞여있다면 표준 JSON이 아니므로 에러가 납니다.
    // console.log('파싱 시도 데이터:', jsonData); // 에러 시 브라우저 콘솔에서 확인용
    const json = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    store.loadJSON(json);
  } catch (e) {
    console.error('JSON 상세 에러:', e);
    console.error('문제가 된 데이터:', jsonData);
    throw new Error('JSON 파싱 실패: ' + e.message);
  }
}
