import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './ProjectSort.scss';

import backIcon from '../../assets/back-arrow.svg';
import menuIcon from '../../assets/project/menu.svg';

const ProjectSort = ({ projectList = [], onClose, onSave }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState(
    projectList.length > 0
      ? projectList
      : [
          { id: 1, title: '성신로데오 맛집' },
          { id: 2, title: '프론트엔드 공부' },
          { id: 3, title: '쇼핑 리스트' },
        ]
  );

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);

  const listRef = useRef(null);
  const startYRef = useRef(0);
  const activeIndexRef = useRef(null);
  const itemsRef = useRef(items);

  itemsRef.current = items;

  const handleBackClick = () => {
    setShowExitModal(true);
  };

  const handleSave = () => {
    if (onSave) onSave(items);
    if (onClose) onClose();
  };

  const handlePointerDown = (e, index) => {
    e.preventDefault();
    e.stopPropagation();

    const liElement = e.currentTarget.closest('li');
    if (!liElement) return;

    startYRef.current = e.clientY;
    activeIndexRef.current = index;

    setDraggedIndex(index);
    setDragOffsetY(0);

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
  };

  const handleWindowPointerMove = (e) => {
    if (activeIndexRef.current === null) return;

    const currentY = e.clientY;
    const deltaY = currentY - startYRef.current;
    setDragOffsetY(deltaY);

    const listNode = listRef.current;
    if (!listNode) return;

    const itemHeight = 60; // 대략적인 아이템 높이
    const targetIndex = Math.round(activeIndexRef.current + deltaY / itemHeight);
    const currentItems = itemsRef.current;

    if (
      targetIndex >= 0 &&
      targetIndex < currentItems.length &&
      targetIndex !== activeIndexRef.current
    ) {
      const updated = [...currentItems];
      const [movedItem] = updated.splice(activeIndexRef.current, 1);
      updated.splice(targetIndex, 0, movedItem);

      activeIndexRef.current = targetIndex;
      startYRef.current = currentY;
      setItems(updated);
      setDraggedIndex(targetIndex);
      setDragOffsetY(0);
    }
  };

  const handleWindowPointerUp = () => {
    activeIndexRef.current = null;
    setDraggedIndex(null);
    setDragOffsetY(0);

    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointercancel', handleWindowPointerUp);
  };

  return (
    <div className="project-sort-container">
      <header className="form-header">
        <div className="header-left">
          <button className="back-btn" onClick={handleBackClick} type="button">
            <img src={backIcon} alt="뒤로가기" />
          </button>
          <h1>프로젝트 순서 편집</h1>
        </div>
        <button className="save-btn" onClick={handleSave} type="button">
          저장
        </button>
      </header>

      <main className="form-content">
        <ul className="sort-list" ref={listRef}>
          {items.map((item, index) => {
            const isDragging = draggedIndex === index;
            const style = isDragging
              ? {
                  transform: `translateY(${dragOffsetY}px)`,
                  zIndex: 999,
                  position: 'relative',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                  backgroundColor: '#2b2d2b',
                }
              : {};

            return (
              <li
                key={item.id || index}
                className={`sort-item ${isDragging ? 'dragging' : ''}`}
                style={style}
              >
                <span className="item-title">{item.title || item.purposeName}</span>
                <div
                  className="drag-handle"
                  onPointerDown={(e) => handlePointerDown(e, index)}
                  style={{ touchAction: 'none', cursor: 'grab' }}
                >
                  <img src={menuIcon} alt="순서 변경" />
                </div>
              </li>
            );
          })}
        </ul>
      </main>

      {showExitModal && (
        <div className="exit-modal-overlay">
          <div className="exit-modal-card">
            <div className="modal-text-group">
              <p className="modal-description">
                <span className="highlight-text">완료 버튼</span>을 누르지 않으면
                <br />
                변경사항이 저장되지 않습니다
              </p>
            </div>
            <div className="modal-button-group">
              <button
                type="button"
                className="exit-btn"
                onClick={() => {
                  setShowExitModal(false);
                  if (onClose) onClose();
                }}
              >
                나가기
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowExitModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSort;