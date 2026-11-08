import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import backIcon from '../../assets/back-arrow.svg';
import searchIcon from '../../assets/storage/search.svg';
import moreIcon from '../../assets/storage/moreH.svg';
import select from '../../assets/storage/select.svg';
import down from '../../assets/storage/down.svg';
import defaulticon from '../../assets/icon.svg';
import check from '../../assets/storage/check-mark.svg';
import plus from '../../assets/plus.svg';
import check1 from '../../assets/storage/check.svg';
import './ProjectDetail.scss';

function ProjectDetail({ projectData, onClose }) {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    // 💡 부모에서 받은 props(projectData)나 라우터 state, 혹은 기본값 순서대로 안전하게 이름 추출
    const projectName = projectData?.title || location.state?.projectName || '진행 중인 프로젝트';

    const [items, setItems] = useState([
        { id: 1, title: '프로젝트 관련 링크 1 | 디자인 가이드', thumb: '' },
        { id: 2, title: 'API 명세서 및 요구사항 정의서', thumb: '' },
        { id: 3, title: '와이어프레임 및 피그마 시안 링크', thumb: '' },
        { id: 4, title: '팀 회고 및 주간 미팅 록', thumb: '' },
    ]);

    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [activeModal, setActiveModal] = useState(null);

    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [sortType, setSortType] = useState('최신순');

    const handleSelectItem = (itemId) => {
        if (!isSelectMode) return;
        setSelectedIds((prev) =>
            prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId]
        );
    };

    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        setSelectedIds([]);
    };

    const handleDeleteItems = () => {
        setItems(items.filter((item) => !selectedIds.includes(item.id)));
        setSelectedIds([]);
        setIsSelectMode(false);
        setActiveModal(null);
    };

    const categories = [
        { id: 0, name: '미분류' },
        { id: 1, name: '참조 카테고리 1' },
        { id: 2, name: '참조 카테고리 2' },
    ];
    const [targetCategory, setTargetCategory] = useState(categories[0]);

    const handleMoveItems = () => {
        alert(`선택한 항목이 '${targetCategory.name}' (으)로 이동되었습니다.`);
        setSelectedIds([]);
        setIsSelectMode(false);
        setActiveModal(null);
    };

    // 뒤로가기 처리 (prop으로 온 onClose가 있으면 실행, 없으면 라우터 네비게이트)
    const handleBack = () => {
        if (onClose) {
            onClose();
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="project-detail-wrap" onClick={() => setSortDropdownOpen(false)}>
            {/* 고정 헤더 */}
            <header className="detail-header">
                <div className="header-left">
                    <button className="back-btn" onClick={handleBack} type="button">
                        <img src={backIcon} alt="뒤로가기" />
                    </button>
                    <h1>{projectName}</h1>
                </div>

                <div className="header-right">
                    <button className="icon-btn" type="button" onClick={() => navigate('/storage/search')}>
                        <img src={searchIcon} alt="검색" />
                    </button>
                    <button className="icon-btn" type="button">
                        <img src={moreIcon} alt="더보기" />
                    </button>
                </div>
            </header>

            {/* 메인 콘텐츠 영역 */}
            <main className="detail-main">
                {/* 상단 컨트롤 바 */}
                <div className="sticky-action-bar">
                    {!isSelectMode ? (
                        <div className="normal-bar">
                            <div className="sort-dropdown-wrap" onClick={(e) => e.stopPropagation()}>
                                <button
                                    className="sort-toggle-btn"
                                    type="button"
                                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                                >
                                    <span>{sortType}</span>
                                    <span className="arrow"><img src={down} alt="" /></span>
                                </button>
                                {sortDropdownOpen && (
                                    <ul className="sort-menu">
                                        <li onClick={() => { setSortType('최신순'); setSortDropdownOpen(false); }}>최신순</li>
                                        <li onClick={() => { setSortType('오래된순'); setSortDropdownOpen(false); }}>오래된순</li>
                                    </ul>
                                )}
                            </div>

                            <div className="right-controls">
                                <span className="total-count-text">총 {items.length}개</span>
                                <button className="select-mode-btn" onClick={toggleSelectMode} type="button">
                                    <span><img src={select} alt="" /></span> 선택하기
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="selecting-bar">
                            <span className="selected-count-text">{selectedIds.length}개 선택됨</span>
                            <div className="select-actions">
                                <button
                                    className={`action-btn move ${selectedIds.length === 0 ? 'disabled' : ''}`}
                                    onClick={() => selectedIds.length > 0 && setActiveModal('move')}
                                    type="button"
                                >
                                    이동하기
                                </button>
                                <button
                                    className={`action-btn delete ${selectedIds.length === 0 ? 'disabled' : ''}`}
                                    onClick={() => selectedIds.length > 0 && setActiveModal('delete')}
                                    type="button"
                                >
                                    삭제하기
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 아이템 그리드 */}
                <div className="item-grid">
                    {items.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                            <div
                                className={`detail-card ${isSelectMode ? 'selectable' : ''} ${isSelected ? 'selected' : ''}`}
                                key={item.id}
                                style={{ cursor: 'pointer' }}
                                onClick={() =>
                                    isSelectMode ? handleSelectItem(item.id) : navigate(`/link/${item.id}`)
                                }
                            >
                                <div className="card-thumb">
                                    {item.thumb ? (
                                        <img src={item.thumb} alt="" />
                                    ) : (
                                        <div className="default-thumb-box">
                                            <img src={defaulticon} alt="" />
                                        </div>
                                    )}
                                    {isSelectMode && (
                                        <div className={`checkbox-circle ${isSelected ? 'checked' : ''}`}>
                                            {isSelected && <span className="check-mark"><img src={check} alt="" /></span>}
                                        </div>
                                    )}
                                </div>
                                <p className="card-title">{item.title}</p>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* 모달 영역 (이동 / 삭제) */}
            {activeModal === 'move' && (
                <div className="modal-overlay-detail" onClick={() => setActiveModal(null)}>
                    <div className="modal-content move-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-top-bar">
                            <h2>링크 이동</h2>
                            <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
                        </div>
                        <div className="modal-section-title">
                            <span>카테고리</span>
                            <button className="add-category-btn" type="button"><img src={plus} alt="" /></button>
                        </div>
                        <div className="category-scroll-list">
                            {categories.map((cat) => (
                                <div
                                    className="category-select-item"
                                    key={cat.id}
                                    onClick={() => setTargetCategory(cat)}
                                >
                                    <span>{cat.name}</span>
                                    {targetCategory.id === cat.id && (
                                        <span className="radio-check">
                                            <img src={check1} alt="" />
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button className="submit-action-btn" onClick={handleMoveItems} type="button">
                            이동하기
                        </button>
                        <p className="enter" onClick={() => setActiveModal(null)}>닫기</p>
                    </div>
                </div>
            )}

            {activeModal === 'delete' && (
                <div className="modal-overlay-detail" onClick={() => setActiveModal(null)}>
                    <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
                        <p className="delete-msg">
                            정말로 <strong>선택한 링크를</strong><br />삭제하시겠습니까?
                        </p>
                        <div className="delete-modal-btns">
                            <button className="modal-btn cancel" onClick={() => setActiveModal(null)} type="button">
                                취소
                            </button>
                            <button className="modal-btn confirm" onClick={handleDeleteItems} type="button">
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProjectDetail;