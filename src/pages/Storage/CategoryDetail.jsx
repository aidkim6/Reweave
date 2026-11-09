import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import backIcon from '../../assets/back-arrow.svg';
import searchIcon from '../../assets/storage/search.svg';
import moreIcon from '../../assets/storage/moreW.svg';
import select from '../../assets/storage/select.svg';
import down from '../../assets/storage/down.svg';
import defaulticon from '../../assets/icon.svg';
import check from '../../assets/storage/check-mark.svg';
import plus from '../../assets/plus.svg';
import check1 from '../../assets/storage/check.svg';
import { api } from '../../features/client';
import sortCheck from '../../assets/storage/check-white.svg';
import './CategoryDetail.scss';

function CategoryDetail() {
    const navigate = useNavigate();
    const { id, type } = useParams();   // 내 카테고리면 id, 기본 카테고리면 type
    const isDefault = !!type;           // 기본 카테고리 화면인지
    const isTrash = type === 'trash';
    const defaultNames = { all: '전체', uncategorized: '미분류', trash: '최근 삭제된 링크' };
    const location = useLocation();

    const [name, setName] = useState(location.state?.categoryName || defaultNames[type] || '');
    const [items, setItems] = useState([]);
    const [totalCount, setTotalCount] = useState(0);

    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [activeModal, setActiveModal] = useState(null);

    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [sortType, setSortType] = useState('최신순');
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

    const [categories, setCategories] = useState([{ id: 0, name: '미분류' }]);
    const [targetCategory, setTargetCategory] = useState({ id: 0, name: '미분류' });

    // 바깥을 누르면 열려 있는 메뉴 닫기
    useEffect(() => {
        const close = () => {
            setHeaderMenuOpen(false);
            setSortDropdownOpen(false);
        };
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    // 이 카테고리의 링크 목록 불러오기
    const fetchItems = async () => {
        try {
            const sort = sortType === '최신순' ? 'latest' : 'oldest';
            let url = '/api/bookmarks';
            const params = { sort, page: 0, size: 20 };

            if (isTrash) url = '/api/bookmarks/trash';
            else if (type === 'uncategorized') params.uncategorized = true;
            else if (!isDefault) params.categoryId = id;   // 'all'은 아무것도 안 붙임

            const res = await api.get(url, { params });
            const data = res.data.data ?? res.data;
            setItems(
                data.bookmarks.map((b) => ({
                    id: b.bookmarkId,
                    title: b.title,
                    thumb: b.thumbnailUrl ?? '',
                }))
            );
            setTotalCount(data.totalElements);
        } catch (e) {
            console.log('링크 목록 실패', e.response?.status, e.response?.data);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [id, type, sortType]);

    
    // 이동 모달에 보여줄 내 카테고리 목록
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/api/categories');
                const data = res.data.data ?? res.data;
                setCategories([
                    { id: 0, name: '미분류' },
                    ...data.categories.map((c) => ({ id: c.categoryId, name: c.categoryName })),
                ]);
            } catch (e) {
                console.log('카테고리 목록 실패', e.response?.status, e.response?.data);
            }
        };
        fetchCategories();
    }, []);

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

    // 선택한 링크 삭제 (휴지통으로 이동)
    const handleDeleteItems = async () => {
        try {
            await api.post('/api/bookmarks/delete', { bookmarkIds: selectedIds });
            await fetchItems();
        } catch (e) {
            console.log('링크 삭제 실패', e.response?.status, e.response?.data);
        } finally {
            setSelectedIds([]);
            setIsSelectMode(false);
            setActiveModal(null);
        }
    };

    // 선택한 링크 다른 카테고리로 이동
    const handleMoveItems = async () => {
        try {
            await api.patch('/api/bookmarks/category', {
                bookmarkIds: selectedIds,
                categoryId: targetCategory.id === 0 ? null : targetCategory.id,
            });
            await fetchItems();
        } catch (e) {
            console.log('링크 이동 실패', e.response?.status, e.response?.data);
        } finally {
            setSelectedIds([]);
            setIsSelectMode(false);
            setActiveModal(null);
        }
    };

    // 카테고리 이름 수정
    const handleRenameCategory = async () => {
        setHeaderMenuOpen(false);
        const next = window.prompt('카테고리 이름을 입력하세요', name);
        if (!next || !next.trim()) return;

        try {
            await api.patch(`/api/categories/${id}`, { categoryName: next.trim() });
            setName(next.trim());
        } catch (e) {
            // 409 DUPLICATE_CATEGORY_NAME: 이름 중복
            console.log('카테고리 수정 실패', e.response?.status, e.response?.data);
        }
    };

    return (
        <div className="category-detail-wrap">
            {/* 고정 헤더 */}
            <header className="detail-header">
                {!isSelectMode ? (
                    <>
                        <div className="header-left">
                            <button className="back-btn" onClick={() => navigate(-1)} type="button">
                                <img src={backIcon} alt="뒤로가기" />
                            </button>
                            <h1>{name}</h1>
                        </div>

                        <div className="header-right">
                            <button
                                className="icon-btn"
                                type="button"
                                onClick={() => navigate('/storage/search', { state: { categoryId: id, categoryName: name } })}                            >
                                <img src={searchIcon} alt="검색" />
                            </button>

                            <div className="header-more" onClick={(e) => e.stopPropagation()}>
                                <button
                                    className="icon-btn"
                                    type="button"
                                    onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                                >
                                    <img src={moreIcon} alt="더보기" />
                                </button>
                                {headerMenuOpen && (
                                    <ul className="pop-menu header-menu">
                                        <li
                                            onClick={() => {
                                                setHeaderMenuOpen(false);
                                                toggleSelectMode();
                                            }}
                                        >
                                            <img src={select} alt="" /> 선택하기
                                        </li>
                                    </ul>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="header-left">
                        <button className="back-btn" onClick={toggleSelectMode} type="button">
                            <img src={backIcon} alt="선택 취소" />
                        </button>
                        <h1>{selectedIds.length}개 선택됨</h1>
                    </div>
                )}
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
                                        <li
                                            className={sortType === '최신순' ? 'active' : ''}
                                            onClick={() => { setSortType('최신순'); setSortDropdownOpen(false); }}
                                        >
                                            <span className="check-slot">
                                                {sortType === '최신순' && <img src={sortCheck} alt="" />}
                                            </span>
                                            최신순
                                        </li>
                                        <li
                                            className={sortType === '오래된순' ? 'active' : ''}
                                            onClick={() => { setSortType('오래된순'); setSortDropdownOpen(false); }}
                                        >
                                            <span className="check-slot">
                                                {sortType === '오래된순' && <img src={sortCheck} alt="" />}
                                            </span>
                                            오래된순
                                        </li>
                                    </ul>
                                )}
                            </div>

                            <div className="right-controls">
                                <span className="total-count-text">총 {totalCount}개</span>
                            </div>
                        </div>
                    ) : (
                        <div className="selecting-bar">
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
                        <p className="enter" type="button">enter</p>
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