// Utility to deduplicate formula validation error messages
export function getFormulaValidationMessage(error: string | null): string | null {
  if (!error) return null;
  if (error.includes("Invalid mathematical formula")) {
    return "Formula syntax error: Please check for missing parentheses or invalid operations";
  } else if (error.includes("ends with")) {
    return `Incomplete formula: ${error}`;
  } else if (error.includes("consecutive")) {
    return `Syntax error: ${error}`;
  } else if (error.includes("Missing operator")) {
    return `Missing operator: ${error}`;
  } else if (error.includes("cannot start with")) {
    return `Invalid start: ${error}`;
  } else if (error.includes("Empty parentheses")) {
    return `Invalid syntax: ${error}`;
  } else if (error.includes("Missing closing parenthesis")) {
    return `Missing closing parenthesis`;
  }
  return error;
}
