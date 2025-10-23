export function validateEmail(email: string): boolean {
    return email.includes("@");
}

export function hashPassword(password: string): string {
    return `hashed_${password}`;
}
