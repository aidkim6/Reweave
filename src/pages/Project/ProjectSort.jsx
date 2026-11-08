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
          { id: 1, title: '프로젝트 제목' },
          { id: 2, title: '엄마랑 일본여행' },
          { id: 3, title: '프로젝트 제목' },
          { id: 4, title: '프로젝트 제목' },
        ]
  );

  const [showExitModal, setShowExitModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

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

    activeIndexRef.current = index;
    startYRef.current = e.clientY;

    setDraggedIndex(index);
    setDragOffsetY(0);

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
  };

  const handleWindowPointerMove = (e) => {
    if (activeIndexRef.current === null) return;

    const currentY = e.clientY;
    const offsetY = currentY - startYRef.current;
    setDragOffsetY(offsetY);

    const ITEM_HEIGHT = 60; 
    const indexOffset = Math.round(offsetY / ITEM_HEIGHT);
    const targetIndex = activeIndexRef.current + indexOffset;

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
          <h1>순서 정렬하기</h1>
        </div>
        <button className="submit-btn active" onClick={handleSave} type="button">
          완료
        </button>
      </header>

      <main className="form-content">
        <ul className="sort-list" ref={listRef}>
          {items.map((item, index) => {
            const isDragging = draggedIndex === index;
            return (
              <li
                key={item.id}
                className={`sort-item ${isDragging ? 'dragging' : ''}`}
                style={
                  isDragging
                    ? {
                        transform: `translateY(${dragOffsetY}px)`,
                        zIndex: 10,
                      }
                    : { transform: 'none', transition: 'transform 0.15s ease' }
                }
              >
                <span className="item-title">{item.title}</span>
                <button
                  type="button"
                  className="drag-handle-btn"
                  onPointerDown={(e) => handlePointerDown(e, index)}
                >
                  <img src={menuIcon} alt="순서 변경" />
                </button>
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
              <button type="button" className="exit-btn" onClick={onClose}>
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