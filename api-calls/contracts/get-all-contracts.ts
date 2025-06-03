

import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getAllContracts = async (page = 1, pageSize = 10, searchQuery?: string) => {
  const TOKEN = Cookies.get('auth-token');
  let url = `${API_URL}/v1/contracts/list/?page=${page}&page_size=${pageSize}`;
  if (searchQuery) {
    url += `&search=${encodeURIComponent(searchQuery)}`;
  }

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch contracts');
  }

  // Returns the full API response (may include pagination info)
  return res.json();
};
