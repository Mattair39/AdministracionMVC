import axios from "axios";

const BASE_URL = 'http://localhost:8000/api/';
const LOGIN_URL = `${BASE_URL}token/`;
const REFRESH_URL = `${BASE_URL}token/refresh/`;
const CONTRACTS_URL = `${BASE_URL}contracts/`;
const LOGOUT_URL = `${BASE_URL}logout/`;
const AUTH_URL = `${BASE_URL}authenticated/`;
const REGISTER_URL = `${BASE_URL}register/`;

export const login = async (username, password) => {
  const response = await axios.post(
    LOGIN_URL,
    { username, password },
    { withCredentials: true }
  );
  return response.data.success;
};

export const refresh_token = async () => {
  try {
    await axios.post(REFRESH_URL, {}, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
};

const call_refresh = async (error, fn) => {
  if (error.response?.status === 401) {
    const ok = await refresh_token();
    if (ok) {
      const retry = await fn();
      return retry.data;
    }
  }
  return false;
};

export const get_contracts = async () => {
  try {
    const { data } = await axios.get(CONTRACTS_URL, { withCredentials: true });
    return data;
  } catch (e) {
    return call_refresh(e, () =>
      axios.get(CONTRACTS_URL, { withCredentials: true })
    );
  }
};

export const create_contract = async (contract) => {
  const { data } = await axios.post(CONTRACTS_URL, contract, {
    withCredentials: true,
  });
  return data;
};

export const update_contract = async (id, contract) => {
  const { data } = await axios.put(`${CONTRACTS_URL}${id}/`, contract, {
    withCredentials: true,
  });
  return data;
};

export const delete_contract = async (id) => {
  await axios.delete(`${CONTRACTS_URL}${id}/`, { withCredentials: true });
  return true;
};

export const logout = async () => {
  try {
    await axios.post(LOGOUT_URL, {}, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
};

export const is_authenticated = async () => {
  try {
    await axios.post(AUTH_URL, {}, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
};

export const register = async (username, email, password) => {
  const { data } = await axios.post(
    REGISTER_URL,
    { username, email, password },
    { withCredentials: true }
  );
  return data;
};
