import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './LinkDetail.scss';
import { api } from '../../features/client';

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

const TOAST_DURATION = 3000;

// 서버의 "2026-09-18T15:54:00" → "2026.09.18"
const formatDate = (iso) => (iso ? iso.slice(0, 10).replaceAll('-', '.') : '');

// 서버 status → 화면 표시
const STATUS_LABEL = { NOT_STARTED: '시작 전', IN_PROGRESS: '진행 중', COMPLETED: '완료' };

const LinkDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [link, setLink] = useState(null);
  const [categories, setCategories] = useState([{ id: 0, name: '미분류' }]);
  const [projects, setProjects] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null); // 'move' | 'delete' | null
  const [targetCategoryId, setTargetCategoryId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const menuRef = useRef(null);

  // 링크 상세 불러오기
  const fetchLink = async () => {
    try {
      const res = await api.get(`/api/bookmarks/${id}`);
      const data = res.data.data ?? res.data;
      setLink({
        ...data,
        createdDate: formatDate(data.createdDate),
      });
    } catch (e) {
      // 404 BOOKMARK_NOT_FOUND: 없거나 내 북마크가 아님
      console.log('링크 상세 실패', e.response?.status, e.response?.data);
    }
  };

  useEffect(() => {
    fetchLink();
  }, [id]);

  // 이동 모달용 카테고리 목록
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

  // 이 링크가 담겨 있는 프로젝트(목적 그룹)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/api/purpose-groups', { params: { bookmarkId: id } });
        const data = res.data.data ?? res.data;
        setProjects(
          (Array.isArray(data) ? data : []).map((p) => ({
            id: p.purposeGroupId,
            status: STATUS_LABEL[p.status] ?? p.status,
            done: p.status === 'COMPLETED',
            title: p.purposeName,
            tags: (p.categories ?? []).map((c) => `#${c.categoryName}`).join(' '),
          }))
        );
      } catch (e) {
        console.log('프로젝트 목록 실패', e.response?.status, e.response?.data);
      }
    };
    fetchProjects();
  }, [id]);

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

  // 원문 링크를 열 때 열람 기록 (조회수 +1)
  const handleOpenOriginal = () => {
    api.post(`/api/bookmarks/${id}/view`).catch((e) => {
      console.log('열람 기록 실패', e.response?.status, e.response?.data);
    });
  };

  const openMoveModal = () => {
    setMenuOpen(false);
    setTargetCategoryId(link?.categoryId ?? 0);
    setModal('move');
  };

  const openDeleteModal = () => {
    setMenuOpen(false);
    setModal('delete');
  };

  const handleMove = async () => {
    const target = categories.find((c) => c.id === targetCategoryId);
    if (!target) return;
    try {
      // 미분류(0)는 null로 보내요. 400이 나면 백엔드 담당자에게 확인이 필요해요.
      await api.patch(`/api/bookmarks/${id}`, {
        categoryId: target.id === 0 ? null : target.id,
      });
      await fetchLink();
      setModal(null);
      showToast(`링크를 ${target.name}으로 이동했습니다.`, {
        label: '보기',
        onClick: () =>
          navigate(`/storage/detail/${target.id}`, { state: { categoryName: target.name } }),
      });
    } catch (e) {
      console.log('링크 이동 실패', e.response?.status, e.response?.data);
      setModal(null);
      showToast('링크를 이동하지 못했습니다');
    }
  };

  // 이동 창에서 Enter 를 누르면 이동하기
  useEffect(() => {
    if (modal !== 'move') return undefined;
    const handleEnter = (e) => {
      if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') handleMove();
    };
    document.addEventListener('keydown', handleEnter);
    return () => document.removeEventListener('keydown', handleEnter);
  });

  // 삭제 (휴지통으로 이동)
  const handleDelete = async () => {
    try {
      await api.delete(`/api/bookmarks/${id}`);
      setModal(null);
      navigate(-1);
    } catch (e) {
      console.log('링크 삭제 실패', e.response?.status, e.response?.data);
      setModal(null);
      showToast('링크를 삭제하지 못했습니다');
    }
  };

  // 데이터가 오기 전에는 빈 화면
  if (!link) return <div className="link-detail" />;

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
            <a href={link.url} target="_blank" rel="noreferrer" onClick={handleOpenOriginal}>
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
          {projects.map((project) => (
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
              {categories.map((category) => (
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