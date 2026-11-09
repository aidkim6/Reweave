import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup.scss';

import backIcon from '../../assets/back-arrow.svg'; 
import xCircleIcon from '../../assets/x.svg';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
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

    if (formData.password !== formData.passwordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nickname: formData.nickname,
        }),
      });

      const data = await response.json();

      if (!response.ok) {

        setErrorMessage(data.message || '회원가입에 실패했습니다.');
        return;
      }


      navigate('/login');
    } catch (error) {
      console.error('회원가입 통신 에러:', error);
      setErrorMessage('서버와 통신 중 문제가 발생했습니다.');
    }
  };

  const isPasswordMismatch =
    formData.passwordConfirm.length > 0 &&
    formData.password !== formData.passwordConfirm;

  return (
    <div className="signup-container">
      <header className="signup-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate(-1)}
        >
          <img src={backIcon} alt="뒤로가기" />
        </button>
        <h1 className="header-title">회원가입</h1>
      </header>

      <form className="signup-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="email">이메일</label>
          <div className="input-box">
            <input
              type="email"
              id="email"
              name="email"
              placeholder="이메일"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="password">비밀번호</label>
          <p className="field-guide">
            영문, 숫자를 포함한 8자 이상의 비밀번호를 입력해주세요
          </p>
          <div className="input-box">
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

        <div className="field-group">
          <label htmlFor="passwordConfirm">비밀번호 확인</label>
          <div className={`input-box ${isPasswordMismatch ? 'error' : ''}`}>
            <input
              type="password"
              id="passwordConfirm"
              name="passwordConfirm"
              placeholder="비밀번호 확인"
              value={formData.passwordConfirm}
              onChange={handleChange}
              required
            />
            {formData.passwordConfirm && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => handleClear('passwordConfirm')}
              >
                <img src={xCircleIcon} alt="삭제" />
              </button>
            )}
          </div>
          {isPasswordMismatch && (
            <p className="error-text">비밀번호가 일치하지 않습니다</p>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="nickname">닉네임</label>
          <div className="input-box">
            <input
              type="text"
              id="nickname"
              name="nickname"
              placeholder="닉네임을 입력해주세요"
              value={formData.nickname}
              onChange={handleChange}
              required
            />
            {formData.nickname && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => handleClear('nickname')}
              >
                <img src={xCircleIcon} alt="삭제" />
              </button>
            )}
          </div>
        </div>

        {errorMessage && <p className="error-text" style={{ marginBottom: '10px' }}>{errorMessage}</p>}

        <div className="bottom-area">
          <div className="login-link-container">
            <span>이미 아이디가 있으신가요? </span>
            <button
              type="button"
              className="login-link-btn"
              onClick={() => navigate('/login')}
            >
              로그인 하러가기
            </button>
          </div>

          <button
            type="submit"
            className="signup-btn"
            disabled={isPasswordMismatch}
          >
            회원가입하기
          </button>
        </div>
      </form>
    </div>
  );
};

export default Signup;