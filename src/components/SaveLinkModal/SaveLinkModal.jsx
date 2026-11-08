import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SaveLinkModal.scss';
import plusIcon from '../../assets/plus.svg';
import closeIcon from '../../assets/home/x.svg';

const SaveLinkModal = ({ isOpen, onClose, onSaveSuccess }) => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [memo, setMemo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCategories = async (selectId = null) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && response.data.data && response.data.data.categories) {
        setCategories(response.data.data.categories);
        if (selectId !== null) {
          setSelectedCategoryId(selectId);
        }
      }
    } catch (error) {
      console.error('카테고리를 불러오지 못했습니다.', error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const savedNewCatId = sessionStorage.getItem('newCategoryId');
    const tempUrl = sessionStorage.getItem('tempSaveUrl');
    const tempMemo = sessionStorage.getItem('tempSaveMemo');

    if (savedNewCatId) {
      fetchCategories(Number(savedNewCatId));
      sessionStorage.removeItem('newCategoryId');
    } else {
      fetchCategories();
      setSelectedCategoryId(null);
    }

    if (tempUrl) {
      setUrl(tempUrl);
      sessionStorage.removeItem('tempSaveUrl');
    } else {
      setUrl('');
    }

    if (tempMemo) {
      setMemo(tempMemo);
      sessionStorage.removeItem('tempSaveMemo');
    } else {
      setMemo('');
    }

    setErrorMsg('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg('링크 주소를 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setErrorMsg('로그인이 필요합니다.');
        return;
      }

      await axios.post(
        '/api/bookmarks',
        {
          url: url.trim(),
          memo: memo.trim() || null,
          categoryId: selectedCategoryId,
          saveSource: 'URL_INPUT', 
          title: url.trim(), 
          content: '',       
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (error) {
      console.error('북마크 저장 실패:', error);
      setErrorMsg(error.response?.data?.message || '저장에 실패했어요. 다시 시도해주세요.');
    }
  };

  const handleAddCategoryClick = () => {
    navigate('/storage/add', { 
      state: { 
        fromModal: true, 
        modalData: { url, memo } 
      } 
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <img src={closeIcon} alt="닫기" />
        </button>

        <h2 className="modal-title">링크 저장</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              className="modal-input"
              placeholder="링크 주소를 입력해주세요"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setErrorMsg('');
              }}
            />
          </div>

          <div className="form-group">
            <div className="section-header">
              <label className="form-label">카테고리</label>
              <button 
                type="button" 
                className="category-add-btn"
                onClick={handleAddCategoryClick}
              >
                <img src={plusIcon} alt="카테고리 추가" />
              </button>
            </div>

            <div className="category-list">
              <button
                type="button"
                className={`category-chip ${
                  selectedCategoryId === null ? 'active' : ''
                }`}
                onClick={() => setSelectedCategoryId(null)}
              >
                미분류
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.categoryId}
                  type="button"
                  className={`category-chip ${
                    selectedCategoryId === cat.categoryId ? 'active' : ''
                  }`}
                  onClick={() => setSelectedCategoryId(cat.categoryId)}
                >
                  {cat.categoryName}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">메모</label>
            <textarea
              className="modal-textarea"
              placeholder="간단한 메모를 입력해주세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {errorMsg && <p style={{ color: '#ff4d4d', fontSize: '13px', marginBottom: '12px' }}>{errorMsg}</p>}

          <button type="submit" className="save-submit-btn">
            저장하기
          </button>
        </form>
      </div>
    </div>
  );
};

export default SaveLinkModal;