export function getUser(id: number): { id: number; name: string; email: string } {
    return {
        id,
        name: "John Doe",
        email: "john@example.com",
    };
}

export function deleteUser(id: number): boolean {
    return true;
}
