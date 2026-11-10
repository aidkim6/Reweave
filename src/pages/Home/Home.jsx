import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProjectDetail from '../Project/ProjectDetail';
import './Home.scss';

import logoIcon from '../../assets/logo.svg';
import arrowRightIcon from '../../assets/arrowbotton.svg';
import defaultIcon from '@/assets/icon.svg';
import leftArrowIcon from '../../assets/home/left.svg';
import rightArrowIcon from '../../assets/home/right.svg';

const Home = () => {
  const sliderRef = useRef(null);
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('사용자');
  const [recentLinks, setRecentLinks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [recallCards, setRecallCards] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  const openLink = (id) => navigate(`/link/${id}`);

  const openProjectDetail = (project) => {
    setSelectedProject(project);
  };

  const fetchHomeData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };


    try {
      const userRes = await axios.get('/api/users/me', { headers });
      if (userRes.data && userRes.data.data && userRes.data.data.nickname) {
        setNickname(userRes.data.data.nickname);
      }
    } catch (error) {
      console.error('유저 정보를 불러오지 못했습니다.', error);
    }


    try {
      const recallRes = await axios.get('/api/ai/recalls', { headers });
      const rawRecalls = recallRes.data?.data || recallRes.data || [];
      
      const formattedRecalls = rawRecalls.map((card) => ({
        purposeGroupId: card.purposeGroupId || card.projectId,
        purposeName: card.purposeName || card.projectTitle,
        bookmarkId: card.bookmarkId,
        title: card.title,
        thumbnailUrl: card.thumbnailUrl || (card.thumbnails && card.thumbnails[0]) || '',
        url: card.url,
        recallHeadline: card.recallHeadline || card.recommendReason || '저장된 링크를 다시 확인해보세요'
      }));

      setRecallCards(formattedRecalls);
    } catch (error) {
      console.error('AI 리콜 카드를 불러오지 못했습니다.', error);
    }


    try {
      const bookmarkRes = await axios.get('/api/bookmarks?size=6', { headers });
      if (bookmarkRes.data && bookmarkRes.data.data && bookmarkRes.data.data.bookmarks) {
        setRecentLinks(bookmarkRes.data.data.bookmarks);
      }
    } catch (error) {
      console.error('최근 저장한 링크를 불러오지 못했습니다.', error);
    }


    try {
      const projectRes = await axios.get('/api/purpose-groups?status=IN_PROGRESS', { headers });
      const rawProjects = projectRes.data?.data || projectRes.data || [];

      const formattedProjects = rawProjects.map((item) => {
        const tags = item.categories
          ? item.categories.map((c) => `#${c.categoryName || c.name}`)
          : [];
        return {
          id: item.purposeGroupId || item.id,
          title: item.purposeName || item.title,
          tags: tags.length > 0 ? tags : ['#일반'],
          status: item.status,
          thumbnails: item.thumbnails || [],
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

  const handleScroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = 300;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (selectedProject) {
    return (
      <ProjectDetail
        projectData={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    );
  }

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


          <div className={`slider-wrapper ${recallCards.length >= 3 ? 'has-arrows' : ''}`}>
            {recallCards.length >= 3 && (
              <button
                className="slider-arrow left"
                onClick={() => handleScroll('left')}
                type="button"
              >
                <img src={leftArrowIcon} alt="이전" />
              </button>
            )}

            <div className="card-slider" ref={sliderRef}>
              {recallCards.length > 0 ? (
                recallCards.map((card) => (
                  <div
                    key={card.purposeGroupId}
                    className="today-card"
                    style={{
                      cursor: 'pointer',
                      backgroundImage: card.thumbnailUrl ? `url(${card.thumbnailUrl})` : 'none',
                    }}
                    onClick={() =>
                      openProjectDetail({ id: card.purposeGroupId, title: card.purposeName })
                    }
                  >
                    <div className="card-info">
                      <span className="card-tag">{card.purposeName}</span>
                      <h4>{card.recallHeadline}</h4>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#8E8E8E', fontSize: '14px', padding: '20px 0' }}>
                  오늘 추천된 리콜 카드가 없어요.
                </div>
              )}
            </div>

            {recallCards.length >= 3 && (
              <button
                className="slider-arrow right"
                onClick={() => handleScroll('right')}
                type="button"
              >
                <img src={rightArrowIcon} alt="다음" />
              </button>
            )}
          </div>
        </section>


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