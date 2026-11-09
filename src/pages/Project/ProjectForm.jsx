import React, { useState, useEffect } from 'react';
import './ProjectForm.scss';

import backIcon from '../../assets/back-arrow.svg';
import clearIcon from '../../assets/x.svg'; 

const ProjectForm = ({ mode = 'create', projectData = null, onClose, onSubmit }) => {
  const isEdit = mode === 'edit';

  const [title, setTitle] = useState('');

  const [availableCategories, setAvailableCategories] = useState([
    { categoryId: 1, categoryName: '청소' },
    { categoryId: 2, categoryName: '여행' },
    { categoryId: 3, categoryName: '쇼핑' },
    { categoryId: 4, categoryName: '맛집' },
    { categoryId: 5, categoryName: '디자인' },
    { categoryId: 6, categoryName: '취업준비' },
    { categoryId: 7, categoryName: '포트폴리오' },
    { categoryId: 8, categoryName: '뜨개질' },
    { categoryId: 9, categoryName: '요리' },
  ]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [showExitModal, setShowExitModal] = useState(false);

  const availableStatuses = ['시작 전', '진행 중', '완료'];

  const statusToApi = {
    '시작 전': 'NOT_STARTED',
    '진행 중': 'IN_PROGRESS',
    '완료': 'COMPLETED'
  };

  const statusFromApi = {
    'NOT_STARTED': '시작 전',
    'IN_PROGRESS': '진행 중',
    'COMPLETED': '완료'
  };

  const isValid = title.trim().length > 0 && selectedCategories.length > 0 && status !== null;
  const isDirty = title.trim().length > 0 || selectedCategories.length > 0 || status !== null;


  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/categories', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });

        if (!response.ok) return;

        const result = await response.json();
        const categoriesData = result.data?.categories || result.data || result;
        
        if (Array.isArray(categoriesData) && categoriesData.length > 0) {
          setAvailableCategories(categoriesData);
        }
      } catch (error) {
        console.error('카테고리 조회 에러 (기본 목록 유지):', error);
      }
    };

    fetchCategories();
  }, []);


  useEffect(() => {
    if (isEdit && projectData) {
      setTitle(projectData.purposeName || projectData.title || '');
      

      if (projectData.categoryIds) {
        setSelectedCategories(projectData.categoryIds);
      } else if (projectData.categories) {
        setSelectedCategories(projectData.categories.map(c => c.categoryId || c.id));
      }

      setStatus(statusFromApi[projectData.status] || projectData.status || '진행 중');
    }
  }, [isEdit, projectData]);

  const handleCategoryToggle = (catId) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const handleStatusToggle = (st) => {
    if (status === st) {
      setStatus(null);
    } else {
      setStatus(st);
    }
  };

  const handleClearTitle = () => {
    setTitle('');
  };

  const handleBackClick = () => {
    if (isDirty) {
      setShowExitModal(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!isValid || isLoading) return;

    try {
      setIsLoading(true);

      const requestBody = {
        purposeName: title,
        status: statusToApi[status] || 'IN_PROGRESS',
        categoryIds: selectedCategories,
      };

      const token = localStorage.getItem('accessToken');
      const url = isEdit 
        ? `/api/purpose-groups/${projectData.purposeGroupId || projectData.id}` 
        : `/api/purpose-groups`;
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('프로젝트 저장에 실패했습니다.');
      }

      const result = await response.json();

      if (onSubmit) {
        onSubmit(result.data || result);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('API 연동 에러:', error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="project-form-container">
      <header className="form-header">
        <div className="header-left">
          <button className="back-btn" onClick={handleBackClick} type="button">
            <img src={backIcon} alt="뒤로가기" />
          </button>
          <h1>{isEdit ? '프로젝트 수정하기' : '새 프로젝트 만들기'}</h1>
        </div>
        <button
          className={`submit-btn ${isValid && !isLoading ? 'active' : ''}`}
          onClick={handleSubmit}
          type="button"
          disabled={!isValid || isLoading}
        >
          {isLoading ? '저장 중...' : '완료'}
        </button>
      </header>

      <main className="form-content">
        <section className="form-section title-section">
          <label className="section-label">프로젝트 제목</label>
          <div className="input-box">
            <input
              type="text"
              placeholder="프로젝트 제목 추가"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {title.length > 0 && (
              <button className="clear-btn" onClick={handleClearTitle} type="button">
                <img src={clearIcon} alt="지우기" />
              </button>
            )}
          </div>
        </section>

        <section className="form-section category-section">
          <label className="section-label">참조할 카테고리 선택</label>
          <div className="category-chip-grid">
            {availableCategories.map((cat) => {
              const catId = cat.categoryId || cat.id;
              const catName = cat.categoryName || cat.name;
              const isSelected = selectedCategories.includes(catId);
              
              return (
                <button
                  key={catId}
                  type="button"
                  className={`form-category-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleCategoryToggle(catId)}
                >
                  {catName}
                </button>
              );
            })}
          </div>
        </section>

        <section className="form-section status-section">
          <label className="section-label">프로젝트 상태 설정</label>
          <div className="status-toggle-group">
            {availableStatuses.map((st) => {
              const isSelected = status === st;
              return (
                <button
                  key={st}
                  type="button"
                  className={`status-toggle-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleStatusToggle(st)}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {showExitModal && (
        <div className="exit-modal-overlay">
          <div className="exit-modal-card">
            <div className="modal-text-group">
              <p className="modal-description">
                <span className="highlight-text">완료 버튼</span>을 누르지 않으면
                <br />
                변경사항이 저장되지 않습니다
              </p>
            </div>
            <div className="modal-button-group">
              <button
                type="button"
                className="exit-btn"
                onClick={onClose}
              >
                나가기
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowExitModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectForm;