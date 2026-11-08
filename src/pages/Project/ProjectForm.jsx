import React, { useState, useEffect } from 'react';
import './ProjectForm.scss';

import backIcon from '../../assets/back-arrow.svg';
import clearIcon from '../../assets/x.svg'; 

const ProjectForm = ({ mode = 'create', projectData = null, onClose, onSubmit }) => {
  const isEdit = mode === 'edit';

  const [title, setTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [status, setStatus] = useState(null);
  
  const [showExitModal, setShowExitModal] = useState(false);

  const availableCategories = ['청소', '여행', '쇼핑', '맛집', '디자인', '취업준비', '포트폴리오', '뜨개질', '요리'];
  const availableStatuses = ['시작 전', '진행 중', '완료'];

  const isValid = title.trim().length > 0 && selectedCategories.length > 0 && status !== null;
  const isDirty = title.trim().length > 0 || selectedCategories.length > 0 || status !== null;

  useEffect(() => {
    if (isEdit && projectData) {
      setTitle(projectData.title || '');
      setSelectedCategories(projectData.categories || ['여행', '쇼핑']);
      setStatus(projectData.status || '진행 중');
    }
  }, [isEdit, projectData]);

  const handleCategoryToggle = (catName) => {
    if (selectedCategories.includes(catName)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== catName));
    } else {
      setSelectedCategories([...selectedCategories, catName]);
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

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      id: projectData?.id,
      title,
      categories: selectedCategories,
      status,
    });
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
          className={`submit-btn ${isValid ? 'active' : ''}`}
          onClick={handleSubmit}
          type="button"
          disabled={!isValid}
        >
          완료
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
            {availableCategories.map((catName) => {
              const isSelected = selectedCategories.includes(catName);
              return (
                <button
                  key={catName}
                  type="button"
                  className={`form-category-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleCategoryToggle(catName)}
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