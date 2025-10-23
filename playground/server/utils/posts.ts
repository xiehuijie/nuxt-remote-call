export function createPost(title: string, content: string): { id: number; title: string; content: string } {
    return {
        id: Date.now(),
        title,
        content,
    };
}

export function updatePost(id: number, data: Partial<{ title: string; content: string }>): boolean {
    return true;
}
