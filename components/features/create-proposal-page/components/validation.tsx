export const validateProposalField = (field: string, value: string): string => {
  let error = "";

  switch (field) {
    case "name":
      if (!value.trim()) {
        error = "Proposal Name cannot be blank or just spaces.";
      } else {
        const wordCount = value.trim().split(/\s+/).length;
        const charCount = value.trim().length;

        if (charCount > 200) {
          error = "Proposal Name cannot exceed 200 characters.";
        } else if (wordCount > 30) {
          error = "Proposal Name cannot exceed 30 words.";
        }
      }
      break;

    case "client_email":
      if (!value.trim()) {
        error = "Client Email cannot be blank.";
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          error = "Please enter a valid email address.";
        }
      }
      break;

    case "client_phone":
      if (!value.trim()) {
        error = "Client Phone cannot be blank.";
      } else {
        const phoneRegex = /^[1-9]\d{9,14}$/;
        if (!phoneRegex.test(value)) {
          error = "Please enter a valid phone number.";
        }
      }
      break;

    case "location":
      if (!value.trim()) {
        error = "Project Location cannot be blank.";
      }
      break;

    case "valid_until":
      if (!value) {
        error = "Please select a valid date.";
      }
      break;

    case "client_name":
      if (!value.trim()) {
        error = "Client Name cannot be blank.";
      }
      break;

    case "client_address":
      if (!value.trim()) {
        error = "Client Address cannot be blank.";
      }
      break;

    default:
      break;
  }

  return error;
};

export const validateAllProposalFields = (formData: {
  name: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  location: string;
  valid_until: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};

  const fields = [
    "name",
    "client_name",
    "client_email",
    "client_phone",
    "client_address",
    "location",
    "valid_until",
  ];

  fields.forEach((field) => {
    const error = validateProposalField(
      field,
      formData[field as keyof typeof formData]
    );
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};
