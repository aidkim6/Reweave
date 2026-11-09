import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Home.scss';

import logoIcon from '../../assets/logo.svg';
import arrowRightIcon from '../../assets/arrowbotton.svg';
import defaultIcon from '../../assets/Icon.svg';
import leftArrowIcon from '../../assets/home/left.svg';
import rightArrowIcon from '../../assets/home/right.svg';

const Home = () => {
  const sliderRef = useRef(null);
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('사용자');
  const [recentLinks, setRecentLinks] = useState([]);
  const [projects, setProjects] = useState([]); // 👈 진행 중인 프로젝트 상태 추가

  const openLink = (id) => navigate(`/link/${id}`);
  const openProjectDetail = (project) => {
    // 프로젝트 클릭 시 상세 화면이나 프로젝트 관리 탭으로 이동할 수 있도록 연동
    navigate('/project', { state: { selectedProject: project } });
  };

  const fetchHomeData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    // 1. 유저 정보 조회
    try {
      const userRes = await axios.get('/api/users/me', { headers });
      if (userRes.data && userRes.data.data && userRes.data.data.nickname) {
        setNickname(userRes.data.data.nickname);
      }
    } catch (error) {
      console.error('유저 정보를 불러오지 못했습니다.', error);
    }

    // 2. 최근 저장한 링크 조회
    try {
      const bookmarkRes = await axios.get('/api/bookmarks?size=4', { headers });
      if (bookmarkRes.data && bookmarkRes.data.data && bookmarkRes.data.data.bookmarks) {
        setRecentLinks(bookmarkRes.data.data.bookmarks);
      }
    } catch (error) {
      console.error('최근 저장한 링크를 불러오지 못했습니다.', error);
    }

    // 3. 진행 중인 프로젝트(목적 그룹) 목록 조회 (GET /api/purpose-groups?status=IN_PROGRESS)
    try {
      const projectRes = await axios.get('/api/purpose-groups?status=IN_PROGRESS', { headers });
      const rawProjects = projectRes.data?.data || projectRes.data || [];

      const formattedProjects = rawProjects.map((item) => {
        const tags = item.categories ? item.categories.map((c) => `#${c.categoryName || c.name}`) : [];
        return {
          id: item.purposeGroupId || item.id,
          title: item.purposeName || item.title,
          tags: tags.length > 0 ? tags : ['#일반'],
          status: item.status,
          thumbnails: item.thumbnails || []
        };
      });

      setProjects(formattedProjects);
    } catch (error) {
      console.error('진행 중인 프로젝트를 불러오지 못했습니다.', error);
    }
  };

  useEffect(() => {
    fetchHomeData();

    const handleBookmarkSaved = () => {
      fetchHomeData();
    };

    window.addEventListener('bookmarkSaved', handleBookmarkSaved);
    return () => {
      window.removeEventListener('bookmarkSaved', handleBookmarkSaved);
    };
  }, []);

  useEffect(() => {
    if (window.innerWidth >= 768) return;
    const container = sliderRef.current;
    if (!container) return;
    const cards = container.querySelectorAll('.today-card');
    if (cards.length >= 2) {
      const secondCard = cards[1];
      container.scrollLeft =
        secondCard.offsetLeft - container.clientWidth / 2 + secondCard.clientWidth / 2;
    }
  }, []);

  const todayLinks = [
    {
      id: 1,
      tag: '일본여행 계획',
      title: '도쿄에서 만나는\n디자인 영감 스팟',
    },
    {
      id: 2,
      tag: 'UIUX 포트폴리오 만들기',
      title: '합격하는 UI·UX\n포트폴리오 프로젝트 구성법',
    },
    {
      id: 3,
      tag: '일본여행 계획',
      title: '일본 여행 전\n할 준비 체크',
    },
  ];

  const handleScroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = 280;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <img src={logoIcon} alt="Reweave" className="logo" />
      </header>

      <main className="home-content">
        <section className="section today-section">
          <div className="section-title">
            <h2>
              {nickname}님을 위한 <span className="highlight">오늘의 링크 다시보기</span>
            </h2>
          </div>

          <div className="slider-wrapper">
            <button
              className="slider-arrow left"
              onClick={() => handleScroll('left')}
              type="button"
            >
              <img src={leftArrowIcon} alt="이전" />
            </button>

            <div className="card-slider" ref={sliderRef}>
              {todayLinks.map((item) => (
                <div
                  key={item.id}
                  className="today-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openLink(item.id)}
                >
                  <div className="card-info">
                    <h4>{item.title}</h4>
                    <span className="card-tag">{item.tag}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="slider-arrow right"
              onClick={() => handleScroll('right')}
              type="button"
            >
              <img src={rightArrowIcon} alt="다음" />
            </button>
          </div>
        </section>

        {/* 🔗 진행 중인 프로젝트 동적 연동 영역 */}
        <section className="section project-section">
          <div className="section-header">
            <h2>진행 중인 프로젝트</h2>
          </div>
          <div className="project-grid">
            {projects.length > 0 ? (
              projects.map((item) => (
                <div 
                  key={item.id} 
                  className="project-card"
                  onClick={() => openProjectDetail(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="project-top">
                    <span className="project-title">{item.title}</span>
                    <img src={arrowRightIcon} alt="이동" className="arrow-icon" />
                  </div>
                  <div className="project-tags">
                    {item.tags.map((tag, idx) => (
                      <span key={idx} className="tag-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#8E8E8E', fontSize: '14px', gridColumn: 'span 2' }}>
                진행 중인 프로젝트가 없어요.
              </p>
            )}
          </div>
        </section>

        <section className="section recent-section">
          <div className="section-header">
            <h2>최근에 저장한 링크</h2>
          </div>
          <div className="recent-list">
            {recentLinks.length > 0 ? (
              recentLinks.map((item) => (
                <div
                  key={item.bookmarkId}
                  className="recent-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openLink(item.bookmarkId)}
                >
                  <div className="recent-thumb">
                    <img
                      src={item.thumbnailUrl || defaultIcon}
                      alt="미리보기"
                      className={item.thumbnailUrl ? 'thumb-img' : 'icon-img'}
                    />
                  </div>
                  <div className="recent-info">
                    <p className="recent-title">{item.title}</p>
                    <span className="recent-tag">#{item.categoryName || '미분류'}</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#8E8E8E', fontSize: '14px' }}>최근 저장한 링크가 없어요.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;