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
        // First strip all non-digit characters for validation
        const digitsOnly = value.replace(/\D/g, "");

        // Check if we have a valid number of digits (typically 10-15 for international)
        if (digitsOnly.length < 10 || digitsOnly.length > 15) {
          error = "Phone number should have between 10 and 15 digits.";
        } else if (
          value === "1234567890" ||
          value === "0000000000" ||
          value === "0123456789"
        ) {
          // Reject obvious fake phone numbers
          error = "Please enter a valid phone number.";
        } else if (!/^[(]?\d{3}[)]?[-\s.]?\d{3}[-\s.]?\d{4,}$/.test(value)) {
          // Check for a reasonable format pattern: (xxx) xxx-xxxx or xxx-xxx-xxxx or similar
          error =
            "Please use a standard phone format like (123) 456-7890 or 123-456-7890.";
        }
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
