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
import './CategoryDetail.scss';

function CategoryDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    const categoryName = location.state?.categoryName || '포트폴리오';

    const [items, setItems] = useState([
        { id: 1, title: 'Komi 패키지 디자인 | Fruit & Chocolate', thumb: '' },
        { id: 2, title: 'Rhythm 포스터 그래픽', thumb: '' },
        { id: 3, title: 'Matcha Café 브랜딩 프로젝트', thumb: '' },
        { id: 4, title: '삐삐 | 하루 한 번, 가족에게 보내는 생존신고 서비스 Family Widget Service', thumb: '' },
        { id: 5, title: '60px를 넘으면 말줄임표 처리하기60px를 넘으면 말줄임표 처리하기60px를 넘으면 말줄임표 처리하기', thumb: '' },
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
        { id: 1, name: '카테고리 제목' },
        { id: 2, name: '카테고리 제목' },
        { id: 3, name: '카테고리 제목' },
        { id: 4, name: '카테고리 제목' },
    ];
    const [targetCategory, setTargetCategory] = useState(categories[0]);

    // 이동 핸들러
    const handleMoveItems = () => {
        alert(`선택한 항목이 '${targetCategory.name}' (으)로 이동되었습니다.`);
        setSelectedIds([]);
        setIsSelectMode(false);
        setActiveModal(null);
    };
    return (
        <div className="category-detail-wrap">
            {/* 고정 헤더 */}
            <header className="detail-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate(-1)} type="button">
                        <img src={backIcon} alt="뒤로가기" />
                    </button>
                    <h1>{categoryName}</h1>
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
                                onClick={() => handleSelectItem(item.id)}
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
                        <p className='enter' type='button'>enter</p>
                    </div>
                </div>
            )}

            {activeModal === 'delete' && (
                <div className="modal-overlay" onClick={() => setActiveModal(null)}>
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

export default CategoryDetail;