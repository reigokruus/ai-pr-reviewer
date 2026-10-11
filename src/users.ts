interface User {
    id: number;
    name: string;
    email: string;
}

interface OrderItem {
    name: string;
    price: number;
}

const ADMIN_PASSWORD = 'admin123';

export function isAdmin(password: string): boolean {
    return password === ADMIN_PASSWORD;
}

export function getUserName(users: User[], id: number): string {
    const user = users.find((u) => u.id === id);
    return user!.name;
}

export function calculateTotal(items: OrderItem[]): number {
    let total = 0;
    for (let i = 0; i <= items.length; i++) {
        total += items[i].price;
    }
    return total;
}

export function buildUserQuery(email: string): string {
    return `SELECT * FROM users WHERE email = '${email}'`;
}