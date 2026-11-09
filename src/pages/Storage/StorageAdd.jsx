import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './StorageAdd.scss';
import clear from '../../assets/storage/clear-btn.svg';
import backIcon from '../../assets/back-arrow.svg';

const ProjectSort = ({ title = "새 카테고리 만들기", onSave }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const isFromModal = location.state?.fromModal;
    const prevModalData = location.state?.modalData || {};
    
    const [categoryName, setCategoryName] = useState('');
    const [categoryDesc, setCategoryDesc] = useState('');
    const [showExitModal, setShowExitModal] = useState(false);

    const handleBackClick = () => {
        if (categoryName.trim() || categoryDesc.trim()) {
            setShowExitModal(true);
        } else {
            handleReturnToModal();
        }
    };

    const handleReturnToModal = (newCatId = null) => {
        if (isFromModal) {
            if (newCatId) {
                sessionStorage.setItem('newCategoryId', newCatId);
            }
            sessionStorage.setItem('reopenSaveModal', 'true');
            sessionStorage.setItem('tempSaveUrl', prevModalData.url || '');
            sessionStorage.setItem('tempSaveMemo', prevModalData.memo || '');
        }
        navigate(-1);
    };

    const handleSave = async () => {
        if (!categoryName.trim()) return;

        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post(
                '/api/categories',
                {
                    categoryName: categoryName.trim(),
                    description: categoryDesc.trim() || null,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const createdCategory = response.data?.data;
            if (onSave) {
                onSave(createdCategory);
            }

            handleReturnToModal(createdCategory?.categoryId);
        } catch (error) {
            console.error('카테고리 생성 실패:', error);
            alert(error.response?.data?.message || '카테고리 생성에 실패했어요.');
        }
    };

    const handleClearName = () => setCategoryName('');
    const handleClearDesc = () => setCategoryDesc('');

    const isFormValid = categoryName.trim().length > 0;

    return (
        <div className="storage-add-container">
            <header className="add-header">
                <div className="add-header-left">
                    <button className="add-back-btn" onClick={handleBackClick} type="button">
                        <img src={backIcon} alt="뒤로가기" />
                    </button>
                    <h1>{title}</h1>
                </div>
                <button 
                    className={`add-submit-btn ${isFormValid ? 'active' : ''}`} 
                    onClick={handleSave} 
                    type="button"
                    disabled={!isFormValid}
                >
                    완료
                </button>
            </header>

            <main className="storage-add">
                <div className="input-group">
                    <label className="input-label">카테고리 제목</label>
                    <div className="input-wrapper">
                        <input 
                            type="text" 
                            className="text-input"
                            placeholder="카테고리 제목 추가"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                        />
                        {categoryName && (
                            <button type="button" className="clear-btn" onClick={handleClearName}>
                                <img src={clear} alt="" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="input-group">
                    <label className="input-label">카테고리 설명</label>
                    <div className="input-wrapper">
                        <input 
                            type="text" 
                            className="text-input"
                            placeholder="카테고리 설명 추가"
                            value={categoryDesc}
                            onChange={(e) => setCategoryDesc(e.target.value)}
                        />
                        {categoryDesc && (
                            <button type="button" className="clear-btn" onClick={handleClearDesc}>
                                <img src={clear} alt="" />
                            </button>
                        )}
                    </div>
                </div>
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
                                onClick={() => handleReturnToModal()}
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