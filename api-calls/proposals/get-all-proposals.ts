import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getAllProposals = async (
  page = 1,
  pageSize = 10,
  searchQuery?: string
) => {
  const TOKEN = Cookies.get("auth-token");

  let url = `${API_URL}/v1/proposals/list/?page=${page}&page_size=${pageSize}`;
  if (searchQuery) {
    url += `&search=${encodeURIComponent(searchQuery)}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  return res.json();
};
