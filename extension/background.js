// 지금은 특별한 로직 없음.
// 추후 예정: 우클릭 메뉴로 "Reweave에 저장" 추가, 단축키 저장 등
chrome.runtime.onInstalled.addListener(() => {
  console.log('Reweave 확장 프로그램이 설치되었습니다.');
});
