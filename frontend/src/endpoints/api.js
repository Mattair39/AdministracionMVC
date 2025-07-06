import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/+$/, "") + "/api/"
  : "http://localhost:8000/api/";

const LOGIN_URL = `${BASE_URL}token/`;
const REFRESH_URL = `${BASE_URL}token/refresh/`;
const CONTRACTS_URL = `${BASE_URL}contracts/`;
const PROJECTS_URL = `${BASE_URL}projects/`;
const PACKAGES_URL = `${BASE_URL}packages/`;
const PACKAGE_WIZARD_URL = `${BASE_URL}packages/wizard/`;
const TICKETS_URL = `${BASE_URL}tickets/`;
const USERS_URL = `${BASE_URL}users/`;
const LOGOUT_URL = `${BASE_URL}logout/`;
const AUTH_URL = `${BASE_URL}authenticated/`;
const REGISTER_URL = `${BASE_URL}register/`;

const call_refresh = async (error, fn) => {
  if (error.response?.status === 401) {
    const ok = await refresh_token();
    if (ok) return (await fn()).data;
  }
  return false;
};

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

export const is_authenticated = async () => {
  try {
    await axios.post(AUTH_URL, {}, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
};

export const logout = async () => {
  try {
    await axios.post(LOGOUT_URL, {}, { withCredentials: true });
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

export const get_contract = async (id) => {
  try {
    const { data } = await axios.get(`${CONTRACTS_URL}${id}/`, { withCredentials: true });
    return data;
  } catch (e) {
    return call_refresh(e, () =>
      axios.get(`${CONTRACTS_URL}${id}/`, { withCredentials: true })
    );
  }
};

export const create_contract = async (contract) => {
  try {
    const { data } = await axios.post(CONTRACTS_URL, contract, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.post(CONTRACTS_URL, contract, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const update_contract = async (id, contract) => {
  try {
    const { data } = await axios.put(`${CONTRACTS_URL}${id}/`, contract, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.put(`${CONTRACTS_URL}${id}/`, contract, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const delete_contract = async (id) => {
  try {
    await axios.delete(`${CONTRACTS_URL}${id}/`, {
      withCredentials: true,
    });
    return true;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.delete(`${CONTRACTS_URL}${id}/`, { withCredentials: true })
    );
    return refreshed !== false;
  }
};

export const get_projects = async (contractId) => {
  try {
    const url = contractId ? `${PROJECTS_URL}?contract=${contractId}` : PROJECTS_URL;
    const { data } = await axios.get(url, { withCredentials: true });
    return data;
  } catch (e) {
    return call_refresh(e, () => {
      const url = contractId ? `${PROJECTS_URL}?contract=${contractId}` : PROJECTS_URL;
      return axios.get(url, { withCredentials: true });
    });
  }
};

export const get_project = async (id) => {
  try {
    const { data } = await axios.get(`${PROJECTS_URL}${id}/`, { withCredentials: true });
    return data;
  } catch (e) {
    return call_refresh(e, () =>
      axios.get(`${PROJECTS_URL}${id}/`, { withCredentials: true })
    );
  }
};

export const create_project = async (project) => {
  try {
    const { data } = await axios.post(PROJECTS_URL, project, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.post(PROJECTS_URL, project, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const update_project = async (id, project) => {
  try {
    const { data } = await axios.put(`${PROJECTS_URL}${id}/`, project, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.put(`${PROJECTS_URL}${id}/`, project, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const delete_project = async (id) => {
  try {
    await axios.delete(`${PROJECTS_URL}${id}/`, { withCredentials: true });
    return true;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.delete(`${PROJECTS_URL}${id}/`, { withCredentials: true })
    );
    return refreshed !== false;
  }
};

export const get_packages = async (contractId) => {
  try {
    const url = contractId ? `${PACKAGES_URL}?contract=${contractId}` : PACKAGES_URL;
    const { data } = await axios.get(url, { withCredentials: true });
    return data;
  } catch (e) {
    return call_refresh(e, () => {
      const url = contractId ? `${PACKAGES_URL}?contract=${contractId}` : PACKAGES_URL;
      return axios.get(url, { withCredentials: true });
    });
  }
};

export const get_package = async (id) => {
  try {
    const { data } = await axios.get(`${PACKAGES_URL}${id}/`, { withCredentials: true });
    return data;
  } catch (e) {
    return call_refresh(e, () =>
      axios.get(`${PACKAGES_URL}${id}/`, { withCredentials: true })
    );
  }
};

export const create_package = async (packageData) => {
  try {
    const { data } = await axios.post(PACKAGES_URL, packageData, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.post(PACKAGES_URL, packageData, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const update_package = async (id, packageData) => {
  try {
    const { data } = await axios.put(`${PACKAGES_URL}${id}/`, packageData, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.put(`${PACKAGES_URL}${id}/`, packageData, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const delete_package = async (id) => {
  try {
    await axios.delete(`${PACKAGES_URL}${id}/`, {
      withCredentials: true,
    });
    return true;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.delete(`${PACKAGES_URL}${id}/`, { withCredentials: true })
    );
    return refreshed !== false;
  }
};

export const create_package_wizard = async (wizardData) => {
  try {
    const { data } = await axios.post(PACKAGE_WIZARD_URL, wizardData, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.post(PACKAGE_WIZARD_URL, wizardData, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const get_contract_projects_for_packages = async (contractId) => {
  try {
    const { data } = await axios.get(`${BASE_URL}contracts/${contractId}/projects-for-packages/`, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    return call_refresh(e, () =>
      axios.get(`${BASE_URL}contracts/${contractId}/projects-for-packages/`, { withCredentials: true })
    );
  }
};

export const get_tickets = async (projectId) => {
  try {
    const url = projectId ? `${TICKETS_URL}?project=${projectId}` : TICKETS_URL;
    const { data } = await axios.get(url, { withCredentials: true });
    return data;
  } catch (e) {
    return call_refresh(e, () => {
      const url = projectId ? `${TICKETS_URL}?project=${projectId}` : TICKETS_URL;
      return axios.get(url, { withCredentials: true });
    });
  }
};

export const get_ticket = async (ticketId) => {
  try {
    const { data } = await axios.get(`${TICKETS_URL}${ticketId}/`, { withCredentials: true });
    return data;
  } catch (e) {
    return call_refresh(e, () =>
      axios.get(`${TICKETS_URL}${ticketId}/`, { withCredentials: true })
    );
  }
};

export const create_ticket = async (ticketData) => {
  try {
    const { data } = await axios.post(TICKETS_URL, ticketData, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.post(TICKETS_URL, ticketData, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const update_ticket = async (ticketId, ticketData) => {
  try {
    const { data } = await axios.put(`${TICKETS_URL}${ticketId}/`, ticketData, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.put(`${TICKETS_URL}${ticketId}/`, ticketData, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const delete_ticket = async (ticketId) => {
  try {
    await axios.delete(`${TICKETS_URL}${ticketId}/`, {
      withCredentials: true,
    });
    return true;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.delete(`${TICKETS_URL}${ticketId}/`, { withCredentials: true })
    );
    return refreshed !== false;
  }
};

export const get_users = async () => {
  try {
    const { data } = await axios.get(USERS_URL, { withCredentials: true });
    return data;
  } catch (e) {
    return call_refresh(e, () =>
      axios.get(USERS_URL, { withCredentials: true })
    );
  }
};

export const create_worklog = async (ticketId, worklogData) => {
  try {
    const { data } = await axios.post(`${TICKETS_URL}${ticketId}/worklogs/`, worklogData, {
      withCredentials: true,
    });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.post(`${TICKETS_URL}${ticketId}/worklogs/`, worklogData, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const delete_worklog = async (worklogId) => {
  try {
    await axios.delete(`${BASE_URL}worklogs/${worklogId}/`, {
      withCredentials: true,
    });
    return true;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.delete(`${BASE_URL}worklogs/${worklogId}/`, { withCredentials: true })
    );
    return refreshed !== false;
  }
};

export const get_project_hours_info = async (projectId) => {
  try {
    const { data } = await axios.get(`${PROJECTS_URL}${projectId}/hours-info/`, { 
      withCredentials: true 
    });
    return data;
  } catch (e) {
    return call_refresh(e, () =>
      axios.get(`${PROJECTS_URL}${projectId}/hours-info/`, { withCredentials: true })
    );
  }
};

export const check_package_coverage = async (projectId, workDate) => {
  try {
    const { data } = await axios.get(`${PROJECTS_URL}${projectId}/package-coverage/`, {
      params: { work_date: workDate },
      withCredentials: true
    });
    return data;
  } catch (e) {
    return call_refresh(e, () =>
      axios.get(`${PROJECTS_URL}${projectId}/package-coverage/`, {
        params: { work_date: workDate },
        withCredentials: true
      })
    );
  }
};

export const get_projects_hours_alerts = async (projectIds) => {
  try {
    const { data } = await axios.post(`${BASE_URL}projects/hours-alerts/`, {
      project_ids: projectIds
    }, { withCredentials: true });
    return data;
  } catch (e) {
    const refreshed = await call_refresh(e, () =>
      axios.post(`${BASE_URL}projects/hours-alerts/`, {
        project_ids: projectIds
      }, { withCredentials: true })
    );
    if (refreshed) return refreshed;
    throw e;
  }
};

export const get_project_hours_alert_extended = async (projectId, autoPackageId = null) => {
  try {
    const params = autoPackageId ? `?auto_package_id=${autoPackageId}` : '';
    const { data } = await axios.get(`${PROJECTS_URL}${projectId}/hours-alert-extended/${params}`, {
      withCredentials: true
    });
    return data;
  } catch (e) {
    return call_refresh(e, () => {
      const params = autoPackageId ? `?auto_package_id=${autoPackageId}` : '';
      return axios.get(`${PROJECTS_URL}${projectId}/hours-alert-extended/${params}`, { withCredentials: true });
    });
  }
};