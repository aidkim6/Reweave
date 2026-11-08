import React, { useState } from 'react';
import './Project.scss';

import ProjectForm from './ProjectForm';
import ProjectSort from './ProjectSort';
import ProjectDetail from './ProjectDetail';

// Assets
import searchIcon from '../../assets/project/search.svg';
import moreRIcon from '../../assets/project/more_r.svg';
import upIcon from '../../assets/project/up.svg';
import downIcon from '../../assets/project/down.svg';
import checkIcon from '../../assets/project/check.svg';
import moreCIcon from '../../assets/project/more_c.svg';
import markIcon from '../../assets/project/mark.svg';
import editIcon from '../../assets/project/edit.svg';
import deleteIcon from '../../assets/project/delete.svg';
import addIcon from '../../assets/project/add.svg';
import sortIcon from '../../assets/project/sort.svg';

const Project = () => {
  const [viewMode, setViewMode] = useState('list');
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const [categories, setCategories] = useState([
    { id: 1, name: '전체', selected: true },
    { id: 2, name: '카테고리 명', selected: false },
    { id: 3, name: '카테고리 명', selected: false },
    { id: 4, name: '카테고리 명', selected: false },
  ]);

  const [statusFilter, setStatusFilter] = useState('전체');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [openMoreId, setOpenMoreId] = useState(null);

  const filterOptions = ['전체', '시작 전', '진행 중', '완료'];

  const [projectList, setProjectList] = useState([
    {
      id: 1,
      title: '프로젝트 제목',
      tags: ['#카테고리1', '#카테고리2'],
      status: '시작 전',
      statusClass: 'before-start',
    },
    {
      id: 2,
      title: '엄마랑 일본여행',
      tags: ['#여행', '#쇼핑'],
      status: '진행 중',
      statusClass: 'in-progress',
    },
    {
      id: 3,
      title: '프로젝트 제목',
      tags: ['#카테고리1', '#카테고리2'],
      status: '완료',
      statusClass: 'completed',
    },
    {
      id: 4,
      title: '프로젝트 제목',
      tags: ['#카테고리1', '#카테고리2'],
      status: '진행 중',
      statusClass: 'in-progress',
    },
  ]);

  const handleCategoryClick = (id) => {
    setCategories((prevCategories) => {
      if (id === 1) {
        return prevCategories.map((cat) => ({ ...cat, selected: cat.id === 1 }));
      }
      const updated = prevCategories.map((cat) => {
        if (cat.id === 1) return { ...cat, selected: false };
        if (cat.id === id) return { ...cat, selected: !cat.selected };
        return cat;
      });
      const hasSelected = updated.some((cat) => cat.id !== 1 && cat.selected);
      if (!hasSelected) {
        return updated.map((cat) => ({ ...cat, selected: cat.id === 1 }));
      }
      return updated;
    });
  };

  const handleFormSubmit = (formData) => {
    console.log('폼 제출 데이터:', formData);
    setViewMode('list');
  };

  const handleSortSave = (updatedList) => {
    setProjectList(updatedList);
    setViewMode('list');
  };

  const handleCardClick = (project) => {
    setSelectedProject(project);
    setViewMode('detail');
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ProjectForm
        mode={viewMode}
        projectData={editingProject}
        onClose={() => setViewMode('list')}
        onSubmit={handleFormSubmit}
      />
    );
  }

  if (viewMode === 'sort') {
    return (
      <ProjectSort
        projectList={projectList}
        onClose={() => setViewMode('list')}
        onSave={handleSortSave}
      />
    );
  }


  if (viewMode === 'detail') {
    return (
      <ProjectDetail
        projectData={selectedProject}
        onClose={() => setViewMode('list')}
      />
    );
  }

  return (
    <div
      className="project-container"
      onClick={() => {
        setOpenMoreId(null);
        setIsHeaderMenuOpen(false);
      }}
    >
      <header className="project-header">
        <h1>프로젝트</h1>
        <div className="header-icons">
          <button className="icon-btn" type="button">
            <img src={searchIcon} alt="검색" />
          </button>

          <div className="header-more-wrapper">
            <button
              className="icon-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsHeaderMenuOpen(!isHeaderMenuOpen);
                setOpenMoreId(null);
              }}
            >
              <img src={moreRIcon} alt="더보기" />
            </button>

            {isHeaderMenuOpen && (
              <div
                className="header-action-popover"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="header-action-item"
                  onClick={() => {
                    setViewMode('create');
                    setIsHeaderMenuOpen(false);
                  }}
                  type="button"
                >
                  <img src={addIcon} alt="프로젝트 추가" className="action-icon" />
                  <span>프로젝트 추가</span>
                </button>
                <button
                  className="header-action-item"
                  onClick={() => {
                    setViewMode('sort');
                    setIsHeaderMenuOpen(false);
                  }}
                  type="button"
                >
                  <img src={sortIcon} alt="순서 정렬" className="action-icon" />
                  <span>순서 정렬</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="project-content">
        <section className="category-section">
          <div className="category-list">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-chip ${cat.selected ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
                type="button"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>

        <section className="filter-section">
          <button
            className="filter-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsFilterOpen(!isFilterOpen);
            }}
            type="button"
          >
            <span>{statusFilter}</span>
            <img
              src={isFilterOpen ? upIcon : downIcon}
              alt="드롭다운"
              className="arrow-icon"
            />
          </button>

          {isFilterOpen && (
            <div className="filter-dropdown">
              {filterOptions.map((opt) => {
                const isSelected = statusFilter === opt;
                return (
                  <div
                    key={opt}
                    className={`filter-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setStatusFilter(opt);
                      setIsFilterOpen(false);
                    }}
                  >
                    <span className="icon-wrapper">
                      {isSelected && (
                        <img src={checkIcon} alt="선택됨" className="check-icon" />
                      )}
                    </span>
                    <span className="option-text">{opt}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="project-grid-section">
          <div className="project-grid">
            {projectList.map((item) => (
              <div
                key={item.id}
                className="project-item-card"
                onClick={() => handleCardClick(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className="thumbnail-box">
                  <img src={markIcon} alt="마크" className="mark-icon" />
                </div>

                <div className="card-body">
                  <div className="title-row">
                    <span className="card-title">{item.title}</span>
                    
                    <div className="more-menu-wrapper">
                      <button
                        className="more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMoreId(openMoreId === item.id ? null : item.id);
                          setIsHeaderMenuOpen(false);
                        }}
                        type="button"
                      >
                        <img src={moreCIcon} alt="더보기" />
                      </button>

                      {openMoreId === item.id && (
                        <div
                          className="card-action-popover"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="action-item edit-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProject(item);
                              setViewMode('edit');
                              setOpenMoreId(null);
                            }}
                            type="button"
                          >
                            <img src={editIcon} alt="수정하기" className="action-icon" />
                            <span>수정하기</span>
                          </button>
                          <button
                            className="action-item delete-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMoreId(null);
                            }}
                            type="button"
                          >
                            <img src={deleteIcon} alt="삭제하기" className="action-icon" />
                            <span>삭제하기</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="tags-row">
                    {item.tags.map((tag, idx) => (
                      <span key={idx} className="tag-chip">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="status-row">
                    <span className={`status-badge ${item.statusClass}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Project;