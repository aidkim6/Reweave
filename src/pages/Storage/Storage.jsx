import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import search from '../../assets/storage/search.svg';
import moreW from '../../assets/storage/moreW.svg';
import plus from '../../assets/storage/plus.svg';
import del from '../../assets/storage/delete.svg';
import edit from '../../assets/storage/edit.svg';
import moreH from '../../assets/storage/moreH.svg';
import order from '../../assets/storage/order.svg';
import defaultLogo from '../../assets/icon.svg';
import { api } from '../../features/client';
import './Storage.scss';


const MIN_SLOTS = 8;

function Storage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [tab, setTab] = useState('my');
    const [categories, setCategories] = useState([]);
    const [defaults, setDefaults] = useState(null);
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const [cardMenuId, setCardMenuId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        const close = () => {
            setHeaderMenuOpen(false);
            setCardMenuId(null);
        };
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    // 서버 응답을 화면에서 쓰는 이름으로 바꿔주는 함수
    const toView = (c) => ({
        id: c.categoryId,
        name: c.categoryName,
        description: c.description,
        count: c.bookmarkCount,
        thumbs: c.thumbnails ?? [],
    });

    const fetchCategories = async () => {
        try {
            const res = await api.get('/api/categories');
            const data = res.data.data ?? res.data;
            setCategories(data.categories.map(toView));
        } catch (e) {
            console.log('카테고리 목록 실패', e.response?.status, e.response?.data);
        }
    };
    const fetchDefaults = async () => {
        try {
            const res = await api.get('/api/categories/default');
            setDefaults(res.data.data ?? res.data);
        } catch (e) {
            console.log('기본 카테고리 실패', e.response?.status, e.response?.data);
        }
    };

    useEffect(() => {
        fetchDefaults();
    }, []);

    useEffect(() => {
        fetchCategories();
    }, []);

    const goAdd = () => {
        setHeaderMenuOpen(false);
        navigate('/storage/add');
    };

    const goSort = () => {
        setHeaderMenuOpen(false);
        navigate('/storage/sort', { state: { categories } });
    };

    const goSearch = () => {
        setHeaderMenuOpen(false);
        navigate('/storage/search');
    };

    // 👈 카테고리 상세 페이지로 이동하는 함수 (라우터 경로에 맞게 수정 가능)
    const goDetail = (cate) => {
        navigate(`/storage/detail/${cate.id}`, { state: { categoryName: cate.name } });
    };

    const handleEdit = async (id) => {
        const target = categories.find((c) => c.id === id);
        const name = window.prompt('카테고리 이름을 입력하세요', target.name);
        setCardMenuId(null);
        if (!name || !name.trim()) return;

        try {
            await api.patch(`/api/categories/${id}`, { categoryName: name.trim() });
            await fetchCategories();
        } catch (e) {
            // 409 DUPLICATE_CATEGORY_NAME: 이름 중복
            console.log('카테고리 수정 실패', e.response?.status, e.response?.data);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/api/categories/${deleteTarget.id}`);
            await fetchCategories(); // 삭제 후 목록 다시 불러오기
        } catch (e) {
            console.log('카테고리 삭제 실패', e.response?.status, e.response?.data);
        } finally {
            setDeleteTarget(null);
        }
    };
    const defaultCards = [
        { key: 'all', name: '전체', data: defaults?.all },
        { key: 'uncategorized', name: '미분류', data: defaults?.uncategorized },
        { key: 'trash', name: '최근 삭제된 링크', data: defaults?.trash },
    ];

    const goDefault = (key) => {
        const names = { all: '전체', uncategorized: '미분류', trash: '최근 삭제된 링크' };
        navigate(`/storage/default/${key}`, { state: { categoryName: names[key] } });
    };
    const emptyCount = Math.max(MIN_SLOTS - categories.length, 0);

    return (
        <div className="storage-wrap">
            <div className="storage-title">
                <div className="title-right">
                    <h1>보관함</h1>
                </div>
                <div className="title-left">
                    <img src={search} alt="검색" onClick={goSearch} style={{ cursor: 'pointer' }} />
                    <div className="header-more" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={moreW}
                            alt="더보기"
                            onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                        />
                        {headerMenuOpen && (
                            <ul className="pop-menu header-menu">
                                <li onClick={goAdd}><img src={plus} alt="" /> 카테고리 추가</li>
                                <li onClick={goSort}><img src={order} alt="" />순서 정렬</li>
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <div className="storage-sub">
                <h3
                    className={`my-category ${tab === 'my' ? 'active' : ''}`}
                    onClick={() => setTab('my')}
                >
                    내 카테고리
                </h3>
                <h3
                    className={`main-category ${tab === 'default' ? 'active' : ''}`}
                    onClick={() => setTab('default')}
                >
                    기본 카테고리
                </h3>
            </div>

            {tab === 'my' && (
                <div className="category-main">
                    {categories.map((cate) => (
                        <div
                            className="category-item"
                            key={cate.id}
                            onClick={() => goDetail(cate)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="thumb">
                                {cate.thumbs && cate.thumbs.length > 0 ? (
                                    <div className={`thumb-grid thumb-${Math.min(cate.thumbs.length, 4)}`}>
                                        {cate.thumbs.slice(0, 4).map((src, i) => (
                                            <img key={i} src={src} alt="" className='thumb-img' />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="default-thumb-box">
                                        <img src={defaultLogo} alt="기본 로고" className="default-logo-img" />
                                    </div>
                                )}
                            </div>

                            <div className="item-info">
                                <div className="item-text">
                                    <p className="item-name">{cate.name}</p>
                                    <span className="item-count">{cate.count}개</span>
                                </div>
                                <div className="item-more" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        className="more-btn"
                                        aria-label="메뉴"
                                        onClick={() =>
                                            setCardMenuId(cardMenuId === cate.id ? null : cate.id)
                                        }
                                    >
                                        <img src={moreH} alt="" />
                                    </button>
                                    {cardMenuId === cate.id && (
                                        <ul className="pop-menu card-menu">
                                            <li onClick={() => handleEdit(cate.id)}> <img src={edit} alt="" />수정하기</li>
                                            <li
                                                className="danger"
                                                onClick={() => {
                                                    setDeleteTarget(cate);
                                                    setCardMenuId(null);
                                                }}
                                            >
                                                <img src={del} alt="" />삭제하기
                                            </li>
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* 빈 카드 영역 */}
                    {Array.from({ length: emptyCount }).map((_, i) => (
                        <div className="category-item empty" key={`empty-${i}`}>
                            <div className="thumb">
                                <div className="default-thumb-box">
                                    <img src={defaultLogo} alt="기본 로고" className="default-logo-img" />
                                </div>
                            </div>
                            <div className="item-info">
                                <div className="item-text">
                                    <p className="item-name">카테고리 제목</p>
                                    <span className="item-count">00개</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'default' && (
                <div className="category-main">
                    {defaultCards.map((card) => {
                        const thumbs = card.data?.thumbnails ?? [];
                        return (
                            <div
                                className="category-item"
                                key={card.key}
                                onClick={() => goDefault(card.key)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="thumb">
                                    {thumbs.length > 0 ? (
                                        <div className={`thumb-grid thumb-${Math.min(thumbs.length, 4)}`}>
                                            {thumbs.slice(0, 4).map((src, i) => (
                                                <img key={i} src={src} alt="" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="default-thumb-box">
                                            <img src={defaultLogo} alt="기본 로고" className="default-logo-img" />
                                        </div>
                                    )}
                                </div>
                                <div className="item-info">
                                    <div className="item-text">
                                        <p className="item-name">{card.name}</p>
                                        <span className="item-count">{card.data?.count ?? 0}개</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {deleteTarget && (
                <div className="modal-dim" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <p>
                            정말로 “<em>{deleteTarget.name}</em>”을
                            <br />
                            삭제하시겠습니까?
                        </p>
                        <div className="modal-btns">
                            <button type="button" className="btn-cancel" onClick={() => setDeleteTarget(null)}>
                                취소
                            </button>
                            <button type="button" className="btn-delete" onClick={handleDelete}>
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Storage;