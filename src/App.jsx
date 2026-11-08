import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login/Login.jsx';
import Signup from './pages/Signup/Signup.jsx';
import Home from './pages/Home/Home.jsx';
import Project from './pages/Project/Project.jsx';
import Mypage from './pages/Mypage/myPage.jsx';
import Storage from './pages/Storage/Storage.jsx';
import StorageAdd from './pages/Storage/StorageAdd.jsx';
import StorageSort from './pages/Storage/StorageSort.jsx';
import StorageSearch from './pages/Storage/StorageSearch.jsx';
import CategoryDetail from './pages/Storage/CategoryDetail.jsx';
import LinkDetail from './pages/LinkDetail/LinkDetail.jsx';
import BottomNav from './components/BottomNav/BottomNav.jsx';
import SaveLinkModal from './components/SaveLinkModal/SaveLinkModal.jsx';

import './App.scss';

function App() {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hideBottomNavPaths = ['/login', '/signup'];
  const showBottomNav =
    !hideBottomNavPaths.includes(location.pathname) && !location.pathname.startsWith('/link/');

  // StorageAdd 페이지에서 카테고리를 만들고 돌아왔을 때 세션 신호를 감지해 모달을 자동으로 다시 열어줌
  useEffect(() => {
    const shouldReopen = sessionStorage.getItem('reopenSaveModal');
    if (shouldReopen === 'true') {
      sessionStorage.removeItem('reopenSaveModal');
      setIsModalOpen(true);
    }
  }, [location.pathname]);

  // 💡 북마크 저장 성공 시 홈 화면 목록 갱신을 위해 이벤트 발생
  const handleSaveLink = (linkData) => {
    console.log('저장된 링크 데이터:', linkData);
    window.dispatchEvent(new CustomEvent('bookmarkSaved'));
  };

  return (
    <div className="App">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/home" element={<Home />} />
          <Route path="/bookmark" element={<Storage />} />
          <Route path="/storage/add" element={<StorageAdd />} />
          <Route path="/storage/sort" element={<StorageSort />} />
          <Route path="/storage/search" element={<StorageSearch />} />
          <Route path="/storage/detail/:id" element={<CategoryDetail />} />
          <Route path="/link/:id" element={<LinkDetail />} />
          <Route path="/project" element={<Project />} />
          <Route path="/mypage" element={<Mypage />} />
        </Routes>
      </main>

      {/* 하단 바의 + 버튼 클릭 시 모달 열기 */}
      {showBottomNav && (
        <BottomNav onAddClick={() => setIsModalOpen(true)} />
      )}

      {/* 전역 링크 저장 모달 */}
      <SaveLinkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={handleSaveLink}
      />
    </div>
  );
}

export default App;