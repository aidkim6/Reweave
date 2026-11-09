import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import searchIcon from '../../assets/project/search.svg';
import moreRIcon from '../../assets/project/more_r.svg';
import upIcon from '../../assets/project/up.svg';
import downIcon from '../../assets/project/down.svg';
import checkIcon from '../../assets/project/check.svg';
import moreCIcon from '../../assets/project/more_c.svg';
import markIcon from '../../assets/icon.svg';
import editIcon from '../../assets/project/edit.svg';
import deleteIcon from '../../assets/project/delete.svg';
import addIcon from '../../assets/project/add.svg';
import sortIcon from '../../assets/project/sort.svg';

import ProjectForm from './ProjectForm';
import ProjectSort from './ProjectSort';
import ProjectDetail from './ProjectDetail';

import './Project.scss';

const Project = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [viewMode, setViewMode] = useState('list');
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const [categories, setCategories] = useState([
    { id: 'all', name: '전체', selected: true },
  ]);

  const [statusFilter, setStatusFilter] = useState('전체');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [openMoreId, setOpenMoreId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filterOptions = ['전체', '시작 전', '진행 중', '완료'];

  const statusToApi = {
    '시작 전': 'NOT_STARTED',
    '진행 중': 'IN_PROGRESS',
    '완료': 'COMPLETED'
  };

  const statusFromApi = {
    'NOT_STARTED': { text: '시작 전', class: 'before-start' },
    'IN_PROGRESS': { text: '진행 중', class: 'in-progress' },
    'COMPLETED': { text: '완료', class: 'completed' }
  };

  const [rawProjectList, setRawProjectList] = useState([]);
  const [projectList, setProjectList] = useState([]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      let queryUrl = '/api/purpose-groups';
      if (statusFilter !== '전체') {
        queryUrl += `?status=${statusToApi[statusFilter]}`;
      }

      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) throw new Error('프로젝트 목록을 불러오지 못했습니다.');

      const result = await response.json();
      const rawData = result.data || [];

      const formattedList = rawData.map((item) => {
        const mappedStatus = statusFromApi[item.status] || { text: '진행 중', class: 'in-progress' };
        const tags = item.categories ? item.categories.map((c) => `#${c.categoryName || c.name}`) : [];

        return {
          id: item.purposeGroupId,
          title: item.purposeName,
          tags: tags.length > 0 ? tags : ['#일반'],
          status: mappedStatus.text,
          statusClass: mappedStatus.class,
          rawStatus: item.status,
          categories: item.categories || [],
          thumbnails: item.thumbnails || [],
          bookmarkCount: item.bookmarkCount || 0,
        };
      });

      setRawProjectList(formattedList);

      const extractedCategoriesMap = new Map();
      formattedList.forEach((item) => {
        if (item.categories && Array.isArray(item.categories)) {
          item.categories.forEach((cat) => {
            const catId = cat.categoryId || cat.id;
            const catName = cat.categoryName || cat.name;
            if (catId && catName) {
              extractedCategoriesMap.set(catId, catName);
            }
          });
        }
      });

      setCategories((prevCategories) => {
        const currentSelectedIds = prevCategories
          .filter((c) => c.selected && c.id !== 'all')
          .map((c) => c.id);

        const newCategoryList = [{ id: 'all', name: '전체', selected: currentSelectedIds.length === 0 }];

        extractedCategoriesMap.forEach((name, id) => {
          newCategoryList.push({
            id: id,
            name: name,
            selected: currentSelectedIds.includes(id),
          });
        });

        if (!newCategoryList.some((c) => c.selected)) {
          newCategoryList[0].selected = true;
        }

        return newCategoryList;
      });

    } catch (error) {
      console.error('프로젝트 조회 에러:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  useEffect(() => {
    const selectedCategoryIds = categories
      .filter((cat) => cat.id !== 'all' && cat.selected)
      .map((cat) => cat.id);

    if (selectedCategoryIds.length === 0) {
      setProjectList(rawProjectList);
    } else {
      const filtered = rawProjectList.filter((project) =>
        project.categories.some((cat) => {
          const catId = cat.categoryId || cat.id;
          return selectedCategoryIds.includes(catId);
        })
      );
      setProjectList(filtered);
    }
  }, [categories, rawProjectList]);

  const handleCategoryClick = (id) => {
    setCategories((prevCategories) => {
      let updated;
      if (id === 'all') {
        updated = prevCategories.map((cat) => ({ ...cat, selected: cat.id === 'all' }));
      } else {
        updated = prevCategories.map((cat) => {
          if (cat.id === 'all') return { ...cat, selected: false };
          if (cat.id === id) return { ...cat, selected: !cat.selected };
          return cat;
        });
        const hasSelected = updated.some((cat) => cat.id !== 'all' && cat.selected);
        if (!hasSelected) {
          updated = updated.map((cat) => ({ ...cat, selected: cat.id === 'all' }));
        }
      }
      return updated;
    });
  };

  const handleFormSubmit = () => {
    setViewMode('list');
    setEditingProject(null);
    fetchProjects();
  };

  const handleSortSave = (updatedList) => {
    setProjectList(updatedList);
    setViewMode('list');
    fetchProjects();
  };

  const handleCardClick = (project) => {
    setSelectedProject(project);
    setViewMode('detail');
  };

  // 삭제 확인 모달에서 "삭제"를 눌렀을 때 실행
  const handleDeleteProject = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/purpose-groups/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) throw new Error('삭제에 실패했습니다.');

      setOpenMoreId(null);
      fetchProjects();
    } catch (error) {
      console.error('프로젝트 삭제 에러:', error);
      alert(error.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ProjectForm
        mode={viewMode}
        projectData={editingProject}
        onClose={() => {
          setViewMode('list');
          setEditingProject(null);
        }}
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
          {/* 🔍 검색 버튼 클릭 시 프로젝트 검색 페이지로 이동 */}
          <button
            className="icon-btn"
            type="button"
            onClick={() => navigate('/project/search')}
          >
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
                    setEditingProject(null);
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
            {projectList.length === 0 ? (
              <div style={{ color: '#929292', textAlign: 'center', gridColumn: 'span 2', padding: '40px 0' }}>
                해당 조건의 프로젝트가 없습니다.
              </div>
            ) : (
              projectList.map((item) => (
                <div
                  key={item.id}
                  className="project-item-card"
                  onClick={() => handleCardClick(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="thumbnail-box thumb">
                    {item.thumbnails && item.thumbnails.length > 0 ? (
                      <div className={`thumb-grid thumb-${Math.min(item.thumbnails.length, 4)}`}>
                        {item.thumbnails.slice(0, 4).map((src, i) => (
                          <img key={i} src={src} alt="" className="thumb-img" />
                        ))}
                      </div>
                    ) : (
                      <div className="default-thumb-box">
                        <img src={markIcon} alt="기본 로고" className="default-logo-img" />
                      </div>
                    )}
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
                                setDeleteTarget(item);
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
              ))
            )}
          </div>
        </section>
      </main>

      {/* 삭제 확인 모달 (Storage와 동일) */}
      {deleteTarget && (
        <div className="modal-dim" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <p>
              정말로 “<em>{deleteTarget.title}</em>”을
              <br />
              삭제하시겠습니까?
            </p>
            <div className="modal-btns">
              <button type="button" className="btn-cancel" onClick={() => setDeleteTarget(null)}>
                취소
              </button>
              <button type="button" className="btn-delete" onClick={handleDeleteProject}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Project;