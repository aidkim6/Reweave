import React, { useState, useEffect, useRef } from 'react';
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
import { api } from '../../features/client';
import sortCheck from '../../assets/storage/check-white.svg';
import './ProjectDetail.scss';

function ProjectDetail({ projectData, onClose }) {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    // 프로젝트 ID 및 이름 확보
    const purposeGroupId = projectData?.id || projectData?.purposeGroupId || id;
    const projectName = projectData?.title || projectData?.purposeName || location.state?.projectName || '진행 중인 프로젝트';

    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [activeModal, setActiveModal] = useState(null);

    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [sortType, setSortType] = useState('최신순'); // '최신순' / '오래된순'

    const [categories, setCategories] = useState([{ id: 0, name: '미분류' }]);
    const [targetCategory, setTargetCategory] = useState({ id: 0, name: '미분류' });

    // 이 프로젝트에 대해 AI 동기화를 이미 했는지 기억 (정렬만 바꿀 때 재호출 방지)
    const syncedGroupRef = useRef(null);

    // 바깥을 누르면 정렬 드롭다운 닫기
    useEffect(() => {
        const close = () => setSortDropdownOpen(false);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    // 목록 조회 (size를 API 허용 범위인 20으로 안전하게 설정)
    const loadList = async (size = 20) => {
        const sort = sortType === '최신순' ? 'latest' : 'oldest';
        const res = await api.get(`/api/purpose-groups/${purposeGroupId}/bookmarks`, {
            params: { sort, page: 0, size }
        });
        const data = res.data.data ?? res.data;
        const rawBookmarks = data.bookmarks || data || [];
        return { data, rawBookmarks };
    };

    // 목록 조회 후 화면 반영
    const showList = async () => {
        const { data, rawBookmarks } = await loadList(20);
        setItems(
            rawBookmarks.map((b) => ({
                id: b.bookmarkId,
                title: b.title || '제목 없음',
                thumb: b.thumbnailUrl || '',
            }))
        );
        setTotalCount(data.totalElements ?? rawBookmarks.length);
    };

    // AI로 새 링크를 찾아 프로젝트에 추가. 추가된 게 있으면 true
    const syncWithAi = async () => {
        try {
            // 1) props로 넘어온 projectData가 있다면 그것을 우선 활용
            let categoryIds = projectData?.categories 
                ? projectData.categories.map((c) => c.categoryId || c.id) 
                : [];

            // props에 없다면 API로 조회
            if (categoryIds.length === 0) {
                const detailRes = await api.get(`/api/purpose-groups/${purposeGroupId}`);
                const detail = detailRes.data.data ?? detailRes.data;

                categoryIds = (detail.categories || []).map((c) => c.categoryId || c.id);
                if (categoryIds.length === 0 && detail.categoryId) {
                    categoryIds.push(detail.categoryId);
                }
            }

            if (categoryIds.length === 0) return false;

            // 2) 이미 연결된 링크 ID 전체 (size 범위를 API 제한인 20으로 맞춤)
            const { rawBookmarks: existing } = await loadList(20);
            const existingIds = new Set(existing.map((b) => b.bookmarkId));

            // 3) AI 추천 (응답: { matchedBookmarkIds, reason })
            const recommendRes = await api.post('/api/ai/recommend', {
                purposeTitle: projectData?.title || projectName,
                categoryIds,
            });
            const rec = recommendRes.data.data ?? recommendRes.data;
            const matchedIds = rec.matchedBookmarkIds || [];

            // 4) 아직 없는 링크만 추가
            const newIds = matchedIds.filter((bid) => !existingIds.has(bid));
            if (newIds.length === 0) return false;

            await api.post(`/api/purpose-groups/${purposeGroupId}/bookmarks`, {
                bookmarkIds: newIds,
            });
            return true;
        } catch (aiError) {
            console.error(
                'AI 자동 그룹핑 추천 연동 중 에러 발생:',
                aiError.response?.status,
                aiError.response?.data || aiError
            );
            return false;
        }
    };

    // withAi가 true일 때만 AI 동기화 (삭제/이동/정렬 변경 후에는 false)
    const fetchProjectBookmarks = async (withAi = false) => {
        if (!purposeGroupId) return;

        try {
            setIsLoading(true);
            await showList();
        } catch (error) {
            console.error('목적 그룹 북마크 조회 에러:', error.response?.status, error.response?.data);
        } finally {
            setIsLoading(false);
        }

        if (withAi) {
            const added = await syncWithAi();
            if (added) {
                try {
                    await showList();
                } catch (e) {
                    console.error('목록 갱신 에러:', e);
                }
            }
        }
    };

    useEffect(() => {
        // 프로젝트를 처음 열 때만 AI 동기화, 정렬만 바꿀 땐 목록만 다시 조회
        const needAi = syncedGroupRef.current !== purposeGroupId;
        syncedGroupRef.current = purposeGroupId;
        fetchProjectBookmarks(needAi);

        // 새 링크를 저장했을 때는 항상 AI 동기화
        const handleBookmarkSaved = () => {
            fetchProjectBookmarks(true);
        };

        window.addEventListener('bookmarkSaved', handleBookmarkSaved);
        return () => {
            window.removeEventListener('bookmarkSaved', handleBookmarkSaved);
        };
    }, [purposeGroupId, sortType]);

    // 이동 모달에 보여줄 내 카테고리 목록 불러오기
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

    // 목적 그룹 내 북마크 삭제 연동
    const handleDeleteItems = async () => {
        if (selectedIds.length === 0) return;

        try {
            await api.delete(`/api/purpose-groups/${purposeGroupId}/bookmarks`, {
                data: { bookmarkIds: selectedIds }
            });
            await fetchProjectBookmarks(false);
        } catch (error) {
            console.error('북마크 삭제 에러:', error.response?.status, error.response?.data);
        } finally {
            setSelectedIds([]);
            setIsSelectMode(false);
            setActiveModal(null);
        }
    };

    // 목적 그룹 내 북마크 이동 연동 (백엔드가 PUT이라 api.put 사용)
    const handleMoveItems = async () => {
        if (selectedIds.length === 0) return;

        try {
            await api.put(`/api/purpose-groups/${purposeGroupId}/bookmarks/move`, {
                targetPurposeGroupId: targetCategory.id === 0 ? null : targetCategory.id,
                bookmarkIds: selectedIds
            });
            await fetchProjectBookmarks(false);
        } catch (error) {
            console.error('북마크 이동 에러:', error.response?.status, error.response?.data);
        } finally {
            setSelectedIds([]);
            setIsSelectMode(false);
            setActiveModal(null);
        }
    };

    const handleBack = () => {
        if (onClose) {
            onClose();
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="project-detail-wrap">
            {/* 고정 헤더 */}
            <header className="detail-header">
                {!isSelectMode ? (
                    <>
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
                                <button className="select-mode-btn" onClick={toggleSelectMode} type="button">
                                    <span><img src={select} alt="" /></span> 선택하기
                                </button>
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
                    {isLoading ? (
                        <div style={{ color: '#929292', textAlign: 'center', gridColumn: 'span 2', padding: '40px 0' }}>
                            AI가 그룹핑한 링크를 불러오는 중...
                        </div>
                    ) : items.length === 0 ? (
                        <div style={{ color: '#929292', textAlign: 'center', gridColumn: 'span 2', padding: '40px 0' }}>
                            이 프로젝트에 연결된 링크가 없습니다.
                        </div>
                    ) : (
                        items.map((item) => {
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
                        })
                    )}
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
                        <p className="enter" type="button" onClick={() => setActiveModal(null)}>enter</p>
                    </div>
                </div>
            )}

            {activeModal === 'delete' && (
                <div className="modal-overlay-detail" onClick={() => setActiveModal(null)}>
                    <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                        <p>
                            정말로 <em>선택한 링크를</em>
                            <br />
                            삭제하시겠습니까?
                        </p>
                        <div className="modal-btns">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => setActiveModal(null)}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                className="btn-delete"
                                onClick={handleDeleteItems}
                            >
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