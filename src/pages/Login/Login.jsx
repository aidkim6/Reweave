import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.scss';

import logoImg from '../../assets/logo.svg';
import xCircleIcon from '../../assets/x-circle.svg'; 
import alertIcon from '../../assets/alert-circle.svg'; 

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  const handleClear = (fieldName) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          clientType: "WEB",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || '아이디 또는 비밀번호를 확인해주세요.');
        return;
      }


      const tokenData = data.data || data;
      if (tokenData.accessToken) {
        localStorage.setItem('accessToken', tokenData.accessToken);
        if (tokenData.refreshToken) {
          localStorage.setItem('refreshToken', tokenData.refreshToken);
        }
      }

      navigate('/home');
    } catch (error) {
      console.error('로그인 통신 에러:', error);
      setErrorMessage('서버와 통신 중 문제가 발생했습니다.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <img src={logoImg} alt="Reweave Logo" className="logo-img" />
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="input-box">
          <div className="input-row">
            <input
              type="email"
              id="email"
              name="email"
              placeholder="이메일"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {formData.email && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => handleClear('email')}
              >
                <img src={xCircleIcon} alt="삭제" />
              </button>
            )}
          </div>

          <div className="input-divider" />
    
          <div className="input-row">
            <input
              type="password" 
              id="password"
              name="password"
              placeholder="비밀번호"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {formData.password && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => handleClear('password')}
              >
                <img src={xCircleIcon} alt="삭제" />
              </button>
            )}
          </div>
        </div>

        <button type="submit" className="login-btn">
          로그인하기
        </button>
      </form>

      <div className="signup-link-container">
        <button
          type="button"
          className="signup-btn"
          onClick={() => navigate('/signup')}
        >
          회원가입
        </button>
      </div>

      {errorMessage && (
        <div className="error-snackbar">
          <img src={alertIcon} alt="경고 아이콘" className="alert-icon" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Login;