import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './LinkDetail.scss';

import backIcon from '../../assets/link-detail/back.svg';
import moreIcon from '../../assets/link-detail/more.svg';
import previewIcon from '../../assets/link-detail/preview.svg';
import linkIcon from '../../assets/link-detail/link.svg';
import calendarIcon from '../../assets/link-detail/calendar.svg';
import chevronRightIcon from '../../assets/link-detail/chevron-right.svg';
import menuShareIcon from '../../assets/link-detail/menu-share.svg';
import menuMoveIcon from '../../assets/link-detail/menu-move.svg';
import menuDeleteIcon from '../../assets/link-detail/menu-delete.svg';
import checkCircleIcon from '../../assets/link-detail/check-circle.svg';
import plusIcon from '../../assets/link-detail/plus.svg';
import closeIcon from '../../assets/link-detail/close.svg';
import toastCheckIcon from '../../assets/link-detail/toast-check.svg';

// TODO: 백엔드 연결 시 GET /api/bookmarks/{id} 응답으로 교체
// (bookmarkId, url, domain, title, thumbnailUrl, memo, summary, categoryId, categoryName, createdDate)
const SAMPLE_LINK = {
  title: '삐삐 | 하루 한 번, 가족에게 보내는 생존신고 서비스 Family Widget Service',
  url: 'https://www.behance.net/gallery/191508405/-Family-Widget-Service',
  domain: 'behance.net',
  thumbnailUrl: null,
  categoryName: '디자인',
  createdDate: '2026.09.18',
  summary:
    '가족과 자주 연락하지 못하는 문제를 해결하기 위해, 하루 한 번 위젯으로 자신의 상태와 일상을 간단히 공유하는 가족 소통 서비스 ‘삐삐’의 UX/UI 프로젝트다. 일상 속 문제 발견부터 서비스 콘셉트, 핵심 기능, UI 디자인까지 이어지는 포트폴리오 구성 방식을 참고할 수 있다.',
  memo: '피피티디자인, 인터뷰를 통한 인사이트 도출 방식\n캐릭터 디자인 참고하기',
};

// TODO: 백엔드 연결 시 GET /api/categories 응답으로 교체
const SAMPLE_CATEGORIES = [
  { id: 0, name: '미분류' },
  { id: 1, name: '디자인' },
  { id: 2, name: '취업' },
  { id: 3, name: '여행' },
  { id: 4, name: '쇼핑' },
  { id: 5, name: '맛집' },
];

// TODO: 백엔드 연결 시 실제 프로젝트 목록으로 교체
const SAMPLE_PROJECTS = [
  { id: 1, status: '진행 중', done: false, title: '성신멋사데모데이', tags: '#작업 #디자인' },
  { id: 2, status: '완료', done: true, title: 'UIUX 포트폴리오 만들기', tags: '#취업 #디자인' },
];

const TOAST_DURATION = 3000;

const LinkDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // 링크 번호 (백엔드 연결 시 사용)

  const [link, setLink] = useState(SAMPLE_LINK);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null); // 'move' | 'delete' | null
  const [targetCategoryId, setTargetCategoryId] = useState(null);
  const [toast, setToast] = useState(null); // { message, action? }
  const toastTimer = useRef(null);
  const menuRef = useRef(null);

  // 메뉴 바깥을 누르면 닫기
  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (message, action) => {
    clearTimeout(toastTimer.current);
    setToast({ message, action });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION);
  };

  const handleShare = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(link.url);
      showToast('저장된 링크를 복사했습니다');
    } catch {
      showToast('링크를 복사하지 못했습니다');
    }
  };

  const openMoveModal = () => {
    setMenuOpen(false);
    const current = SAMPLE_CATEGORIES.find((c) => c.name === link.categoryName);
    setTargetCategoryId(current ? current.id : 0);
    setModal('move');
  };

  const openDeleteModal = () => {
    setMenuOpen(false);
    setModal('delete');
  };

  const handleMove = () => {
    const target = SAMPLE_CATEGORIES.find((c) => c.id === targetCategoryId);
    if (!target) return;
    // TODO: PATCH /api/bookmarks/{id} { categoryId }
    setLink((prev) => ({ ...prev, categoryName: target.name }));
    setModal(null);
    showToast(`링크를 ${target.name}으로 이동했습니다.`, {
      label: '보기',
      onClick: () =>
        navigate(`/storage/detail/${target.id}`, { state: { categoryName: target.name } }),
    });
  };

  // 이동 창에서 Enter 를 누르면 이동하기 (웹 시안의 'enter' 안내). 버튼에 포커스가 있을 땐 그 버튼의 동작을 따라요.
  useEffect(() => {
    if (modal !== 'move') return undefined;
    const handleEnter = (e) => {
      if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') handleMove();
    };
    document.addEventListener('keydown', handleEnter);
    return () => document.removeEventListener('keydown', handleEnter);
  });

  const handleDelete = () => {
    // TODO: DELETE /api/bookmarks/{id}
    setModal(null);
    navigate(-1);
  };

  return (
    <div className="link-detail">
      <header className="link-detail-header">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로가기">
          <img src={backIcon} alt="" />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="더보기"
        >
          <img src={moreIcon} alt="" />
        </button>
      </header>

      {toast && (
        <div className="link-toast" role="status">
          <div className="link-toast-message">
            <img src={toastCheckIcon} alt="" />
            <span>{toast.message}</span>
          </div>
          {toast.action && (
            <button type="button" className="link-toast-action" onClick={toast.action.onClick}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}

      {menuOpen && (
        <div className="link-menu" ref={menuRef}>
          <button type="button" className="link-menu-item" onClick={handleShare}>
            <span className="link-menu-icon">
              <img src={menuShareIcon} alt="" className="share-icon" />
            </span>
            <span>링크공유</span>
          </button>
          <button type="button" className="link-menu-item" onClick={openMoveModal}>
            <span className="link-menu-icon">
              <img src={menuMoveIcon} alt="" />
            </span>
            <span>카테고리 이동</span>
          </button>
          <button type="button" className="link-menu-item danger" onClick={openDeleteModal}>
            <span className="link-menu-icon">
              <img src={menuDeleteIcon} alt="" />
            </span>
            <span>삭제하기</span>
          </button>
        </div>
      )}

      <div className="link-preview">
        {link.thumbnailUrl ? (
          <img src={link.thumbnailUrl} alt="" className="link-preview-thumb" />
        ) : (
          <span className="link-preview-placeholder">
            <img src={previewIcon} alt="" />
          </span>
        )}
      </div>

      <section className="link-info">
        <span className="link-category-chip">#{link.categoryName || '미분류'}</span>
        <h1 className="link-title">{link.title}</h1>
        <div className="link-meta">
          <span className="link-meta-item">
            <img src={linkIcon} alt="" />
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.domain}
            </a>
          </span>
          <span className="link-meta-item">
            <img src={calendarIcon} alt="" />
            <span>{link.createdDate}</span>
          </span>
        </div>
      </section>

      <section className="link-boxes">
        {link.summary && (
          <div className="link-box">
            <h2>Ai 요약 보기</h2>
            <p>{link.summary}</p>
          </div>
        )}
        {link.memo && (
          <div className="link-box">
            <h2>메모</h2>
            <p className="link-memo">{link.memo}</p>
          </div>
        )}
      </section>

      <section className="link-projects">
        <h2>저장된 프로젝트</h2>
        <ul>
          {SAMPLE_PROJECTS.map((project) => (
            <li key={project.id}>
              <button type="button" className="link-project-card">
                <span className="link-project-body">
                  <span className={`link-project-badge ${project.done ? 'done' : ''}`}>
                    {project.status}
                  </span>
                  <span className="link-project-title">{project.title}</span>
                  <span className="link-project-tags">{project.tags}</span>
                </span>
                <img src={chevronRightIcon} alt="" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {modal === 'move' && (
        <div className="link-overlay" onClick={() => setModal(null)}>
          <div className="link-sheet" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="icon-btn link-sheet-close"
              onClick={() => setModal(null)}
              aria-label="닫기"
            >
              <img src={closeIcon} alt="" />
            </button>
            <h2 className="link-sheet-title">링크 이동</h2>
            <div className="link-sheet-head">
              <span>카테고리</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => navigate('/storage/add')}
                aria-label="카테고리 추가"
              >
                <img src={plusIcon} alt="" />
              </button>
            </div>
            <ul className="link-sheet-list">
              {SAMPLE_CATEGORIES.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    className="link-sheet-row"
                    onClick={() => setTargetCategoryId(category.id)}
                  >
                    <span>{category.name}</span>
                    {targetCategoryId === category.id && <img src={checkCircleIcon} alt="선택됨" />}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="link-sheet-submit" onClick={handleMove}>
              이동하기
            </button>
            <span className="link-sheet-hint">enter</span>
          </div>
        </div>
      )}

      {modal === 'delete' && (
        <div className="link-overlay center" onClick={() => setModal(null)}>
          <div className="link-dialog" onClick={(e) => e.stopPropagation()}>
            <p>
              정말로 <strong>링크를</strong>
              <br />
              삭제하시겠습니까?
            </p>
            <div className="link-dialog-buttons">
              <button type="button" className="cancel" onClick={() => setModal(null)}>
                취소
              </button>
              <button type="button" className="confirm" onClick={handleDelete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkDetail;
