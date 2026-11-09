// src/features/mypage/api.js
import { api } from "../client";

export const getMyInfo = async () => {
  const res = await api.get("/api/users/me");
  return res.data;
};