import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getTemplateById = async (id: string) => {
  const TOKEN = Cookies.get("auth-token");

  const res = await fetch(`${API_URL}/v1/templates/detail/${id}/`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  return res.json();
};
