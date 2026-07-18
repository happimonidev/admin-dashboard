// Mirrors the exact backend password rule (authValidator.changePassword /
// authService.validatePassword) — min 8 chars, upper, lower, number, special char.
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?`~])[A-Za-z\d@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?`~]{8,}$/;

export const PASSWORD_RULE_HINT =
  'At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.';
