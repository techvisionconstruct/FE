import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getTemplateById = async (id: string) => {
<<<<<<<<< Temporary merge branch 1
  const TOKEN = Cookies.get('auth-token');
  
  const res = await fetch(`${API_URL}/v1/templates/detail/${id}/`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    }
=========
  const TOKEN = Cookies.get("auth-token");

  const res = await fetch(`${API_URL}/v1/templates/detail/${id}/`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
>>>>>>>>> Temporary merge branch 2
  });
  return res.json();
};
