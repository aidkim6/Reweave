import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login/Login.jsx';
import Signup from './pages/Signup/Signup.jsx';
import Home from './pages/Home/Home.jsx';
import Project from './pages/Project/Project.jsx'; // 새로 만든 Project 페이지 연결
import Mypage from './pages/Mypage/myPage.jsx';
import Storage from './pages/Storage/Storage.jsx';
import StorageAdd from './pages/Storage/StorageAdd.jsx';
import StorageSort from './pages/Storage/StorageSort.jsx';
import StorageSearch from './pages/Storage/StorageSearch.jsx';
import CategoryDetail from './pages/Storage/CategoryDetail.jsx';
import LinkDetail from './pages/LinkDetail/LinkDetail.jsx';
import BottomNav from './components/BottomNav/BottomNav.jsx';
import SaveLinkModal from './components/SaveLinkModal/SaveLinkModal.jsx';
import StorageAdd from './pages/Storage/StorageAdd.jsx';
import StorageSearch from './pages/Storage/StorageSearch.jsx';
import StorageSort from './pages/Storage/StorageSort.jsx';
import CategoryDetail from './pages/Storage/CategoryDetail.jsx';


import './App.scss';



function App() {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hideBottomNavPaths = ['/login', '/signup'];
  // 링크 상세 화면(/link/:id)은 디자인에 하단 메뉴바가 없어요
  const showBottomNav =
    !hideBottomNavPaths.includes(location.pathname) && !location.pathname.startsWith('/link/');

  const handleSaveLink = (linkData) => {
    console.log('저장된 링크 데이터:', linkData);
    // TODO: 저장 API 연동 또는 상태 업데이트
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
          <Route path='/storage/add' element={<StorageAdd />} />
          <Route path='/storage/sort' element={<StorageSort />} />
          <Route path='/storage/search' element={<StorageSearch />} />
          <Route path="/storage/detail/:id" element={<CategoryDetail />} />
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
        onSave={handleSaveLink}
      />
    </div>
  );
}

export default App;