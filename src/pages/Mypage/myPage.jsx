import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './mypage.scss';
import arrow from '../../assets/mypage/arrow.svg';
import { api } from '../../features/client';

function MyPage() {
    const navigate = useNavigate();
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    const [me, setMe] = useState(null);

    useEffect(() => {
        api
            .get('/api/users/me')
            .then((res) => setMe(res.data.data ?? res.data))
            .catch((e) => {
                console.log('내 정보 실패', e.response?.status, e.response?.data);
            });
    }, []);

    const handleLogout = async () => {
        try {
            await api.post('/api/auth/logout', { clientType: 'WEB' });
        } catch (e) {
            console.log('로그아웃 실패', e.response?.status, e.response?.data);
        } finally {
            // 서버 응답과 상관없이 내 브라우저의 토큰은 지우고 로그인 화면으로 이동
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setIsLogoutOpen(false);
            navigate('/login');
        }
    };

    return (
        <div className="mypage-wrap">
            <div className="mypage-title">
                <h1>마이페이지</h1>
            </div>
            <h1 className="mypage-nickname">{me?.nickname ?? ''}</h1>

            <div className="info-card">
                <div className="info-row">
                    <span className="info-label">이메일</span>
                    <span className="info-value">{me?.email ?? ''}</span>
                </div>

                <div className="mypage-divider" />

                <div className="info-row">
                    <span className="info-label">로그아웃</span>
                    <button className="info-arrow" onClick={() => setIsLogoutOpen(true)}>
                        <img src={arrow} alt="로그아웃" />
                    </button>
                </div>
            </div>

            {isLogoutOpen && (
                <div className="mypage-modal-overlay" onClick={() => setIsLogoutOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <p className="modal-text">로그아웃 하시겠습니까?</p>
                        <div className="modal-buttons">
                            <button className="modal-cancel" onClick={() => setIsLogoutOpen(false)}>
                                취소
                            </button>
                            <button className="modal-confirm" onClick={handleLogout}>
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyPage;