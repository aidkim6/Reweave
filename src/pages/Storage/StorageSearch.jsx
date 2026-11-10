import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import backIcon from '../../assets/back-arrow.svg';
import searchIcon from '../../assets/storage/search.svg';
import logo from '@/assets/icon.svg';
import './StorageSearch.scss';
import { api } from '../../features/client';
function StorageSearch() {
    const navigate = useNavigate();
    const location = useLocation();
    const scopeCategoryId = location.state?.categoryId ?? null;      // 없으면 전체 검색
    const scopeCategoryName = location.state?.categoryName ?? '';
    const [results, setResults] = useState([]);

    const [keyword, setKeyword] = useState('');           // 현재 입력 중인 검색어
    const [submittedKeyword, setSubmittedKeyword] = useState(''); // 엔터를 치거나 검색 버튼을 눌러 확정된 검색어

    // 최근 검색어 (localStorage 연동하여 실제 저장 및 유지)
    const [recentSearches, setRecentSearches] = useState(() => {
        const saved = localStorage.getItem('recent_searches');
        return saved ? JSON.parse(saved) : [];
    });

    // 최근 검색어 변경될 때마다 localStorage에 저장
    useEffect(() => {
        localStorage.setItem('recent_searches', JSON.stringify(recentSearches));
    }, [recentSearches]);
    const searchBookmarks = async (text) => {
        try {
            const params = { keyword: text, page: 0, size: 20 };
            if (scopeCategoryId) params.categoryId = scopeCategoryId;   // 상세에서 왔을 때만

            const res = await api.get('/api/bookmarks/search', { params });
            const data = res.data.data ?? res.data;
            setResults(data.bookmarks ?? []);
        } catch (e) {
            console.log('북마크 검색 실패', e.response?.status, e.response?.data);
            setResults([]);
        }
    };
    // 검색어 제출 처리 (엔터 또는 검색 아이콘 클릭)
    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        const trimmed = keyword.trim();
        if (!trimmed) return;

        setSubmittedKeyword(trimmed);
        searchBookmarks(trimmed);   // ← 추가

        setRecentSearches((prev) => {
            const filtered = prev.filter((item) => item !== trimmed);
            return [trimmed, ...filtered].slice(0, 10);
        });
    };

    const handleSelectKeyword = (text) => {
        setKeyword(text);
        setSubmittedKeyword(text);
        searchBookmarks(text);      // ← 추가
    };

    // 모두 지우기
    const handleClearAll = () => {
        setRecentSearches([]);
    };


    return (
        <div className="storage-search-wrap">
            <header className="search-header">
                <button className="back-btn" onClick={() => navigate(-1)} type="button">
                    <img src={backIcon} alt="뒤로가기" />
                </button>
                <form className="search-input-wrapper" onSubmit={handleSearchSubmit}>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="제목이나 키워드를 입력해주세요"
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value);
                            // 입력창을 비우면 검색 결과도 초기화
                            if (e.target.value === '') {
                                setSubmittedKeyword('');
                            }
                        }}
                    />
                    <button type="submit" className="search-submit-btn">
                        <img src={searchIcon} alt="검색" />
                    </button>
                </form>
            </header>

            <main className="search-main">
                {submittedKeyword === '' ? (
                    recentSearches.length > 0 && (
                        <section className="recent-section">
                            <div className="recent-header">
                                <h2>최근 검색어</h2>
                                <button type="button" className="clear-all-btn" onClick={handleClearAll}>
                                    모두 지우기
                                </button>
                            </div>
                            <div className="keyword-chips">
                                {recentSearches.map((item, index) => (
                                    <div className="chip" key={index} onClick={() => handleSelectKeyword(item)}>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )
                ) : (
                    <section className="result-section">
                        {results.length > 0 && (
                            <div className="result-grid">
                                {results.map((item) => (
                                    <div
                                        className="result-card"
                                        key={item.bookmarkId}
                                        onClick={() => navigate(`/link/${item.bookmarkId}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="result-thumb">
                                            {item.thumbnailUrl ? (
                                                <img src={item.thumbnailUrl} alt="" />
                                            ) : (
                                                <div className="default-thumb-box">
                                                    <img src={logo} alt="기본 로고" className="default-logo-img" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="result-name">{item.title}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}

export default StorageSearch;