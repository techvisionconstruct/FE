import { ProfileUpdateRequest } from "@/types/user-profile/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function updateUserProfile(
  profileId: string,
  profile: ProfileUpdateRequest
) {
  try {
    const TOKEN = Cookies.get("auth-token");
    const payload: Record<string, any> = {};

    // Personal Information
    if (profile.avatar_url !== undefined)
      payload.avatar_url = profile.avatar_url;
    if (profile.bio !== undefined) payload.bio = profile.bio;

    // Contact Information
    if (profile.phone_number !== undefined)
      payload.phone_number = profile.phone_number;
    if (profile.address !== undefined) payload.address = profile.address;
    if (profile.city !== undefined) payload.city = profile.city;
    if (profile.state !== undefined) payload.state = profile.state;
    if (profile.postal_code !== undefined)
      payload.postal_code = profile.postal_code;
    if (profile.country !== undefined) payload.country = profile.country;

    // Signature
    if (profile.signature_image !== undefined)
      payload.signature_image = profile.signature_image;

    // Professional Information
    if (profile.company_name !== undefined)
      payload.company_name = profile.company_name;
    if (profile.job_title !== undefined) payload.job_title = profile.job_title;
    if (profile.industry_id !== undefined)
      payload.industry_id = profile.industry_id;
    if (profile.years_of_experience !== undefined)
      payload.years_of_experience = profile.years_of_experience;

    const response = await fetch(
      `${API_URL}/v1/user-profiles/update/${profileId}/`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || `Failed to update user profile: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}
