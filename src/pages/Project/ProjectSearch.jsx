import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import backIcon from '../../assets/back-arrow.svg';
import searchIcon from '../../assets/storage/search.svg';
import logo from '../../assets/icon.svg';
import ProjectDetail from './ProjectDetail'; // 👈 프로젝트 상세 컴포넌트 임포트
import './ProjectSearch.scss';

function ProjectSearch() {
    const navigate = useNavigate();

    const [keyword, setKeyword] = useState('');           
    const [submittedKeyword, setSubmittedKeyword] = useState(''); 
    const [projectList, setProjectList] = useState([]);   
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null); // 👈 선택된 프로젝트 상세 상태 추가

    const [recentSearches, setRecentSearches] = useState(() => {
        try {
            const saved = localStorage.getItem('project_recent_searches');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('project_recent_searches', JSON.stringify(recentSearches));
        } catch (e) {
            console.error(e);
        }
    }, [recentSearches]);

    useEffect(() => {
        const fetchAllProjects = async () => {
            try {
                setIsLoading(true);
                const token = localStorage.getItem('accessToken');
                const response = await fetch('/api/purpose-groups', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });

                if (!response.ok) return;

                const result = await response.json();
                const rawData = result.data || [];

                const formatted = rawData.map((item) => ({
                    id: item.purposeGroupId || item.id,
                    title: item.purposeName || item.title,
                    thumbnails: item.thumbnails || [],
                    tags: item.categories ? item.categories.map((c) => `#${c.categoryName || c.name}`) : [],
                    status: item.status
                }));

                setProjectList(formatted);
            } catch (error) {
                console.error('프로젝트 목록 조회 에러:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllProjects();
    }, []);

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        const trimmed = keyword.trim();
        if (!trimmed) return;

        setSubmittedKeyword(trimmed);

        setRecentSearches((prev) => {
            const filtered = prev.filter((item) => item !== trimmed);
            return [trimmed, ...filtered].slice(0, 10);
        });
    };

    const handleSelectKeyword = (text) => {
        setKeyword(text);
        setSubmittedKeyword(text);
    };

    const handleClearAll = () => {
        setRecentSearches([]);
    };

    const filteredResults = projectList.filter((project) => {
        const matchTitle = project.title.toLowerCase().includes(submittedKeyword.toLowerCase());
        const matchTag = project.tags.some((tag) => tag.toLowerCase().includes(submittedKeyword.toLowerCase()));
        return matchTitle || matchTag;
    });

    // 만약 프로젝트가 선택되었다면 검색 화면 대신 ProjectDetail 상세 창을 띄움
    if (selectedProject) {
        return (
            <ProjectDetail 
                projectData={selectedProject} 
                onClose={() => setSelectedProject(null)} 
            />
        );
    }

    return (
        <div className="project-search-wrap" style={{ minHeight: '100vh', backgroundColor: '#1A1C1B', color: '#fff' }}>
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
                    <section className="recent-section">
                        {recentSearches.length > 0 && (
                            <>
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
                            </>
                        )}
                    </section>
                ) : (
                    <section className="result-section">
                        {isLoading ? (
                            <div style={{ color: '#929292', textAlign: 'center', padding: '40px 0' }}>
                                검색 중...
                            </div>
                        ) : filteredResults.length > 0 ? (
                            <div className="result-grid">
                                {filteredResults.map((project) => (
                                    <div 
                                        className="result-card" 
                                        key={project.id}
                                        onClick={() => setSelectedProject(project)} // 👈 클릭 시 상세 상태 활성화
                                    >
                                        <div className="result-thumb thumb">
                                            {project.thumbnails && project.thumbnails.length > 0 ? (
                                                <div className={`thumb-grid thumb-${Math.min(project.thumbnails.length, 4)}`}>
                                                    {project.thumbnails.slice(0, 4).map((src, i) => (
                                                        <img key={i} src={src} alt="" className="thumb-img" />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="default-thumb-box">
                                                    <img src={logo} alt="기본 로고" className="default-logo-img" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="result-name">{project.title}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ color: '#929292', textAlign: 'center', padding: '40px 0' }}>
                                검색 결과가 없습니다.
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}

export default ProjectSearch;