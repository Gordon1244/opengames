export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_PATTERN = `(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{${PASSWORD_MIN_LENGTH},}`;

export function passwordRequirementState(password: string) {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
  };
}

export function passwordMeetsPolicy(password: string) {
  return Object.values(passwordRequirementState(password)).every(Boolean);
}
