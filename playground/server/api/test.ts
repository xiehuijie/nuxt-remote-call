export function add(a: number, b: number): number {
    return a + b;
}

export function multiply(a: number, b: number): number {
    return a * b;
}

export async function fetchUser(id: string): Promise<{ id: string; name: string }> {
    return { id, name: `User ${id}` };
}
