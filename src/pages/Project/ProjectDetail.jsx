import React, { useState, useEffect } from 'react';
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

    // 프로젝트 ID 확보 (props나 URL, location에서 추출)
    const purposeGroupId = projectData?.id || projectData?.purposeGroupId || id;
    const projectName = projectData?.title || projectData?.purposeName || location.state?.projectName || '진행 중인 프로젝트';

    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [activeModal, setActiveModal] = useState(null);

    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [sortType, setSortType] = useState('최신순'); // '최신순' (latest) / '오래된순' (oldest)

    // AI 그룹핑된 프로젝트 내 북마크 목록 조회 및 자동 추천 연동
    const fetchProjectBookmarks = async () => {
        if (!purposeGroupId) return;

        try {
            setIsLoading(true);
            const token = localStorage.getItem('accessToken');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const sortParam = sortType === '최신순' ? 'latest' : 'oldest';

            // 1. 먼저 목적 그룹 내 북마크 목록 조회
            let response = await fetch(`/api/purpose-groups/${purposeGroupId}/bookmarks?sort=${sortParam}`, {
                method: 'GET',
                headers
            });

            if (!response.ok) throw new Error('목적 그룹 내 북마크를 불러오지 못했습니다.');

            let result = await response.json();
            let rawBookmarks = result.data?.bookmarks || result.data || [];

            // 2. 만약 연결된 링크가 하나도 없다면, AI 자동 추천 API를 호출해서 매핑해 주기!
            if (rawBookmarks.length === 0 && projectName) {
                try {
                    const recommendRes = await fetch('/api/ai/recommend', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            purposeTitle: projectName,
                            categoryIds: projectData?.categories ? projectData.categories.map(c => c.categoryId || c.id) : []
                        })
                    });

                    if (recommendRes.ok) {
                        const recommendData = await recommendRes.json();
                        const matchedIds = recommendData.data?.matchedBookmarkIds || recommendData.matchedBookmarkIds || [];

                        if (matchedIds.length > 0) {
                            await fetch(`/api/purpose-groups/${purposeGroupId}/bookmarks`, {
                                method: 'POST',
                                headers,
                                body: JSON.stringify({ bookmarkIds: matchedIds })
                            });

                            const retryResponse = await fetch(`/api/purpose-groups/${purposeGroupId}/bookmarks?sort=${sortParam}`, {
                                method: 'GET',
                                headers
                            });
                            if (retryResponse.ok) {
                                const retryResult = await retryResponse.json();
                                rawBookmarks = retryResult.data?.bookmarks || retryResult.data || [];
                            }
                        }
                    }
                } catch (aiError) {
                    console.error('AI 자동 그룹핑 추천 연동 중 에러 발생:', aiError);
                }
            }

            // 화면 표시 포맷에 맞게 매핑
            const formattedItems = rawBookmarks.map((b) => ({
                id: b.bookmarkId,
                title: b.title || '제목 없음',
                thumb: b.thumbnailUrl || '',
                domain: b.domain,
                createdDate: b.createdDate
            }));

            setItems(formattedItems);
        } catch (error) {
            console.error('목적 그룹 북마크 조회 에러:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjectBookmarks();

        // 💡 새 링크가 저장되었을 때 이벤트를 감지하여 자동으로 목록 갱신
        const handleBookmarkSaved = () => {
            fetchProjectBookmarks();
        };

        window.addEventListener('bookmarkSaved', handleBookmarkSaved);
        return () => {
            window.removeEventListener('bookmarkSaved', handleBookmarkSaved);
        };
    }, [purposeGroupId, sortType]);

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

    // 목적 그룹 내 북마크 삭제 연동 (DELETE /api/purpose-groups/{purposeGroupId}/bookmarks)
    const handleDeleteItems = async () => {
        if (selectedIds.length === 0) return;

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/purpose-groups/${purposeGroupId}/bookmarks`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ bookmarkIds: selectedIds })
            });

            if (!response.ok) throw new Error('북마크 삭제에 실패했습니다.');

            setItems(items.filter((item) => !selectedIds.includes(item.id)));
            setSelectedIds([]);
            setIsSelectMode(false);
            setActiveModal(null);
            fetchProjectBookmarks();
        } catch (error) {
            console.error('북마크 삭제 에러:', error);
            alert(error.message);
        }
    };

    const categories = [
        { id: 0, name: '미분류' },
        { id: 1, name: '참조 카테고리 1' },
        { id: 2, name: '참조 카테고리 2' },
    ];
    const [targetCategory, setTargetCategory] = useState(categories[0]);

    // 목적 그룹 간 북마크 이동 연동 (PUT /api/purpose-groups/{purposeGroupId}/bookmarks/move)
    const handleMoveItems = async () => {
        if (selectedIds.length === 0) return;

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/purpose-groups/${purposeGroupId}/bookmarks/move`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    targetPurposeGroupId: targetCategory.id,
                    bookmarkIds: selectedIds
                })
            });

            if (!response.ok) throw new Error('북마크 이동에 실패했습니다.');

            alert(`선택한 항목이 이동되었습니다.`);
            setSelectedIds([]);
            setIsSelectMode(false);
            setActiveModal(null);
            fetchProjectBookmarks();
        } catch (error) {
            console.error('북마크 이동 에러:', error);
            alert(error.message);
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
        <div className="project-detail-wrap" onClick={() => setSortDropdownOpen(false)}>
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

            <main className="detail-main">

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